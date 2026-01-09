import { Request, Response, NextFunction } from 'express';
import { Order, Product, Bid, Category, User, Review } from '../models';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendAuctionEndedEmail } from '../utils/email.util';
import { Op } from 'sequelize';
import { Server } from 'socket.io';

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
        product.id,
        false,
        parseFloat(winningBid.amount.toString()),
        true, // isSeller
        order.id
      );

      await sendAuctionEndedEmail(
        winningBid.bidder.email,
        product.name,
        product.id,
        true,
        parseFloat(winningBid.amount.toString()),
        false, // isSeller
        order.id
      );
    } else {
      // No winner
      await sendAuctionEndedEmail(
        product.seller.email,
        product.name,
        product.id,
        false,
        undefined,
        true // isSeller
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
        {
          model: Review,
          as: 'reviews',
          include: [
            { model: User, as: 'reviewer', attributes: ['id', 'fullName'] },
          ],
        },
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
    if (status === 'pending_payment' && order.buyerId !== req.user.id) {
      return next(new AppError('Only buyer can reset order steps', 403));
    }

    if (status === 'pending_address' && order.buyerId !== req.user.id) {
      return next(new AppError('Only buyer can update shipping address', 403));
    }

    // Chỉ seller mới có thể chuyển từ pending_address → pending_shipping (xác nhận đã gửi hàng)
    if (status === 'pending_shipping') {
      if (order.status !== 'pending_address') {
        return next(new AppError('Chỉ có thể xác nhận gửi hàng khi đơn hàng đang ở trạng thái chờ địa chỉ', 400));
      }
      if (order.sellerId !== req.user.id) {
        return next(new AppError('Chỉ người bán mới có thể xác nhận đã gửi hàng', 403));
      }
      // Kiểm tra đã có địa chỉ giao hàng chưa
      if (!order.shippingAddress && !shippingAddress) {
        return next(new AppError('Chưa có địa chỉ giao hàng. Vui lòng chờ người mua gửi địa chỉ', 400));
      }
    }

    // Bidder xác nhận đã nhận hàng, chuyển từ pending_shipping → completed
    if (status === 'completed') {
      if (order.status !== 'pending_shipping') {
        return next(new AppError('Chỉ có thể xác nhận nhận hàng khi đơn hàng đang ở trạng thái đã gửi hàng', 400));
      }
      if (order.buyerId !== req.user.id) {
        return next(new AppError('Chỉ người mua mới có thể xác nhận đã nhận hàng', 403));
      }
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

    // Cho phép lưu draft (không thay đổi status) nếu không có status trong request
    // Hoặc nếu có status thì cập nhật status
    if (status) {
      order.status = status;
    }

    // Luôn cho phép cập nhật các field thông tin, kể cả khi không thay đổi status
    // Điều này cho phép auto-save draft
    if (paymentMethod !== undefined) order.paymentMethod = paymentMethod;
    if (paymentTransactionId !== undefined) order.paymentTransactionId = paymentTransactionId;
    if (paymentProof !== undefined) order.paymentProof = paymentProof;
    if (shippingAddress !== undefined) order.shippingAddress = shippingAddress;
    if (shippingInvoice !== undefined) order.shippingInvoice = shippingInvoice;

    await order.save();

    // Emit socket event để thông báo order đã được cập nhật
    const io: Server = req.app.get('io');
    const updatedOrder = await Order.findByPk(orderId, {
      include: [
        {
          model: Product,
          as: 'product',
          include: [{ model: Category, as: 'category' }],
        },
        { model: User, as: 'seller', attributes: ['id', 'fullName', 'email'] },
        { model: User, as: 'buyer', attributes: ['id', 'fullName', 'email'] },
      ],
    });

    if (updatedOrder) {
      io.to(`order-${orderId}`).emit('order-updated', updatedOrder.toJSON());
      // Emit cho seller và buyer để cập nhật orders list
      io.to(`user-${order.sellerId}`).emit('order-list-updated');
      io.to(`user-${order.buyerId}`).emit('order-list-updated');
    }

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

