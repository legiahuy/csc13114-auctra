import { Request, Response, NextFunction } from 'express';
import { User, Product, Category, Order } from '../models';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';

export const getDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // New auctions
    const newAuctions = await Product.count({
      where: {
        createdAt: { [Op.gte]: last30Days },
      },
    });

    // Revenue (from completed orders)
    const revenue = await Order.sum('finalPrice', {
      where: {
        status: 'completed',
        createdAt: { [Op.gte]: last30Days },
      },
    }) || 0;

    // New users
    const newUsers = await User.count({
      where: {
        createdAt: { [Op.gte]: last30Days },
      },
    });

    // Upgrade requests
    const upgradeRequests = await User.count({
      where: {
        upgradeRequestStatus: 'pending',
      },
    });

    // New upgrade requests (last 7 days)
    const newUpgradeRequests = await User.count({
      where: {
        upgradeRequestDate: { [Op.gte]: last7Days },
        upgradeRequestStatus: 'pending',
      },
    });

    // Active products
    const activeProducts = await Product.count({
      where: {
        status: 'active',
        endDate: { [Op.gt]: now },
      },
    });

    // Total users
    const totalUsers = await User.count();

    // Total products
    const totalProducts = await Product.count();

    res.json({
      success: true,
      data: {
        newAuctions,
        revenue: parseFloat(revenue.toString()),
        newUsers,
        upgradeRequests,
        newUpgradeRequests,
        activeProducts,
        totalUsers,
        totalProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUpgradeRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const users = await User.findAll({
      where: {
        upgradeRequestStatus: 'pending',
      },
      attributes: { exclude: ['password'] },
      order: [['upgradeRequestDate', 'ASC']],
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const approveUpgrade = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.upgradeRequestStatus !== 'pending') {
      return next(new AppError('User upgrade request is not pending', 400));
    }

    user.role = 'seller';
    user.upgradeRequestStatus = 'approved';
    await user.save();

    res.json({
      success: true,
      message: 'Upgrade approved successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectUpgrade = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    user.upgradeRequestStatus = 'rejected';
    await user.save();

    res.json({
      success: true,
      message: 'Upgrade rejected',
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const { page = '1', limit = '20', search } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { fullName: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        users: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages: Math.ceil(count / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const { id } = req.params;
    const { fullName, email, role, address } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (fullName) user.fullName = fullName;
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return next(new AppError('Email already exists', 400));
      }
      user.email = email;
    }
    if (role) user.role = role;
    if (address) user.address = address;

    await user.save();

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const { id } = req.params;

    if (id === req.user.id.toString()) {
      return next(new AppError('Cannot delete your own account', 400));
    }

    const user = await User.findByPk(id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getAllProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const { page = '1', limit = '20', search, status } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }
    if (status) {
      where.status = status;
    }

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'seller', attributes: ['id', 'fullName', 'email'] },
      ],
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        products: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages: Math.ceil(count / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

