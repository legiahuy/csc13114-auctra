import { Request, Response, NextFunction } from 'express';
import { User, Product, Category, Order, Settings } from '../models';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';

export const getDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const { period = 'week' } = req.query;
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const newAuctions = await Product.count({
      where: { createdAt: { [Op.gte]: startDate } },
    });

    const revenue =
      (await Order.sum('finalPrice', {
        where: {
          status: 'completed',
          createdAt: { [Op.gte]: startDate },
        },
      })) || 0;

    const newUsers = await User.count({
      where: { createdAt: { [Op.gte]: startDate } },
    });

    const upgradeRequests = await User.count({
      where: { upgradeRequestStatus: 'pending' },
    });

    const newUpgradeRequests = await User.count({
      where: {
        upgradeRequestDate: { [Op.gte]: startDate },
        upgradeRequestStatus: 'pending',
      },
    });

    const activeProducts = await Product.count({
      where: {
        status: 'active',
        endDate: { [Op.gt]: now },
      },
    });

    const totalUsers = await User.count();
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
      where: { upgradeRequestStatus: 'pending' },
      attributes: { exclude: ['password'] },
      order: [['upgradeRequestDate', 'ASC']],
    });

    res.json({ success: true, data: users });
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
    if (!user) return next(new AppError('User not found', 404));
    if (user.upgradeRequestStatus !== 'pending') {
      return next(new AppError('User upgrade request is not pending', 400));
    }

    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + 7);

    user.role = 'seller';
    user.upgradeRequestStatus = 'approved';
    user.upgradeExpireAt = expireAt;
    await user.save();

    res.json({
      success: true,
      message: 'Upgrade approved successfully (seller for 7 days)',
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
    const { reason } = req.body;

    const user = await User.findByPk(userId);
    if (!user) return next(new AppError('User not found', 404));

    user.upgradeRequestStatus = 'rejected';
    user.upgradeRejectionReason = reason || null;
    user.upgradeExpireAt = undefined;
    await user.save();

    res.json({ success: true, message: 'Upgrade rejected' });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const { page = '1', limit = '20', search, role } = req.query;
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
    if (role) where.role = role;

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

    if (!user) return next(new AppError('User not found', 404));

    res.json({ success: true, data: user });
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
    if (!user) return next(new AppError('User not found', 404));

    if (fullName) user.fullName = fullName;

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) return next(new AppError('Email already exists', 400));
      user.email = email;
    }

    if (role) user.role = role;
    if (address) user.address = address;

    await user.save();

    res.json({ success: true, data: user });
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
    if (!user) return next(new AppError('User not found', 404));

    await user.destroy();

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!['bidder', 'seller', 'admin'].includes(role)) {
      return next(new AppError('Invalid role', 400));
    }

    const user = await User.findByPk(id);
    if (!user) return next(new AppError('User not found', 404));

    user.role = role;

    if (role === 'seller') {
      user.upgradeRequestStatus = undefined;
      user.upgradeRequestDate = undefined;
      user.upgradeExpireAt = undefined;
      user.upgradeRejectionReason = undefined;
    }

    await user.save();

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: { id: user.id, role: user.role },
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
    if (search) where.name = { [Op.iLike]: `%${search}%` };
    if (status) where.status = status;

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

export const testEmail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const { email } = req.body;
    if (!email) return next(new AppError('Email is required', 400));

    const { sendQuestionNotificationEmail } = require('../utils/email.util');

    sendQuestionNotificationEmail(
      email,
      'Sản phẩm test',
      'Đây là câu hỏi test để kiểm tra hệ thống email',
      1,
      'Seller'
    ).catch((err: any) => console.error("Error sending question email:", err));

    res.json({
      success: true,
      message: `Email test đã được gửi đến ${email}. Vui lòng kiểm tra hộp thư.`,
    });
  } catch (error: any) {
    res.json({
      success: false,
      message: `Lỗi khi gửi email: ${error.message}`,
      error: error.message,
    });
  }
};

// =========================
// Auto-extend settings
// =========================

// Public endpoint (seller form can read these values)
export const getAutoExtendSettingsPublic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [thresholdSetting, durationSetting] = await Promise.all([
      Settings.findOrCreate({
        where: { key: 'AUTO_EXTEND_THRESHOLD_MINUTES' },
        defaults: {
          key: 'AUTO_EXTEND_THRESHOLD_MINUTES',
          value: process.env.AUTO_EXTEND_THRESHOLD_MINUTES || '5',
          description: 'Số phút trước khi kết thúc để kích hoạt tự động gia hạn',
        },
      }),
      Settings.findOrCreate({
        where: { key: 'AUTO_EXTEND_DURATION_MINUTES' },
        defaults: {
          key: 'AUTO_EXTEND_DURATION_MINUTES',
          value: process.env.AUTO_EXTEND_DURATION_MINUTES || '10',
          description: 'Số phút gia hạn thêm khi có lượt đấu giá mới',
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        thresholdMinutes: parseInt(thresholdSetting[0].value, 10),
        durationMinutes: parseInt(durationSetting[0].value, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin endpoint (view settings)
export const getAutoExtendSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const [thresholdSetting, durationSetting] = await Promise.all([
      Settings.findOrCreate({
        where: { key: 'AUTO_EXTEND_THRESHOLD_MINUTES' },
        defaults: {
          key: 'AUTO_EXTEND_THRESHOLD_MINUTES',
          value: process.env.AUTO_EXTEND_THRESHOLD_MINUTES || '5',
          description: 'Số phút trước khi kết thúc để kích hoạt tự động gia hạn',
        },
      }),
      Settings.findOrCreate({
        where: { key: 'AUTO_EXTEND_DURATION_MINUTES' },
        defaults: {
          key: 'AUTO_EXTEND_DURATION_MINUTES',
          value: process.env.AUTO_EXTEND_DURATION_MINUTES || '10',
          description: 'Số phút gia hạn thêm khi có lượt đấu giá mới',
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        thresholdMinutes: parseInt(thresholdSetting[0].value, 10),
        durationMinutes: parseInt(durationSetting[0].value, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin endpoint (update settings)
export const updateAutoExtendSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const { thresholdMinutes, durationMinutes } = req.body;

    if (thresholdMinutes === undefined || durationMinutes === undefined) {
      return next(new AppError('thresholdMinutes and durationMinutes are required', 400));
    }

    const thresholdNum = parseInt(String(thresholdMinutes), 10);
    const durationNum = parseInt(String(durationMinutes), 10);

    if (Number.isNaN(thresholdNum) || thresholdNum < 1) {
      return next(new AppError('thresholdMinutes must be a positive number', 400));
    }

    if (Number.isNaN(durationNum) || durationNum < 1) {
      return next(new AppError('durationMinutes must be a positive number', 400));
    }

    await Promise.all([
      Settings.upsert({
        key: 'AUTO_EXTEND_THRESHOLD_MINUTES',
        value: thresholdNum.toString(),
        description: 'Số phút trước khi kết thúc để kích hoạt tự động gia hạn',
      }),
      Settings.upsert({
        key: 'AUTO_EXTEND_DURATION_MINUTES',
        value: durationNum.toString(),
        description: 'Số phút gia hạn thêm khi có lượt đấu giá mới',
      }),
    ]);

    res.json({
      success: true,
      message: 'Cấu hình tự động gia hạn đã được cập nhật',
      data: {
        thresholdMinutes: thresholdNum,
        durationMinutes: durationNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =========================
// Chart endpoints (Admin)
// =========================

export const getRevenueChart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const { period = 'week' } = req.query;
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const orders = await Order.findAll({
      where: {
        status: 'completed',
        createdAt: { [Op.gte]: startDate },
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('finalPrice')), 'revenue'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true,
    });

    res.json({
      success: true,
      data: orders.map((o: any) => ({
        date: o.date,
        revenue: parseFloat(o.revenue || 0),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getAuctionsChart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const { period = 'week' } = req.query;
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const products = await Product.findAll({
      where: { createdAt: { [Op.gte]: startDate } },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true,
    });

    res.json({
      success: true,
      data: products.map((p: any) => ({
        date: p.date,
        count: parseInt(p.count || 0, 10),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getUserDistribution = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const distribution = await User.findAll({
      attributes: ['role', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['role'],
      raw: true,
    });

    res.json({
      success: true,
      data: distribution.map((d: any) => ({
        role: d.role,
        count: parseInt(d.count || 0, 10),
      })),
    });
  } catch (error) {
    next(error);
  }
};

// =========================
// User details (Admin)
// =========================

export const getUserDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) return next(new AppError('User not found', 404));

    const products = await Product.findAll({
      where: { sellerId: id },
      include: [{ model: Category, as: 'category', attributes: ['name'] }],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    // NOTE: require Bid from models (as your project currently does)
    const { Bid } = require('../models');

    const allBids = await Bid.findAll({
      where: { bidderId: id },
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'status', 'currentPrice'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const seenProducts = new Set<number>();
    const bids = allBids
      .filter((b: any) => {
        if (!b.product || seenProducts.has(b.product.id)) return false;
        seenProducts.add(b.product.id);
        return true;
      })
      .slice(0, 10);

    const orders = await Order.findAll({
      where: {
        [Op.or]: [{ buyerId: id }, { sellerId: id }],
      },
      include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    res.json({
      success: true,
      data: {
        user,
        products,
        bids,
        orders,
      },
    });
  } catch (error) {
    next(error);
  }
};
// Generate random password
const generateRandomPassword = (length = 10): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const resetUserPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) return next(new AppError('User not found', 404));

    if (user.role === 'admin') {
      return next(new AppError('Cannot reset password for another admin', 403));
    }

    // Generate new random password
    const newPassword = generateRandomPassword(12);

    // Update user password (model hook will handle hashing)
    user.password = newPassword;
    await user.save();

    // Send email to user (safely require to avoid circular dependency issues if any)
    const { sendAdminPasswordResetEmail } = require('../utils/email.util');
    await sendAdminPasswordResetEmail(user.email, newPassword);

    res.json({
      success: true,
      message: 'Password reset successfully. Email sent to user.',
    });
  } catch (error) {
    next(error);
  }
};
