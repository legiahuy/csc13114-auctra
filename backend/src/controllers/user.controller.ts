import { Request, Response, NextFunction } from 'express';
import { User, Product, Category, Bid, Watchlist, Question, Review, Order } from '../models';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendQuestionNotificationEmail, sendAnswerNotificationEmail } from '../utils/email.util';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';

// Thời gian chờ giữa các lần yêu cầu upgrade (ngày) - có thể chỉnh để test
const UPGRADE_REQUEST_COOLDOWN_DAYS = 7;

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const user = await User.findByPk(req.user.id, {
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

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { fullName, email, dateOfBirth, address } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return next(new AppError('Email already exists', 400));
      }
      user.email = email;
      user.isEmailVerified = false; // Require re-verification
    }

    if (fullName) user.fullName = fullName;
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
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

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { oldPassword, newPassword } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const isPasswordValid = await user.comparePassword(oldPassword);
    if (!isPasswordValid) {
      return next(new AppError('Invalid old password', 400));
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getWatchlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const watchlist = await Watchlist.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            { model: User, as: 'seller', attributes: ['id', 'fullName', 'rating', 'totalRatings'] },
            { model: Category, as: 'category' },
          ],
        },
      ],
    });

    res.json({
      success: true,
      data: watchlist,
    });
  } catch (error) {
    next(error);
  }
};

export const addToWatchlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { productId } = req.body;

    const product = await Product.findByPk(productId);
    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    const [watchlist, created] = await Watchlist.findOrCreate({
      where: {
        userId: req.user.id,
        productId,
      },
    });

    if (!created) {
      return next(new AppError('Product already in watchlist', 400));
    }

    res.status(201).json({
      success: true,
      data: watchlist,
    });
  } catch (error) {
    next(error);
  }
};

export const removeFromWatchlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { productId } = req.params;

    const watchlist = await Watchlist.findOne({
      where: {
        userId: req.user.id,
        productId,
      },
    });

    if (!watchlist) {
      return next(new AppError('Product not in watchlist', 404));
    }

    await watchlist.destroy();

    res.json({
      success: true,
      message: 'Removed from watchlist',
    });
  } catch (error) {
    next(error);
  }
};

export const getMyBids = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { page = '1', limit = '12', search, status } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // We want ONE bid entry per product (the latest one).
    // Strategy:
    // 1. Find distinct product IDs bid on by this user, matching filters.
    // 2. For each product, get the ID of the LATEST bid.
    // 3. Paginate based on this list of IDs.
    // 4. Fetch full details for these IDs.

    let productFilterClause = '';
    const replacements: any = { bidderId: req.user.id };

    if (status) {
      productFilterClause += ` AND "products"."status" = :status`;
      replacements.status = status;
    }
    if (search) {
      productFilterClause += ` AND "products"."name" ILIKE :search`;
      replacements.search = `%${search}%`;
    }

    // Query to get the Latest Bid ID for each product
    const idQuery = `
      SELECT MAX("bids"."id") as "id"
      FROM "bids"
      JOIN "products" ON "bids"."productId" = "products"."id"
      WHERE "bids"."bidderId" = :bidderId
      ${productFilterClause}
      GROUP BY "bids"."productId"
      ORDER BY MAX("bids"."createdAt") DESC
      LIMIT :limit OFFSET :offset
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT "bids"."productId") as "count"
      FROM "bids"
      JOIN "products" ON "bids"."productId" = "products"."id"
      WHERE "bids"."bidderId" = :bidderId
      ${productFilterClause}
    `;

    replacements.limit = limitNum;
    replacements.offset = offset;

    const [idResults] = await sequelize.query(idQuery, { replacements });
    const [countResults] = await sequelize.query(countQuery, { replacements });

    const bidIds = idResults.map((r: any) => r.id);
    const count = parseInt((countResults[0] as any).count);

    // Fetch full bid objects
    const bids = await Bid.findAll({
      where: { id: { [Op.in]: bidIds } },
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            { model: Category, as: 'category' },
            { model: User, as: 'seller', attributes: ['id', 'fullName'] },
            // Fetch highest bid to determine if user is winning
            {
              model: Bid,
              as: 'bids',
              where: { isRejected: false },
              attributes: ['bidderId'],
              limit: 1,
              order: [['maxAmount', 'DESC'], ['createdAt', 'ASC']],
              separate: true // Run separate query to support limit per product
            }
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Add isHighestBidder flag
    const bidsWithStatus = bids.map((bid: any) => {
      const bidJson = bid.toJSON();
      const highestBid = bidJson.product.bids ? bidJson.product.bids[0] : null;
      
      // Calculate status based on strict highest bidder logic
      bidJson.isHighestBidder = highestBid?.bidderId === req.user!.id;
      
      // Clean up the extra bids array from the response
      if (bidJson.product.bids) {
        delete bidJson.product.bids;
      }
      
      return bidJson;
    });

    res.json({
      success: true,
      data: {
        bids: bidsWithStatus,
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

export const getWonProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const orders = await Order.findAll({
      where: { buyerId: req.user.id },
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            { model: Category, as: 'category' },
            { model: User, as: 'seller', attributes: ['id', 'fullName'] },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Nếu vì lý do nào đó có nhiều order cho cùng một product (do seed nhiều lần,
    // test dữ liệu, hoặc chạy lại xử lý phiên đấu giá), chỉ giữ lại order mới nhất
    // cho mỗi product để tránh hiển thị "trùng" trên UI.
    const latestOrdersByProduct = new Map<number, Order>();
    for (const order of orders) {
      const pid = order.productId;
      const existing = latestOrdersByProduct.get(pid);
      if (!existing || (order.createdAt && existing.createdAt && order.createdAt > existing.createdAt)) {
        latestOrdersByProduct.set(pid, order);
      }
    }

    const uniqueOrders = Array.from(latestOrdersByProduct.values());

    res.json({
      success: true,
      data: uniqueOrders,
    });
  } catch (error) {
    next(error);
  }
};

export const getReviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const reviews = await Review.findAll({
      where: { revieweeId: req.user.id },
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'fullName'],
        },
        {
          model: Order,
          as: 'order',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

export const askQuestion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { productId, question, parentId } = req.body;

    const product = await Product.findByPk(productId, {
      include: [{ model: User, as: 'seller' }],
    });

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    const questionRecord = await Question.create({
      productId,
      userId: req.user.id,
      question,
      parentId: parentId || null,
    });

    // Get asker info for email
    const asker = await User.findByPk(req.user.id);

    // If this is a reply (has parentId), notify all participants in the thread
    if (parentId) {
      // Find the top-level parent comment
      let topLevelParentId = parentId;
      let currentParent = await Question.findByPk(parentId);

      while (currentParent && currentParent.parentId) {
        topLevelParentId = currentParent.parentId;
        currentParent = await Question.findByPk(currentParent.parentId);
      }

      // Get all questions in this thread (parent + all replies)
      const threadQuestions = await Question.findAll({
        where: {
          [Op.or]: [
            { id: topLevelParentId },
            { parentId: topLevelParentId },
          ],
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'fullName'],
          },
        ],
      });

      // Get unique user IDs who participated (excluding current user)
      const participantUserIds = new Set<number>();
      threadQuestions.forEach((q: any) => {
        if (q.userId !== req.user!.id) {
          participantUserIds.add(q.userId);
        }
      });

      // Also add the product seller (if not the one replying)
      if ((product as any).seller?.id !== req.user.id) {
        participantUserIds.add((product as any).seller?.id);
      }

      // If the replier is the SELLER, broadcast to ALL Bidders and ALL Questioners
      if ((product as any).sellerId && req.user.id === (product as any).sellerId) {
        // Fetch all unique questioners
        const allQuestioners = await Question.findAll({
          where: { productId: productId },
          attributes: ['userId'],
        });
        allQuestioners.forEach(q => {
          if (q.userId !== req.user!.id) participantUserIds.add(q.userId);
        });

        // Fetch all unique bidders
        const allBidders = await Bid.findAll({
          where: { productId: productId },
          attributes: ['bidderId'],
        });
        allBidders.forEach(b => {
          if (b.bidderId !== req.user!.id) participantUserIds.add(b.bidderId);
        });
      }

      // Get all participant emails
      const participants = await User.findAll({
        where: {
          id: Array.from(participantUserIds),
        },
        attributes: ['email', 'fullName'],
      });

      // Send email to all participants
      participants.forEach((participant: any) => {
        sendQuestionNotificationEmail(
          participant.email,
          product.name,
          question,
          productId,
          participant.fullName,
          asker?.fullName,
          true
        ).catch((error) => {
          console.error('Lỗi khi gửi email thông báo reply:', error);
        });
      });
    } else {
      // This is a top-level      // Send email notification to seller
      // Signature: (sellerEmail, productName, question, productId, userName, askerName)
      sendQuestionNotificationEmail(
        product.seller.email,
        product.name,
        question,
        parseInt(productId),
        "Seller",
        req.user.fullName,
        false
      ).catch((err: any) => console.error("Error sending question email:", err));
    }

    res.status(201).json({
      success: true,
      data: questionRecord,
    });
  } catch (error) {
    next(error);
  }
};

export const answerQuestion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { questionId } = req.params;
    const { answer } = req.body;

    const question = await Question.findByPk(questionId, {
      include: [
        {
          model: Product,
          as: 'product',
          include: [{ model: User, as: 'seller' }],
        },
        { model: User, as: 'user' },
      ],
    });

    if (!question) {
      return next(new AppError('Question not found', 404));
    }

    // Fix: The type 'Question' does not have a 'product' attribute; fetch Product manually by productId
    const product = await Product.findByPk(question.productId);

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    if (product.sellerId !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    question.answer = answer;
    question.answeredAt = new Date();
    await question.save();

    // Send email to questioner and all bidders
    // Send email to questioner and all bidders
    const questioner = await User.findByPk(question.userId);
    if (questioner) {
      sendAnswerNotificationEmail(
        questioner.email,
        product.name,
        answer,
        question.productId,
        questioner.fullName || "User",
        question.question
      ).catch((err: any) => console.error("Error sending answer email to questioner:", err));
    }

    // Get all users who asked questions or placed bids
    const questioners = await Question.findAll({
      where: { productId: question.productId },
      attributes: ['userId'],
      group: ['userId'],
    });

    const bidders = await Bid.findAll({
      where: { productId: question.productId },
      attributes: ['bidderId'],
      group: ['bidderId'],
    });

    const userIds = new Set([
      ...questioners.map(q => q.userId),
      ...bidders.map(b => b.bidderId),
    ]);
    userIds.delete(question.userId); // Don't send to questioner again

    const users = await User.findAll({
      where: { id: Array.from(userIds) },
    });

    for (const user of users) {
      sendAnswerNotificationEmail(
        user.email,
        product.name,
        answer,
        question.productId,
        user.fullName || "User",
        question.question
      ).catch((err: any) => console.error("Error sending answer email to participant:", err));
    }

    res.json({
      success: true,
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

export const requestSellerUpgrade = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.role === 'seller' || user.role === 'admin') {
      return next(new AppError('User is already a seller or admin', 400));
    }

    // Cho phép yêu cầu lại ngay nếu:
    // 1. Request trước đó bị từ chối (rejected)
    // 2. Hoặc đã hết thời hạn seller (upgradeExpireAt đã qua và role đã về bidder)
    const canRequestImmediately =
      user.upgradeRequestStatus === 'rejected' ||
      (user.upgradeExpireAt && user.upgradeExpireAt < new Date() && user.role === 'bidder');

    // Check if request was made within cooldown period (chỉ áp dụng nếu không được phép yêu cầu lại ngay)
    if (!canRequestImmediately && user.upgradeRequestDate) {
      const daysSinceRequest = (new Date().getTime() - user.upgradeRequestDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceRequest < UPGRADE_REQUEST_COOLDOWN_DAYS) {
        return next(new AppError(`You can only request upgrade once every ${UPGRADE_REQUEST_COOLDOWN_DAYS} days`, 400));
      }
    }

    user.upgradeRequestDate = new Date();
    user.upgradeRequestStatus = 'pending';
    await user.save();

    res.json({
      success: true,
      message: 'Upgrade request submitted. Waiting for admin approval.',
    });
  } catch (error) {
    next(error);
  }
};

export const rateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { orderId, rating, comment } = req.body;

    const order = await Order.findByPk(orderId, {
      include: [
        { model: Product, as: 'product' },
        { model: User, as: 'seller' },
        { model: User, as: 'buyer' },
      ],
    });

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    // Determine reviewee
    let revieweeId: number;
    if (req.user.id === order.sellerId) {
      revieweeId = order.buyerId;
    } else if (req.user.id === order.buyerId) {
      revieweeId = order.sellerId;
    } else {
      return next(new AppError('Not authorized', 403));
    }

    // Check if review already exists
    let review = await Review.findOne({
      where: {
        reviewerId: req.user.id,
        orderId,
      },
    });

    if (review) {
      // Update existing review
      const oldRating = review.rating;
      review.rating = rating;
      review.comment = comment;
      await review.save();

      // Update user rating
      const reviewee = await User.findByPk(revieweeId);
      if (reviewee) {
        if (oldRating === 1 && rating === -1) {
          reviewee.rating -= 2;
        } else if (oldRating === -1 && rating === 1) {
          reviewee.rating += 2;
        }
        await reviewee.save();
      }
    } else {
      // Create new review
      review = await Review.create({
        reviewerId: req.user.id,
        revieweeId,
        orderId,
        rating,
        comment,
      });

      // Update user rating
      const reviewee = await User.findByPk(revieweeId);
      if (reviewee) {
        reviewee.rating += rating === 1 ? 1 : 0;
        reviewee.totalRatings += 1;
        await reviewee.save();
      }
    }

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};


export const getPublicProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: ['id', 'fullName', 'createdAt', 'rating', 'totalRatings', 'role'],
    }) as any;

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const reviews = await Review.findAll({
      where: { revieweeId: id },
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'fullName'],
        },
        {
          model: Order,
          as: 'order',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'mainImage'],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 20, // Limit to 20 recent reviews
    });

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        reviews,
      },
    });
  } catch (error) {
    next(error);
  }
};
