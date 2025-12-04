import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}`);
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
};

export const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
  const html = `
    <h2>Xác nhận OTP</h2>
    <p>Mã OTP của bạn là: <strong>${otp}</strong></p>
    <p>Mã này có hiệu lực trong 10 phút.</p>
  `;
  await sendEmail(email, 'Xác nhận OTP - Online Auction', html);
};

export const sendBidNotificationEmail = async (
  email: string,
  productName: string,
  amount: number,
  isOutbid: boolean = false
): Promise<void> => {
  const html = `
    <h2>${isOutbid ? 'Bạn đã bị vượt giá' : 'Ra giá thành công'}</h2>
    <p>Sản phẩm: <strong>${productName}</strong></p>
    <p>Giá ${isOutbid ? 'mới' : 'đặt'}: <strong>${amount.toLocaleString('vi-VN')} VNĐ</strong></p>
    <p><a href="${process.env.FRONTEND_URL}/products/${productName}">Xem chi tiết</a></p>
  `;
  await sendEmail(email, `${isOutbid ? 'Bạn đã bị vượt giá' : 'Ra giá thành công'} - ${productName}`, html);
};

export const sendQuestionNotificationEmail = async (
  sellerEmail: string,
  productName: string,
  question: string,
  productId: number
): Promise<void> => {
  const html = `
    <h2>Có câu hỏi mới về sản phẩm của bạn</h2>
    <p>Sản phẩm: <strong>${productName}</strong></p>
    <p>Câu hỏi: ${question}</p>
    <p><a href="${process.env.FRONTEND_URL}/products/${productId}">Trả lời câu hỏi</a></p>
  `;
  await sendEmail(sellerEmail, `Câu hỏi mới về ${productName}`, html);
};

export const sendAnswerNotificationEmail = async (
  email: string,
  productName: string,
  answer: string,
  productId: number
): Promise<void> => {
  const html = `
    <h2>Người bán đã trả lời câu hỏi của bạn</h2>
    <p>Sản phẩm: <strong>${productName}</strong></p>
    <p>Câu trả lời: ${answer}</p>
    <p><a href="${process.env.FRONTEND_URL}/products/${productId}">Xem chi tiết</a></p>
  `;
  await sendEmail(email, `Trả lời về ${productName}`, html);
};

export const sendAuctionEndedEmail = async (
  email: string,
  productName: string,
  isWinner: boolean,
  finalPrice?: number
): Promise<void> => {
  const html = `
    <h2>Đấu giá đã kết thúc</h2>
    <p>Sản phẩm: <strong>${productName}</strong></p>
    ${isWinner 
      ? `<p>Chúc mừng! Bạn đã thắng đấu giá với giá: <strong>${finalPrice?.toLocaleString('vi-VN')} VNĐ</strong></p>
         <p><a href="${process.env.FRONTEND_URL}/orders">Hoàn tất đơn hàng</a></p>`
      : '<p>Đấu giá đã kết thúc. Sản phẩm này không có người thắng.</p>'
    }
  `;
  await sendEmail(email, `Đấu giá kết thúc - ${productName}`, html);
};

export const sendBidRejectedEmail = async (
  email: string,
  productName: string
): Promise<void> => {
  const html = `
    <h2>Lượt ra giá của bạn đã bị từ chối</h2>
    <p>Sản phẩm: <strong>${productName}</strong></p>
    <p>Người bán đã từ chối lượt ra giá của bạn. Bạn không thể tiếp tục đấu giá sản phẩm này.</p>
  `;
  await sendEmail(email, `Ra giá bị từ chối - ${productName}`, html);
};

