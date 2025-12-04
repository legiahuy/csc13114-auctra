import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import path from 'path';
import fs from 'fs';

export const uploadFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    // Return file URL/path
    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: fileUrl,
        size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const serveFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename } = req.params;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return next(new AppError('File not found', 404));
    }

    res.sendFile(path.resolve(filePath));
  } catch (error) {
    next(error);
  }
};

