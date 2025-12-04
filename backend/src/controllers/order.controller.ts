import { Request, Response, NextFunction } from 'express';
import { Order, Product, Bid, Category, User, Review } from '../models';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendAuctionEndedEmail } from '../utils/email.util';
import { Op } from 'sequelize';

// This should be called by a cron job or scheduled task when auction ends
export const processEndedAuctions = async () => {
  const now = new Date();
  const endedProducts = await Product.findAll({
    where: {
      status: 'active',
      endDate: { [Op.lte]: now },
    },
    include: [
      { model: User, as: 'seller' },
      {
        model: Bid,
        as: 'bids',
        where: { isRejected: false },
        required: false,
        include: [
          {
            model: User,
            as: 'bidder',
          },
        ],
        order: [['amount', 'DESC']],
        limit: 1,
      },
    ],
  });

  for (const product of endedProducts) {
    product.status = 'ended';

    if (product.bids && product.bids.length > 0) {
      const winningBid = product.bids[0];
      const order = await Order.create({
        productId: product.id,
        sellerId: product.sellerId,
        buyerId: winningBid.bidderId,
        finalPrice: winningBid.amount,
        status: 'pending_payment',
      });

      // Send emails
      await sendAuctionEndedEmail(
        product.seller.email,
        product.name,
        false,
        undefined
      );

      await sendAuctionEndedEmail(
        winningBid.bidder.email,
        product.name,
        true,
        parseFloat(winningBid.amount.toString())
      );
    } else {
      // No winner
      await sendAuctionEndedEmail(
        product.seller.email,
        product.name,
        false,
        undefined
      );
    }

    await product.save();
  }
};

export const getOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { orderId } = req.params;

    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            { model: Category, as: 'category' },
            { model: User, as: 'seller', attributes: ['id', 'fullName', 'email'] },
          ],
        },
        { model: User, as: 'seller', attributes: ['id', 'fullName', 'email'] },
        { model: User, as: 'buyer', attributes: ['id', 'fullName', 'email'] },
      ],
    });

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    if (order.sellerId !== req.user.id && order.buyerId !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { orderId } = req.params;
    const { status, paymentMethod, paymentTransactionId, paymentProof, shippingAddress, shippingInvoice } = req.body;

    const order = await Order.findByPk(orderId);
    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    // Authorization checks
    if (status === 'pending_address' && order.buyerId !== req.user.id) {
      return next(new AppError('Only buyer can update shipping address', 403));
    }

    if (status === 'pending_shipping' && order.sellerId !== req.user.id) {
      return next(new AppError('Only seller can confirm payment and shipping', 403));
    }

    if (status === 'pending_delivery' && order.buyerId !== req.user.id) {
      return next(new AppError('Only buyer can confirm delivery', 403));
    }

    if (status === 'cancelled') {
      if (order.sellerId !== req.user.id && req.user.role !== 'admin') {
        return next(new AppError('Only seller can cancel order', 403));
      }

      // Auto-rate buyer -1
      const existingReview = await Review.findOne({
        where: {
          reviewerId: order.sellerId,
          orderId: order.id,
        },
      });

      if (!existingReview) {
        await Review.create({
          reviewerId: order.sellerId,
          revieweeId: order.buyerId,
          orderId: order.id,
          rating: -1,
          comment: 'Người thắng không thanh toán',
        });

        // Update buyer rating
        const buyer = await User.findByPk(order.buyerId);
        if (buyer) {
          buyer.totalRatings += 1;
          await buyer.save();
        }
      }
    }

    if (status) order.status = status;
    if (paymentMethod) order.paymentMethod = paymentMethod;
    if (paymentTransactionId) order.paymentTransactionId = paymentTransactionId;
    if (paymentProof) order.paymentProof = paymentProof;
    if (shippingAddress) order.shippingAddress = shippingAddress;
    if (shippingInvoice) order.shippingInvoice = shippingInvoice;

    await order.save();

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const orders = await Order.findAll({
      where: {
        [Op.or]: [
          { sellerId: req.user.id },
          { buyerId: req.user.id },
        ],
      },
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            { model: Category, as: 'category' },
          ],
        },
        { model: User, as: 'seller', attributes: ['id', 'fullName'] },
        { model: User, as: 'buyer', attributes: ['id', 'fullName'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

