import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import {
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "./auth.validator";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  type JwtPayload,
} from "@/middleware/auth";
import { UnauthorizedError, NotFoundError, AppError } from "@/utils/errors";
import { logger } from "@/utils/logger";
import { sendOtpEmail } from "@/lib/mail";

// ============ Auth Service ============

export class AuthService {
  async login(input: LoginInput) {
    const validated = loginSchema.parse(input);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (!user.isActive) {
      throw new UnauthorizedError("Account has been deactivated");
    }

    const isPasswordValid = await bcrypt.compare(validated.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const tokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    logger.info(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshTokenStr: string) {
    const validated = refreshTokenSchema.parse({ refreshToken: refreshTokenStr });
    const payload = verifyRefreshToken(validated.refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError("User not found or deactivated");
    }

    const tokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    return user;
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const validated = forgotPasswordSchema.parse(input);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (!user) {
      throw new NotFoundError("User with this email");
    }

    if (!user.isActive) {
      throw new AppError("Account has been deactivated");
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtp: otp,
        resetOtpExpires: otpExpires,
      },
    });

    // Send OTP Email using SendGrid
    const emailSent = await sendOtpEmail(user.email, otp, user.name);

    if (!emailSent) {
      throw new AppError("Failed to send verification email. Please try again later.");
    }

    logger.info(`Password reset OTP generated and sent for user: ${user.email}`);
    return { email: user.email };
  }

  async resetPassword(input: ResetPasswordInput) {
    const validated = resetPasswordSchema.parse(input);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (!user) {
      throw new NotFoundError("User with this email");
    }

    if (!user.resetOtp || !user.resetOtpExpires || user.resetOtpExpires < new Date()) {
      throw new AppError("Invalid or expired OTP verification code");
    }

    if (user.resetOtp !== validated.otp) {
      throw new AppError("Invalid OTP verification code");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(validated.password, 10);

    // Update user password and clear OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetOtp: null,
        resetOtpExpires: null,
      },
    });

    logger.info(`Password successfully reset for user: ${user.email}`);
    return { success: true };
  }
}

export const authService = new AuthService();
