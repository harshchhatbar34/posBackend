import sgMail from "@sendgrid/mail";
import { logger } from "@/utils/logger";

const apiKey = process.env.SENDGRID_API_KEY || "";
const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@jaygoga.com";

// Initialize SendGrid if API key is present and not the default placeholder
const isSendGridConfigured = apiKey && !apiKey.startsWith("SG.your_actual");

if (isSendGridConfigured) {
  sgMail.setApiKey(apiKey);
  logger.info("SendGrid mail service initialized successfully");
} else {
  logger.warn(
    "SendGrid API Key not configured. Emails will be logged to console instead of sent."
  );
}

export async function sendOtpEmail(to: string, otp: string, name: string): Promise<boolean> {
  const subject = "Reset Your Password - Jay Goga POS";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #6366F1; text-align: center;">Jay Goga POS</h2>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p>Hello <strong>${name}</strong>,</p>
      <p>We received a request to reset the password associated with your account. Use the following 6-digit One-Time Password (OTP) to reset it:</p>
      <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 6px; margin: 25px 0;">
        ${otp}
      </div>
      <p style="color: #4b5563; font-size: 14px;"><strong>Note:</strong> This OTP is valid for <strong>15 minutes</strong>. If you did not request a password reset, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">Jay Goga POS System &copy; ${new Date().getFullYear()}</p>
    </div>
  `;

  if (isSendGridConfigured) {
    try {
      await sgMail.send({
        to,
        from: fromEmail,
        subject,
        html,
      });
      logger.info(`Password reset OTP email sent successfully to ${to}`);
      return true;
    } catch (error: any) {
      logger.error("Failed to send email via SendGrid", {
        message: error.message,
        response: error.response?.body,
      });
      return false;
    }
  } else {
    // Development fallback
    logger.info("=========================================");
    logger.info(`DEVELOPMENT EMAIL SIMULATION FOR: ${to}`);
    logger.info(`Subject: ${subject}`);
    logger.info(`OTP Code: ${otp}`);
    logger.info("=========================================");
    return true;
  }
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  role: string
): Promise<boolean> {
  const subject = "Welcome to Jay Goga POS - Account Created";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #6366F1; text-align: center;">Welcome to Jay Goga POS</h2>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p>Hello <strong>${name}</strong>,</p>
      <p>An account has been created for you on the <strong>Jay Goga POS</strong> system as a <strong>${role}</strong>.</p>
      <p>You can now log in using your registered email address and the password configured for your account.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">Jay Goga POS System &copy; ${new Date().getFullYear()}</p>
    </div>
  `;

  if (isSendGridConfigured) {
    try {
      await sgMail.send({
        to,
        from: fromEmail,
        subject,
        html,
      });
      logger.info(`Welcome email sent successfully to ${to}`);
      return true;
    } catch (error: any) {
      logger.error("Failed to send welcome email via SendGrid", {
        message: error.message,
        response: error.response?.body,
      });
      return false;
    }
  } else {
    // Development fallback
    logger.info("=========================================");
    logger.info(`DEVELOPMENT WELCOME EMAIL SIMULATION FOR: ${to}`);
    logger.info(`Subject: ${subject}`);
    logger.info(`Role Assigned: ${role}`);
    logger.info("=========================================");
    return true;
  }
}
