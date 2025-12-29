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

    // Upload to Supabase Storage
    const { uploadToSupabase } = await import('../utils/storage.util');
    const fileUrl = await uploadToSupabase(req.file, 'uploads');

    res.json({
      success: true,
      data: {
        filename: req.file.originalname,
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
    
    // If filename is a full Supabase URL, redirect to it
    if (filename.startsWith('http')) {
      return res.redirect(filename);
    }
    
    // Otherwise, try to serve from local uploads directory (for backward compatibility)
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

