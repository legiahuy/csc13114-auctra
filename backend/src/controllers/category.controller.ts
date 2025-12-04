import { Request, Response, NextFunction } from 'express';
import { Category, Product } from '../models';
import { AppError } from '../middleware/errorHandler';
import { Op } from 'sequelize';

export const getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await Category.findAll({
      where: { parentId: null },
      include: [
        {
          model: Category,
          as: 'children',
        },
      ],
      order: [['name', 'ASC']],
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id, {
      include: [
        {
          model: Category,
          as: 'children',
        },
        {
          model: Category,
          as: 'parent',
        },
      ],
    });

    if (!category) {
      return next(new AppError('Category not found', 404));
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, parentId } = req.body;
    const { createSlug } = require('../utils/vietnamese.util');

    const slug = createSlug(name);

    // Check if slug exists
    const existingCategory = await Category.findOne({ where: { slug } });
    if (existingCategory) {
      return next(new AppError('Category with this name already exists', 400));
    }

    // Validate parent if provided
    if (parentId) {
      const parent = await Category.findByPk(parentId);
      if (!parent) {
        return next(new AppError('Parent category not found', 404));
      }
    }

    const category = await Category.create({
      name,
      slug,
      parentId: parentId || null,
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, parentId } = req.body;
    const { createSlug } = require('../utils/vietnamese.util');

    const category = await Category.findByPk(id);
    if (!category) {
      return next(new AppError('Category not found', 404));
    }

    // Check if category has products
    const productCount = await Product.count({ where: { categoryId: id } });
    if (productCount > 0 && name && name !== category.name) {
      return next(new AppError('Cannot update category name when it has products', 400));
    }

    if (name) {
      const slug = createSlug(name);
      const existingCategory = await Category.findOne({
        where: { slug, id: { [Op.ne]: id } },
      });
      if (existingCategory) {
        return next(new AppError('Category with this name already exists', 400));
      }
      category.name = name;
      category.slug = slug;
    }

    if (parentId !== undefined) {
      if (parentId === id) {
        return next(new AppError('Category cannot be its own parent', 400));
      }
      if (parentId) {
        const parent = await Category.findByPk(parentId);
        if (!parent) {
          return next(new AppError('Parent category not found', 404));
        }
      }
      category.parentId = parentId;
    }

    await category.save();

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) {
      return next(new AppError('Category not found', 404));
    }

    // Check if category has products
    const productCount = await Product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return next(new AppError('Cannot delete category with products', 400));
    }

    // Check if category has children
    const childrenCount = await Category.count({ where: { parentId: id } });
    if (childrenCount > 0) {
      return next(new AppError('Cannot delete category with subcategories', 400));
    }

    await category.destroy();

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

