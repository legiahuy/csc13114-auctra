import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { User } from '../models';
import { AppError } from '../middleware/errorHandler';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.util';
import { sendOTPEmail } from '../utils/email.util';
import { generateOTP, generateToken } from '../utils/otp.util';
import { Op } from 'sequelize';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400));
    }

    const { email, password, fullName, address, dateOfBirth, recaptchaToken } = req.body;

    // Verify reCAPTCHA (implement actual verification)
    // if (!verifyRecaptcha(recaptchaToken)) {
    //   return next(new AppError('reCAPTCHA verification failed', 400));
    // }

    // Check if email exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return next(new AppError('Email already exists', 400));
    }

    // Generate OTP
    const otp = generateOTP();
    const verificationToken = generateToken();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10);

    // Create user
    const user = await User.create({
      email,
      password,
      fullName,
      address,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      role: 'bidder',
      emailVerificationToken: verificationToken,
      emailVerificationExpires: expires,
    });

    // Send OTP email
    await sendOTPEmail(email, otp);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: {
        userId: user.id,
        email: user.email,
        verificationToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, otp } = req.body;

    const user = await User.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return next(new AppError('Invalid or expired verification token', 400));
    }

    // Verify OTP (in production, store OTP in database)
    // For now, we'll just verify the token exists

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400));
    }

    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return next(new AppError('Invalid credentials', 401));
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return next(new AppError('Invalid credentials', 401));
    }

    if (!user.isEmailVerified) {
      return next(new AppError('Please verify your email first', 401));
    }

    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          upgradeExpireAt: user.upgradeExpireAt || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError('Refresh token required', 400));
    }

    const { verifyRefreshToken } = require('../utils/jwt.util');
    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      data: {
        accessToken,
      },
    });
  } catch (error) {
    next(new AppError('Invalid refresh token', 401));
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      return res.json({
        success: true,
        message: 'If email exists, password reset link has been sent',
      });
    }

    const resetToken = generateToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = expires;
    await user.save();

    // Send email with OTP
    const otp = generateOTP();
    await sendOTPEmail(email, otp);

    res.json({
      success: true,
      message: 'Password reset OTP sent to email',
      data: {
        resetToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, otp, newPassword } = req.body;

    const user = await User.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return next(new AppError('Invalid or expired reset token', 400));
    }

    // Verify OTP (in production, verify against stored OTP)
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

