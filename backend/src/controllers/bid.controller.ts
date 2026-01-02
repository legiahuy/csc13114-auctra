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
    const minBidAmount =
      parseFloat(product.currentPrice.toString()) + parseFloat(product.bidStep.toString());

    if (!isAutoBid && parseFloat(amount) < minBidAmount) {
      return next(
        new AppError(`Minimum bid amount is ${minBidAmount.toLocaleString('vi-VN')} VNĐ`, 400)
      );
    }

    if (isAutoBid && maxAmount && parseFloat(maxAmount) < minBidAmount) {
      return next(
        new AppError(
          `Maximum bid amount must be at least ${minBidAmount.toLocaleString('vi-VN')} VNĐ`,
          400
        )
      );
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
        order: [['maxAmount', 'DESC'], ['createdAt', 'ASC']], // First-come-first-served for equal max bids
      });

      if (highestAutoBid) {
        const highestMaxAmount = parseFloat(highestAutoBid.maxAmount!.toString());
        if (parseFloat(maxAmount) > highestMaxAmount) {
          finalAmount = Math.min(
            parseFloat(maxAmount),
            highestMaxAmount + parseFloat(product.bidStep.toString())
          );
          previousHighestBidder = (highestAutoBid as any).bidder;
        } else {
          finalAmount = Math.min(
            parseFloat(maxAmount),
            parseFloat(product.currentPrice.toString()) + parseFloat(product.bidStep.toString())
          );
        }
      } else {
        finalAmount =
          parseFloat(product.currentPrice.toString()) + parseFloat(product.bidStep.toString());
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
        previousHighestBidder = (previousBid as any).bidder;
      }
    }

    // Send notifications
    // Signature: (email, productName, amount, isOutbid, productId)
    await sendBidNotificationEmail(req.user.email, product.name, finalAmount, false, productId);

    if (previousHighestBidder) {
      await sendBidNotificationEmail(
        previousHighestBidder.email,
        product.name,
        finalAmount,
        true,
        productId
      );
    }

    await sendBidNotificationEmail(product.seller.email, product.name, finalAmount, false, productId);

    res.status(201).json({
      success: true,
      data: bid,
    });
  } catch (error) {
    next(error);
  }
};

export const getBidHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;

    // Check if user is seller
    let isSeller = false;
    if (req.user) {
      const product = await Product.findByPk(productId);
      if (product && product.sellerId === req.user.id) {
        isSeller = true;
      }
    }

    // If seller, show all bids (including rejected), otherwise only non-rejected
    const whereClause: any = { productId };
    if (!isSeller) {
      whereClause.isRejected = false;
    }

    const bids = await Bid.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'bidder',
          attributes: ['id', 'fullName'],
        },
      ],
      order: [['amount', 'DESC'], ['createdAt', 'DESC']],
    });

    // Mask bidder names for non-sellers, show full names for seller
    const processedBids = bids.map((bid) => {
      const bidData = bid.toJSON() as any;
      if (isSeller) {
        // Seller sees full names and rejected status
        return {
          ...bidData,
          bidder: {
            ...bidData.bidder,
            fullName: bidData.bidder?.fullName || 'Unknown',
          },
        };
      } else {
        // Others see masked names
        const fullName = bidData.bidder?.fullName || 'Unknown';
        const maskedName = fullName.length > 4 ? '****' + fullName.slice(-4) : '****' + fullName;
        return {
          ...bidData,
          bidder: {
            ...bidData.bidder,
            fullName: maskedName,
          },
        };
      }
    });

    res.json({
      success: true,
      data: processedBids,
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
    }) as any; // Type assertion to access associations

    if (!bid) {
      return next(new AppError('Bid not found', 404));
    }

    if (bid.product.sellerId !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    bid.isRejected = true;
    await bid.save();

    // If this was the highest bid, find the next highest
    // Check if the rejected bid amount matches current price (meaning it was the highest)
    if (parseFloat(bid.product.currentPrice.toString()) === parseFloat(bid.amount.toString())) {
      // This was the highest bid, find the next highest non-rejected bid
      const nextHighestBid = await Bid.findOne({
        where: {
          productId: bid.productId,
          isRejected: false,
          id: { [Op.ne]: bidId },
        },
        order: [['amount', 'DESC'], ['createdAt', 'ASC']],
      });

      if (nextHighestBid) {
        // Update to the next highest bid amount
        bid.product.currentPrice = nextHighestBid.amount;
        await bid.product.save();
      } else {
        // No other bids, reset to starting price
        bid.product.currentPrice = bid.product.startingPrice;
        await bid.product.save();
      }
    }

    // Send notification
    await sendBidRejectedEmail(bid.bidder.email, bid.product.name, bid.productId);

    res.json({
      success: true,
      message: 'Bid rejected successfully',
    });
  } catch (error) {
    next(error);
  }
};

