import { Request, Response, NextFunction } from "express";
import { Product, Category, User, Bid, Question, Order } from "../models";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  removeVietnameseDiacritics,
  createSlug,
} from "../utils/vietnamese.util";
import { Op } from "sequelize";
import { sequelize } from "../config/database";

const NEW_PRODUCT_MINUTES = parseInt(process.env.NEW_PRODUCT_MINUTES || "60");

const isProductNew = (product: any) => {
  if (!product || !product.createdAt) return false;
  const now = new Date();
  const created = new Date(product.createdAt);
  return now.getTime() - created.getTime() < NEW_PRODUCT_MINUTES * 60 * 1000;
};

export const getHomepageProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const now = new Date();

    // Top 5 products ending soon
    const endingSoon = await Product.findAll({
      where: {
        status: "active",
        endDate: { [Op.gt]: now },
      },
      include: [
        {
          model: Category,
          as: "category",
          include: [
            {
              model: Category,
              as: "parent",
            },
          ],
        },
        {
          model: User,
          as: "seller",
          attributes: ["id", "fullName", "rating", "totalRatings"],
        },
      ],
      order: [["endDate", "ASC"]],
      limit: 5,
    });

    // Mark isNew based on creation time and config
    endingSoon.forEach((p) => {
      p.setDataValue("isNew", isProductNew(p));
    });

    // Top 5 products with most bids
    const mostBids = await Product.findAll({
      where: {
        status: "active",
        endDate: { [Op.gt]: now },
      },
      include: [
        {
          model: Category,
          as: "category",
          include: [
            {
              model: Category,
              as: "parent",
            },
          ],
        },
        {
          model: User,
          as: "seller",
          attributes: ["id", "fullName", "rating", "totalRatings"],
        },
      ],
      order: [["bidCount", "DESC"]],
      limit: 5,
    });

    // Mark isNew based on creation time and config
    mostBids.forEach((p) => {
      p.setDataValue("isNew", isProductNew(p));
    });

    // Top 5 products with highest price
    const highestPrice = await Product.findAll({
      where: {
        status: "active",
        endDate: { [Op.gt]: now },
      },
      include: [
        {
          model: Category,
          as: "category",
          include: [
            {
              model: Category,
              as: "parent",
            },
          ],
        },
        {
          model: User,
          as: "seller",
          attributes: ["id", "fullName", "rating", "totalRatings"],
        },
      ],
      order: [["currentPrice", "DESC"]],
      limit: 5,
    });

    // Mark isNew based on creation time and config
    highestPrice.forEach((p) => {
      p.setDataValue("isNew", isProductNew(p));
    });

    res.json({
      success: true,
      data: {
        endingSoon,
        mostBids,
        highestPrice,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      categoryId,
      page = "1",
      limit = "12",
      sortBy = "endDate",
      sortOrder = "ASC",
      search,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const where: any = {
      status: "active",
      endDate: { [Op.gt]: new Date() },
    };

    if (categoryId) {
      // Check if category has children - if so, include products from all child categories
      const category = await Category.findByPk(categoryId as string, {
        include: [
          {
            model: Category,
            as: "children",
          },
        ],
      });

      if (category && category.children && category.children.length > 0) {
        // Parent category: include products from all child categories
        // (Products are typically assigned to leaf categories, not parent categories)
        const childIds = category.children.map((child: any) => child.id);
        where.categoryId = { [Op.in]: childIds };
      } else {
        // Leaf category: filter by exact categoryId
        where.categoryId = parseInt(categoryId as string);
      }
    }

    if (search) {
      const searchTerm = removeVietnameseDiacritics(search as string);
      where[Op.or] = [
        sequelize.where(
          sequelize.fn("LOWER", sequelize.col("Product.nameNoDiacritics")),
          "LIKE",
          `%${searchTerm}%`
        ),
        sequelize.where(
          sequelize.fn(
            "LOWER",
            sequelize.col("Product.descriptionNoDiacritics")
          ),
          "LIKE",
          `%${searchTerm}%`
        ),
      ];
    }

    const order: any[] = [];
    if (sortBy === "endDate") {
      order.push(["endDate", sortOrder === "DESC" ? "DESC" : "ASC"]);
    } else if (sortBy === "price") {
      order.push(["currentPrice", sortOrder === "DESC" ? "DESC" : "ASC"]);
    } else {
      order.push(["createdAt", "DESC"]);
    }

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          as: "category",
          include: [
            {
              model: Category,
              as: "parent",
            },
          ],
        },
        {
          model: User,
          as: "seller",
          attributes: ["id", "fullName", "rating", "totalRatings"],
        },
        {
          model: Bid,
          as: "bids",
          where: { isRejected: false },
          required: false,
          include: [
            {
              model: User,
              as: "bidder",
              attributes: ["id", "fullName", "rating", "totalRatings"],
            },
          ],
          order: [["amount", "DESC"]],
          limit: 1,
        },
      ],
      order,
      limit: limitNum,
      offset,
    });

    // Mark isNew based on creation time and config
    rows.forEach((p) => {
      p.setDataValue("isNew", isProductNew(p));
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

export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [
        {
          model: Category,
          as: "category",
          include: [
            {
              model: Category,
              as: "parent",
            },
          ],
        },
        {
          model: User,
          as: "seller",
          attributes: ["id", "fullName", "email", "rating", "totalRatings"],
        },
        {
          model: Bid,
          as: "bids",
          where: { isRejected: false },
          required: false,
          include: [
            {
              model: User,
              as: "bidder",
              attributes: ["id", "fullName", "rating", "totalRatings"],
            },
          ],
          order: [["amount", "DESC"]],
          limit: 1,
        },
        {
          model: Question,
          as: "questions",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "fullName"],
            },
          ],
          order: [["createdAt", "DESC"]],
        },
      ],
    });

    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    // Mark isNew
    product.setDataValue("isNew", isProductNew(product));

    // Increment view count
    product.viewCount += 1;
    await product.save();

    // Get 5 related products
    const relatedProducts = await Product.findAll({
      where: {
        categoryId: product.categoryId,
        id: { [Op.ne]: product.id },
        status: "active",
        endDate: { [Op.gt]: new Date() },
      },
      include: [
        { model: Category, as: "category" },
        {
          model: User,
          as: "seller",
          attributes: ["id", "fullName", "rating", "totalRatings"],
        },
      ],
      limit: 5,
      order: [["createdAt", "DESC"]],
    });

    relatedProducts.forEach((p) => p.setDataValue("isNew", isProductNew(p)));

    res.json({
      success: true,
      data: {
        product,
        relatedProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== "seller") {
      return next(new AppError("Only sellers can create products", 403));
    }

    const {
      name,
      description,
      startingPrice,
      bidStep,
      buyNowPrice,
      categoryId,
      mainImage,
      images,
      endDate,
      autoExtend,
    } = req.body;

    // Validate images
    const imageArray = images || [];
    if (imageArray.length < 3) {
      return next(new AppError("At least 3 images are required", 400));
    }

    // Validate category
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return next(new AppError("Category not found", 404));
    }

    const slug = createSlug(name);
    const existingProduct = await Product.findOne({ where: { slug } });
    if (existingProduct) {
      return next(new AppError("Product with this name already exists", 400));
    }

    const product = await Product.create({
      name,
      slug,
      description,
      nameNoDiacritics: removeVietnameseDiacritics(name),
      descriptionNoDiacritics: removeVietnameseDiacritics(description),
      startingPrice,
      currentPrice: startingPrice,
      bidStep,
      buyNowPrice,
      categoryId,
      sellerId: req.user.id,
      mainImage,
      images: imageArray,
      startDate: new Date(),
      endDate: new Date(endDate),
      autoExtend: autoExtend || false,
      isNew: true,
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const { status } = req.query;
    const where: any = {
      sellerId: req.user.id,
    };

    if (status) {
      where.status = status;
    }

    const products = await Product.findAll({
      where,
      include: [
        { model: Category, as: "category" },
        {
          model: Bid,
          as: "bids",
          where: { isRejected: false },
          required: false,
          include: [
            {
              model: User,
              as: "bidder",
              attributes: ["id", "fullName"],
            },
          ],
          order: [["amount", "DESC"]],
          limit: 1,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Mark isNew based on creation time and config
    products.forEach((p) => p.setDataValue("isNew", isProductNew(p)));

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

export const getSellerOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const orders = await Order.findAll({
      where: { sellerId: req.user.id },
      include: [
        {
          model: Product,
          as: "product",
          include: [{ model: Category, as: "category" }],
        },
        { model: User, as: "buyer", attributes: ["id", "fullName", "email"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProductDescription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const { id } = req.params;
    const { additionalDescription, timestamp } = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    if (product.sellerId !== req.user.id && req.user.role !== "admin") {
      return next(new AppError("Not authorized", 403));
    }

    // Append new description with timestamp
    const timestampStr = timestamp || new Date().toLocaleDateString("vi-VN");
    const newDescription = `\n\n✏️ ${timestampStr}\n\n${additionalDescription}`;
    product.description = product.description + newDescription;
    await product.save();

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return next(new AppError("Only admins can delete products", 403));
    }

    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    product.status = "cancelled";
    await product.save();

    res.json({
      success: true,
      message: "Product removed successfully",
    });
  } catch (error) {
    next(error);
  }
};
