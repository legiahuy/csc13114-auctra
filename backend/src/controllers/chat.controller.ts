import { Request, Response, NextFunction } from 'express';
import { ChatMessage, Order, User } from '../models';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { Server } from 'socket.io';
import { Op } from 'sequelize';

export const getMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { orderId } = req.params;

    const order = await Order.findByPk(orderId);
    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    if (order.sellerId !== req.user.id && order.buyerId !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    const messages = await ChatMessage.findAll({
      where: { orderId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'fullName'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    // Mark messages as read
    await ChatMessage.update(
      { isRead: true },
      {
        where: {
          orderId,
          senderId: { [Op.ne]: req.user.id },
          isRead: false,
        },
      }
    );

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { orderId } = req.params;
    const { message } = req.body;

    const order = await Order.findByPk(orderId);
    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    if (order.sellerId !== req.user.id && order.buyerId !== req.user.id) {
      return next(new AppError('Not authorized', 403));
    }

    const chatMessage = await ChatMessage.create({
      orderId: parseInt(orderId),
      senderId: req.user.id,
      message,
    });

    // Emit via Socket.IO
    const io: Server = req.app.get('io');
    io.to(`order-${orderId}`).emit('new-message', {
      ...chatMessage.toJSON(),
      sender: {
        id: req.user.id,
        fullName: req.user.fullName || 'User',
      },
    });

    res.status(201).json({
      success: true,
      data: chatMessage,
    });
  } catch (error) {
    next(error);
  }
};

