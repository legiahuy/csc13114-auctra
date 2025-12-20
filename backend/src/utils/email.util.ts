import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

// Kiểm tra cấu hình email
const isEmailConfigured = () => {
  return !!(
    process.env.EMAIL_HOST &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASSWORD &&
    process.env.EMAIL_FROM
  );
};

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  // Thêm options để debug
  debug: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development',
});

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  // Kiểm tra cấu hình email
  if (!isEmailConfigured()) {
    logger.warn('Email không được cấu hình. Vui lòng kiểm tra các biến môi trường EMAIL_*');
    logger.warn(`Email sẽ không được gửi đến: ${to}`);
    logger.warn('Subject:', subject);
    return; // Không throw error để không làm crash app
  }

  try {
    logger.info(`Đang gửi email đến ${to}...`);
    logger.info(`Email config: HOST=${process.env.EMAIL_HOST}, PORT=${process.env.EMAIL_PORT}, USER=${process.env.EMAIL_USER}`);
    
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    
    logger.info(`Email đã được gửi thành công đến ${to}`);
    logger.info(`Message ID: ${result.messageId}`);
  } catch (error: any) {
    logger.error(`Lỗi khi gửi email đến ${to}:`);
    logger.error(`Error message: ${error.message}`);
    logger.error(`Error code: ${error.code}`);
    if (error.response) {
      logger.error(`SMTP Response: ${error.response}`);
    }
    // Không throw error để không làm crash app, chỉ log
    // throw error;
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
  productId: number,
  askerName?: string
): Promise<void> => {
  const productUrl = `${process.env.FRONTEND_URL}/products/${productId}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: #f9f9f9;
          border-radius: 8px;
          padding: 30px;
          border: 1px solid #e0e0e0;
        }
        h2 {
          color: #1976d2;
          margin-top: 0;
        }
        .info-box {
          background-color: #fff;
          border-left: 4px solid #1976d2;
          padding: 15px;
          margin: 20px 0;
        }
        .question-box {
          background-color: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 15px;
          margin: 15px 0;
        }
        .button {
          display: inline-block;
          background-color: #1976d2;
          color: #ffffff !important;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 4px;
          margin: 20px 0;
          font-weight: bold;
        }
        .button:hover {
          background-color: #1565c0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>📧 Có câu hỏi mới về sản phẩm của bạn</h2>
        
        <div class="info-box">
          <p><strong>Sản phẩm:</strong> ${productName}</p>
          ${askerName ? `<p><strong>Người hỏi:</strong> ${askerName}</p>` : ''}
        </div>
        
        <div class="question-box">
          <p><strong>Câu hỏi:</strong></p>
          <p>${question}</p>
        </div>
        
        <p>Vui lòng truy cập vào trang sản phẩm để trả lời câu hỏi này.</p>
        
        <a href="${productUrl}" class="button">Xem chi tiết sản phẩm và trả lời</a>
        
        <div class="footer">
          <p>Email này được gửi tự động từ hệ thống Online Auction.</p>
          <p>Nếu bạn không muốn nhận email này, vui lòng liên hệ với chúng tôi.</p>
        </div>
      </div>
    </body>
    </html>
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

