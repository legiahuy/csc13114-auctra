import sgMail from "@sendgrid/mail";
import { logger } from "../config/logger";
import fs from "fs";
import path from "path";
import mjml2html from "mjml";

// Kiểm tra cấu hình email
const isEmailConfigured = () => {
  return !!(process.env.SENDGRID_API_KEY && process.env.EMAIL_FROM);
};

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Helper to render MJML template with variables
const renderMJMLTemplate = async (
  templatePath: string,
  variables: Record<string, string>
): Promise<string> => {
  try {
    // Read MJML template
    let mjmlContent = fs.readFileSync(templatePath, "utf-8");

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      mjmlContent = mjmlContent.replace(
        new RegExp(`{{\\s*${key}\\s*}}`, "g"),
        value
      );
    });

    // Compile MJML to HTML
    const result = await mjml2html(mjmlContent);
    const { html, errors } = result;

    if (errors && errors.length > 0) {
      logger.error("MJML compilation errors:", errors);
      throw new Error(
        `MJML compilation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    return html;
  } catch (error) {
    logger.error(`Failed to render MJML template ${templatePath}:`, error);
    throw error;
  }
};

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  // Kiểm tra cấu hình email
  if (!isEmailConfigured()) {
    logger.warn(
      "Email không được cấu hình. Vui lòng kiểm tra SENDGRID_API_KEY và EMAIL_FROM"
    );
    logger.warn(`Email sẽ không được gửi đến: ${to}`);
    logger.warn("Subject:", subject);
    return; // Không throw error để không làm crash app
  }

  const startTime = Date.now();
  try {
    logger.info(`🚀 [${startTime}] Đang gửi email đến ${to} qua SendGrid...`);

    const msg = {
      to,
      from: process.env.EMAIL_FROM!, // Non-null assertion checked by isEmailConfigured
      subject,
      html,
    };

    await sgMail.send(msg);

    const duration = Date.now() - startTime;
    logger.info(`✅ [${duration}ms] Email đã được gửi thành công đến ${to}`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`❌ [${duration}ms] Lỗi khi gửi email đến ${to}:`);
    logger.error(`❌ Error Message: ${error.message}`);
    
    if (error.response) {
      logger.error(`❌ SendGrid Response: ${JSON.stringify(error.response.body)}`);
    }
    
    // Log extended SendGrid errors if available
    if (error.response?.body?.errors) {
       error.response.body.errors.forEach((e: any) => {
         logger.error(`❌ SendGrid Error Detail: ${e.message}`);
       })
    }
  }
};

export const sendOTPEmail = async (
  email: string,
  otp: string
): Promise<void> => {
  const templatePath = path.join(__dirname, "../templates/otp-email.mjml");
  const html = await renderMJMLTemplate(templatePath, {
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
  const html = await renderMJMLTemplate(templatePath, {
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
  userName: string,
  isOutbid: boolean = false,
  productId?: number
): Promise<void> => {
  const templatePath = path.join(
    __dirname,
    "../templates/bid-notification.mjml"
  );

  const notificationType = isOutbid
    ? "Outbid Alert"
    : "Bid Placed Successfully";
  const message = isOutbid
    ? "Your bid has been outbid. The current price has been updated. Place a new bid to stay in the auction!"
    : "Your bid has been placed successfully. You are currently the highest bidder!";
  const priceLabel = isOutbid ? "New Current Price" : "Your Bid Amount";

  const productUrl = productId
    ? `${process.env.FRONTEND_URL}/products/${productId}`
    : `${process.env.FRONTEND_URL}/products`;

  const html = await renderMJMLTemplate(templatePath, {
    notificationType,
    userName,
    message,
    productName,
    priceLabel,
    currentPrice: `${amount.toLocaleString("en-US")} VND`,
    productUrl,
  });

  await sendEmail(email, `${notificationType} - ${productName}`, html);
};

export const sendSellerNewBidNotification = async (
  email: string,
  productName: string,
  amount: number,
  bidderName: string,
  productId?: number
): Promise<void> => {
  const templatePath = path.join(
    __dirname,
    "../templates/bid-notification.mjml"
  );

  const notificationType = "New Bid Received";
  const message = `A new bid has been placed on your product. Current highest bid is now ${amount.toLocaleString(
    "en-US"
  )} VND by ${bidderName}.`;
  const priceLabel = "Current Highest Bid";

  const productUrl = productId
    ? `${process.env.FRONTEND_URL}/products/${productId}`
    : `${process.env.FRONTEND_URL}/products`;

  const html = await renderMJMLTemplate(templatePath, {
    notificationType,
    userName: "Seller",
    message,
    productName,
    priceLabel,
    currentPrice: `${amount.toLocaleString("en-US")} VND`,
    productUrl,
  });

  await sendEmail(email, `${notificationType} - ${productName}`, html);
};

export const sendQuestionNotificationEmail = async (
  sellerEmail: string,
  productName: string,
  question: string,
  productId: number,
  userName: string = "Seller",
  askerName?: string,
  isReply: boolean = false
): Promise<void> => {
  const templatePath = path.join(
    __dirname,
    "../templates/question-notification.mjml"
  );
  const productUrl = `${process.env.FRONTEND_URL}/products/${productId}`;

  const title = isReply ? "New Reply Received" : "New Question Received";
  const notificationType = isReply ? "reply" : "question";
  const subject = isReply
    ? `New Reply on ${productName}`
    : `New Question - ${productName}`;

  const html = await renderMJMLTemplate(templatePath, {
    title,
    notificationType,
    userName,
    productName,
    askerName: askerName || "A user",
    question,
    productUrl,
  });

  await sendEmail(sellerEmail, subject, html);
};

export const sendAnswerNotificationEmail = async (
  email: string,
  productName: string,
  answer: string,
  productId: number,
  userName: string,
  question?: string
): Promise<void> => {
  const templatePath = path.join(
    __dirname,
    "../templates/answer-notification.mjml"
  );
  const productUrl = `${process.env.FRONTEND_URL}/products/${productId}`;

  const html = await renderMJMLTemplate(templatePath, {
    userName,
    productName,
    question: question || "Question details unavailable",
    answer,
    productUrl,
  });

  await sendEmail(email, `Answer Posted - ${productName}`, html);
};

export const sendAuctionEndedEmail = async (
  email: string,
  productName: string,
  productId: number,
  isWinner: boolean,
  userName: string,
  finalPrice?: number,
  isSeller: boolean = false,
  orderId?: number
): Promise<void> => {
  const templatePath = path.join(__dirname, "../templates/auction-ended.mjml");

  let emailTitle: string;
  let message: string;
  let actionText: string;
  let actionUrl: string;
  let additionalInfo: string = "";

  if (isWinner) {
    emailTitle = "🎉 Congratulations! You Won the Auction";
    message =
      "Congratulations! You have won the auction. Please complete your order to finalize the purchase.";
    actionText = "Complete Your Order";
    actionUrl = orderId
      ? `${process.env.FRONTEND_URL}/orders/${orderId}`
      : `${process.env.FRONTEND_URL}/orders`;
    additionalInfo =
      "Please proceed with payment and shipping details to complete your purchase.";
  } else if (isSeller) {
    if (finalPrice) {
      emailTitle = "Auction Ended - Product Sold";
      message = "Congratulations! Your product has been sold.";
    } else {
      emailTitle = "Auction Ended";
      message = "The auction for your product has ended with no bids.";
    }

    actionText = finalPrice ? "View Order Details" : "View Product Details";
    actionUrl = finalPrice
      ? orderId
        ? `${process.env.FRONTEND_URL}/orders/${orderId}`
        : `${process.env.FRONTEND_URL}/orders`
      : productId
      ? `${process.env.FRONTEND_URL}/products/${productId}`
      : `${process.env.FRONTEND_URL}/products`;

    additionalInfo = finalPrice
      ? "Please prepare the product for shipping once payment is confirmed."
      : ""; // No additional info for no bids
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

  // Determine price label
  const priceLabel = finalPrice ? "Final Price" : "";

  const html = await renderMJMLTemplate(templatePath, {
    emailTitle,
    userName,
    message,
    productName,
    priceLabel, // Pass dynamic label
    finalPrice: finalPrice ? `${finalPrice.toLocaleString("en-US")} VND` : "",
    additionalInfo,
    actionText,
    actionUrl,
  });

  await sendEmail(email, `${emailTitle} - ${productName}`, html);
};

export const sendBidRejectedEmail = async (
  email: string,
  productName: string,
  userName: string,
  productId?: number
): Promise<void> => {
  const templatePath = path.join(
    __dirname,
    "../templates/bid-notification.mjml"
  );

  const productUrl = productId
    ? `${process.env.FRONTEND_URL}/products/${productId}`
    : `${process.env.FRONTEND_URL}/products`;

  const html = await renderMJMLTemplate(templatePath, {
    notificationType: "Bid Rejected",
    userName,
    message:
      "The seller has rejected your bid. You are no longer able to bid on this product.",
    productName,
    priceLabel: "Status",
    currentPrice: "Rejected",
    productUrl,
  });

  await sendEmail(email, `Bid Rejected - ${productName}`, html);
};

export const sendAdminPasswordResetEmail = async (
  email: string,
  newPassword: string
): Promise<void> => {
  const templatePath = path.join(__dirname, "../templates/otp-email.mjml");
  // Using the OTP template but adapting it for password reset notification
  const html = await renderMJMLTemplate(templatePath, {
    emailType: "Password Reset Notification",
    message: `Your password has been reset by an administrator. Please use the following temporary password to log in. We recommend changing your password immediately after logging in.`,
    codeLabel: "New Password",
    code: newPassword,
    expiryText:
      "This password does not expire, but please change it soon for security.",
  });
  await sendEmail(email, "Your Password Has Been Reset - Auctra", html);
};

export const sendDescriptionUpdateNotificationEmail = async (
  email: string,
  productName: string,
  userName: string,
  productId: number
): Promise<void> => {
  const templatePath = path.join(
    __dirname,
    "../templates/description-update.mjml"
  );
  const productUrl = `${process.env.FRONTEND_URL}/products/${productId}`;

  const html = await renderMJMLTemplate(templatePath, {
    userName,
    productName,
    productUrl,
  });

  await sendEmail(email, `Product Update - ${productName}`, html);
};
