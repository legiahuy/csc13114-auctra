import { Request, Response, NextFunction } from 'express';
import { Bid, Product, User, Settings } from '../models';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendBidNotificationEmail, sendBidRejectedEmail } from '../utils/email.util';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';

export const placeBid = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { productId, amount, maxAmount, isAutoBid } = req.body;

    const product = await Product.findByPk(productId, {
      include: [{ model: User, as: 'seller' }],
    });

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    if (product.status !== 'active') {
      return next(new AppError('Product is not active', 400));
    }

    if (new Date() >= product.endDate) {
      return next(new AppError('Auction has ended', 400));
    }

    // Check bidder rating
    const bidder = await User.findByPk(req.user.id);
    if (!bidder) {
      return next(new AppError('User not found', 404));
    }

    // Seller can block bidders without any rating history
    if (!product.allowUnratedBidders && bidder.totalRatings === 0) {
      return next(new AppError('Seller does not allow unrated bidders for this product', 403));
    }

    const ratingPercentage = bidder.getRatingPercentage();
    if (bidder.totalRatings > 0 && ratingPercentage < 80) {
      return next(new AppError('Your rating is below 80%. You cannot place bids.', 403));
    }

    // Check if bidder is rejected
    const existingRejectedBid = await Bid.findOne({
      where: {
        productId,
        bidderId: req.user.id,
        isRejected: true,
      },
    });

    if (existingRejectedBid) {
      return next(new AppError('You have been rejected from bidding on this product', 403));
    }

    // Validate bid amount
    const minBidAmount = parseFloat(product.currentPrice.toString()) + parseFloat(product.bidStep.toString());
    if (!isAutoBid && parseFloat(amount) < minBidAmount) {
      return next(new AppError(`Minimum bid amount is ${minBidAmount.toLocaleString('vi-VN')} VNĐ`, 400));
    }

    if (isAutoBid && maxAmount && parseFloat(maxAmount) < minBidAmount) {
      return next(new AppError(`Maximum bid amount must be at least ${minBidAmount.toLocaleString('vi-VN')} VNĐ`, 400));
    }

    // Check auto-extend
    const now = new Date();
    const timeUntilEnd = product.endDate.getTime() - now.getTime();
    
    // Get settings from database, fallback to environment variables
    const [thresholdSetting, durationSetting] = await Promise.all([
      Settings.findOne({ where: { key: 'AUTO_EXTEND_THRESHOLD_MINUTES' } }),
      Settings.findOne({ where: { key: 'AUTO_EXTEND_DURATION_MINUTES' } }),
    ]);
    
    const thresholdMinutes = thresholdSetting
      ? parseInt(thresholdSetting.value)
      : parseInt(process.env.AUTO_EXTEND_THRESHOLD_MINUTES || '5');
    const extendMinutes = durationSetting
      ? parseInt(durationSetting.value)
      : parseInt(process.env.AUTO_EXTEND_DURATION_MINUTES || '10');

    if (product.autoExtend && timeUntilEnd <= thresholdMinutes * 60 * 1000) {
      product.endDate = new Date(now.getTime() + extendMinutes * 60 * 1000);
      await product.save();
    }

    // Process auto-bidding or regular bid
    let finalAmount = parseFloat(amount);
    let previousHighestBidder: User | null = null;

    if (isAutoBid && maxAmount) {
      // Auto-bidding logic
      const highestAutoBid = await Bid.findOne({
        where: {
          productId,
          isAutoBid: true,
          isRejected: false,
        },
        include: [{ model: User, as: 'bidder' }],
        order: [['maxAmount', 'DESC']],
      });

      if (highestAutoBid) {
        const highestMaxAmount = parseFloat(highestAutoBid.maxAmount!.toString());
        if (parseFloat(maxAmount) > highestMaxAmount) {
          finalAmount = Math.min(
            parseFloat(maxAmount),
            highestMaxAmount + parseFloat(product.bidStep.toString())
          );
          previousHighestBidder = highestAutoBid.bidder;
        } else {
          finalAmount = Math.min(
            parseFloat(maxAmount),
            parseFloat(product.currentPrice.toString()) + parseFloat(product.bidStep.toString())
          );
        }
      } else {
        finalAmount = parseFloat(product.currentPrice.toString()) + parseFloat(product.bidStep.toString());
      }
    }

    // Create bid
    const bid = await Bid.create({
      productId,
      bidderId: req.user.id,
      amount: finalAmount,
      maxAmount: isAutoBid ? maxAmount : undefined,
      isAutoBid: isAutoBid || false,
    });

    // Update product
    product.currentPrice = finalAmount;
    product.bidCount += 1;
    await product.save();

    // Get previous highest bidder
    if (!previousHighestBidder) {
      const previousBid = await Bid.findOne({
        where: {
          productId,
          bidderId: { [Op.ne]: req.user.id },
          isRejected: false,
        },
        include: [{ model: User, as: 'bidder' }],
        order: [['amount', 'DESC']],
      });
      if (previousBid) {
        previousHighestBidder = previousBid.bidder;
      }
    }

    // Send notifications
    await sendBidNotificationEmail(
      req.user.email,
      product.name,
      finalAmount,
      false
    );

    if (previousHighestBidder) {
      await sendBidNotificationEmail(
        previousHighestBidder.email,
        product.name,
        finalAmount,
        true
      );
    }

    await sendBidNotificationEmail(
      product.seller.email,
      product.name,
      finalAmount,
      false
    );

    res.status(201).json({
      success: true,
      data: bid,
    });
  } catch (error) {
    next(error);
  }
};

export const getBidHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;

    const bids = await Bid.findAll({
      where: {
        productId,
        isRejected: false,
      },
      include: [
        {
          model: User,
          as: 'bidder',
          attributes: ['id', 'fullName'],
        },
      ],
      order: [['amount', 'DESC'], ['createdAt', 'DESC']],
    });

    // Mask bidder names
    const maskedBids = bids.map((bid) => {
      const fullName = bid.bidder.fullName;
      const maskedName = fullName.length > 4
        ? '****' + fullName.slice(-4)
        : '****' + fullName;
      return {
        ...bid.toJSON(),
        bidder: {
          ...bid.bidder.toJSON(),
          fullName: maskedName,
        },
      };
    });

    res.json({
      success: true,
      data: maskedBids,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectBid = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { bidId } = req.params;

    const bid = await Bid.findByPk(bidId, {
      include: [
        { model: Product, as: 'product' },
        { model: User, as: 'bidder' },
      ],
    });

    if (!bid) {
      return next(new AppError('Bid not found', 404));
    }

    if (bid.product.sellerId !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    bid.isRejected = true;
    await bid.save();

    // If this was the highest bid, find the next highest
    if (parseFloat(bid.product.currentPrice.toString()) === parseFloat(bid.amount.toString())) {
      const nextHighestBid = await Bid.findOne({
        where: {
          productId: bid.productId,
          isRejected: false,
          id: { [Op.ne]: bidId },
        },
        order: [['amount', 'DESC']],
      });

      if (nextHighestBid) {
        bid.product.currentPrice = nextHighestBid.amount;
        await bid.product.save();
      } else {
        bid.product.currentPrice = bid.product.startingPrice;
        await bid.product.save();
      }
    }

    // Send notification
    await sendBidRejectedEmail(bid.bidder.email, bid.product.name);

    res.json({
      success: true,
      message: 'Bid rejected successfully',
    });
  } catch (error) {
    next(error);
  }
};

