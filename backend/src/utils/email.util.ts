import nodemailer from "nodemailer";
import { logger } from "../config/logger";
import fs from "fs";
import path from "path";
import mjml2html from "mjml";

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
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  // Thêm options để debug
  debug: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development',
  // Force IPv4 to avoid Railway IPv6 timeout issues
  family: 4,
} as nodemailer.TransportOptions);

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    logger.error('❌ Email Transporter Connection Error:', error);
  } else {
    logger.info('✅ Email Transporter is ready to send messages');
  }
});

// Helper to render MJML template with variables
// ... (omitted)

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

  const startTime = Date.now();
  try {
    logger.info(`🚀 [${startTime}] Đang gửi email đến ${to}...`);
    logger.info(`📧 Config: HOST=${process.env.EMAIL_HOST}, PORT=${process.env.EMAIL_PORT}, USER=${process.env.EMAIL_USER}, SECURE=${transporter.options.secure}`);

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    const duration = Date.now() - startTime;
    logger.info(`✅ [${duration}ms] Email đã được gửi thành công đến ${to}`);
    logger.info(`🆔 Message ID: ${result.messageId}`);
    logger.info(`📝 Response: ${result.response}`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`❌ [${duration}ms] Lỗi khi gửi email đến ${to}:`);
    logger.error(`❌ Error Name: ${error.name}`);
    logger.error(`❌ Error Message: ${error.message}`);
    logger.error(`❌ Error Code: ${error.code}`);
    logger.error(`❌ Error Command: ${error.command}`);
    if (error.response) {
      logger.error(`❌ SMTP Response: ${error.response}`);
    }
    logger.error(`❌ Full Error Stack: ${error.stack}`);
    
    // Log connection details if available
    if (error.address) logger.error(`❌ Connected to: ${error.address}:${error.port}`);
  }
};

export const sendOTPEmail = async (
  email: string,
  otp: string
): Promise<void> => {
  const templatePath = path.join(__dirname, "../templates/otp-email.mjml");
  const html = renderMJMLTemplate(templatePath, {
    emailType: "Email Verification",
    message: `We received a request to verify your email address. Please enter the verification code below to confirm your account:`,
    codeLabel: "Verification Code",
    code: otp,
    expiryText: "This code expires in 10 minutes",
  });
  await sendEmail(email, "Verify Your Email - Auctra", html);
};

export const sendPasswordResetOTPEmail = async (
  email: string,
  otp: string
): Promise<void> => {
  const templatePath = path.join(__dirname, "../templates/otp-email.mjml");
  const html = renderMJMLTemplate(templatePath, {
    emailType: "Password Reset",
    message: `We received a request to reset your password. Please enter the verification code below to proceed with resetting your password:`,
    codeLabel: "Reset Code",
    code: otp,
    expiryText: "This code expires in 1 hour",
  });
  await sendEmail(email, "Reset Your Password - Auctra", html);
};

export const sendBidNotificationEmail = async (
  email: string,
  productName: string,
  amount: number,
  isOutbid: boolean = false,
  productId?: number
): Promise<void> => {
  const templatePath = path.join(__dirname, "../templates/bid-notification.mjml");

  const notificationType = isOutbid ? "Outbid Alert" : "Bid Placed Successfully";
  const message = isOutbid
    ? "Your bid has been outbid. The current price has been updated. Place a new bid to stay in the auction!"
    : "Your bid has been placed successfully. You are currently the highest bidder!";
  const priceLabel = isOutbid ? "New Current Price" : "Your Bid Amount";

  const productUrl = productId
    ? `${process.env.FRONTEND_URL}/products/${productId}`
    : `${process.env.FRONTEND_URL}/products`;

  const html = renderMJMLTemplate(templatePath, {
    notificationType,
    userName: "", // Will show "Hello ," which is fine for generic emails
    message,
    productName,
    priceLabel,
    currentPrice: `${amount.toLocaleString("en-US")} VND`,
    productUrl,
  });

  await sendEmail(
    email,
    `${notificationType} - ${productName}`,
    html
  );
};


export const sendQuestionNotificationEmail = async (
  sellerEmail: string,
  productName: string,
  question: string,
  productId: number,
  askerName?: string
): Promise<void> => {
  const templatePath = path.join(__dirname, "../templates/qa-notification.mjml");
  const productUrl = `${process.env.FRONTEND_URL}/products/${productId}`;

  const html = renderMJMLTemplate(templatePath, {
    notificationType: "📧 New Question About Your Product",
    userName: "", // Generic greeting
    message: "You have received a new question about one of your products. Please review and respond to help potential buyers.",
    productName,
    askerLabel: askerName ? "Asked by" : "",
    askerName: askerName || "",
    questionLabel: "Question",
    question,
    answerLabel: "",
    answer: "",
    actionText: "View Product and Answer",
    productUrl,
  });

  await sendEmail(sellerEmail, `New Question About ${productName}`, html);
};


export const sendAnswerNotificationEmail = async (
  email: string,
  productName: string,
  answer: string,
  productId: number,
  question?: string
): Promise<void> => {
  const templatePath = path.join(__dirname, "../templates/qa-notification.mjml");
  const productUrl = `${process.env.FRONTEND_URL}/products/${productId}`;

  const html = renderMJMLTemplate(templatePath, {
    notificationType: "Answer Received",
    userName: "", // Generic greeting
    message: "The seller has answered a question about this product. View the details below.",
    productName,
    askerLabel: "",
    askerName: "",
    questionLabel: question ? "Question" : "",
    question: question || "",
    answerLabel: "Answer",
    answer,
    actionText: "View Product Details",
    productUrl,
  });

  await sendEmail(email, `Answer About ${productName}`, html);
};


export const sendAuctionEndedEmail = async (
  email: string,
  productName: string,
  productId: number,
  isWinner: boolean,
  finalPrice?: number
): Promise<void> => {
  const templatePath = path.join(__dirname, "../templates/auction-ended.mjml");

  let emailTitle: string;
  let message: string;
  let actionText: string;
  let actionUrl: string;
  let additionalInfo: string = "";

  if (isWinner) {
    emailTitle = "🎉 Congratulations! You Won the Auction";
    message = "Congratulations! You have won the auction. Please complete your order to finalize the purchase.";
    actionText = "Complete Your Order";
    actionUrl = `${process.env.FRONTEND_URL}/orders`;
    additionalInfo = "Please proceed with payment and shipping details to complete your purchase.";
  } else {
    emailTitle = "Auction Ended";
    message = "The auction for this product has ended.";
    actionText = "View Product Details";
    actionUrl = productId
      ? `${process.env.FRONTEND_URL}/products/${productId}`
      : `${process.env.FRONTEND_URL}/products`;
    additionalInfo = finalPrice
      ? "The product was sold to another bidder."
      : "This auction ended with no bids.";
  }

  const html = renderMJMLTemplate(templatePath, {
    emailTitle,
    userName: "", // Generic greeting
    message,
    productName,
    finalPrice: finalPrice ? `${finalPrice.toLocaleString("en-US")} VND` : "",
    additionalInfo,
    actionText,
    actionUrl,
  });

  await sendEmail(email, `Auction Ended - ${productName}`, html);
};


export const sendBidRejectedEmail = async (
  email: string,
  productName: string,
  productId?: number
): Promise<void> => {
  const templatePath = path.join(__dirname, "../templates/bid-notification.mjml");

  const productUrl = productId
    ? `${process.env.FRONTEND_URL}/products/${productId}`
    : `${process.env.FRONTEND_URL}/products`;

  const html = renderMJMLTemplate(templatePath, {
    notificationType: "Bid Rejected",
    userName: "", // Generic greeting
    message: "The seller has rejected your bid. You are no longer able to bid on this product.",
    productName,
    priceLabel: "Status",
    currentPrice: "Rejected",
    productUrl,
  });

  await sendEmail(email, `Bid Rejected - ${productName}`, html);
};

