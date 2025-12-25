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

    // Always fetch the latest user data from database to get current role
    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if seller privileges have expired
    if (user.role === 'seller' && user.upgradeExpireAt && user.upgradeExpireAt < new Date()) {
      // Expired: downgrade to bidder
      user.role = 'bidder';
      user.upgradeExpireAt = undefined;
      user.upgradeRequestStatus = undefined;
      await user.save();
    }

    // Set req.user with the current role from database (not from JWT)
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role, // Use role from database, not from JWT
    };
    
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

      // req.user.role is already synced with database by authenticate middleware
      if (!roles.includes(req.user.role)) {
        return next(new AppError('Access denied', 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

