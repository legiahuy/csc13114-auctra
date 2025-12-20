import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { User } from '../models';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { id: number; email: string; role: string };

    // Kiểm tra và tự động hạ quyền nếu seller hết hạn
    if (decoded.role === 'seller') {
      const user = await User.findByPk(decoded.id);
      if (user && user.upgradeExpireAt && user.upgradeExpireAt < new Date()) {
        // Hết hạn: hạ quyền về bidder
        user.role = 'bidder';
        user.upgradeExpireAt = undefined;
        user.upgradeRequestStatus = undefined;
        await user.save();
        // Cập nhật role trong decoded để phản ánh thay đổi
        decoded.role = 'bidder';
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError('Authentication required', 401));
      }

      // Nếu yêu cầu role seller, kiểm tra thời hạn upgrade
      if (roles.includes('seller')) {
        const user = await User.findByPk(req.user.id);
        if (!user) return next(new AppError('User not found', 404));

        if (user.role !== 'seller') {
          return next(new AppError('Access denied', 403));
        }

        if (user.upgradeExpireAt && user.upgradeExpireAt < new Date()) {
          // Hết hạn: hạ quyền về bidder
          user.role = 'bidder';
          user.upgradeExpireAt = undefined;
          user.upgradeRequestStatus = undefined;
          await user.save();
          return next(new AppError('Tài khoản seller của bạn đã hết thời hạn. Vui lòng yêu cầu nâng cấp lại.', 403));
        }
      }

      if (!roles.includes(req.user.role)) {
        return next(new AppError('Access denied', 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

