import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "./user.validator";
import { paginationSchema, type PaginationParams } from "@/validators/common";
import { NotFoundError, ConflictError, AppError, UnauthorizedError } from "@/utils/errors";
import { paginationMeta } from "@/utils/api-response";
import { logger } from "@/utils/logger";
import { sendWelcomeOnboardingEmail } from "@/lib/mail";

// ============ User Service ============

export class UserService {
  async findAll(params: PaginationParams, requesterRole: string) {
    const { page, pageSize, search, sortBy, sortOrder } = paginationSchema.parse(params);
    const skip = (page - 1) * pageSize;

    // Enforce role-based visibility rules!
    let roleQuery = {};
    if (requesterRole === "SUPER_ADMIN") {
      // Super admin can see/manage admins
      roleQuery = { role: "ADMIN" };
    } else if (requesterRole === "ADMIN") {
      // Admin can see/manage helpers and chefs
      roleQuery = { role: { in: ["HELPER", "CHEF"] } };
    } else {
      // Other roles have no visibility
      roleQuery = { id: "none" };
    }

    const where = search
      ? {
          AND: [
            roleQuery,
            {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
              ],
            },
          ],
        }
      : roleQuery;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        skip,
        take: pageSize,
        orderBy: { [sortBy || "createdAt"]: sortOrder },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      meta: paginationMeta(page, pageSize, total),
    };
  }

  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundError("User");
    return user;
  }

  async verifyManagementAuthority(targetId: string, requesterRole: string) {
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundError("User");

    if (requesterRole === "SUPER_ADMIN") {
      if (target.role !== "ADMIN") {
        throw new AppError("Super Admins can only manage Admin accounts.");
      }
    } else if (requesterRole === "ADMIN") {
      if (!["HELPER", "CHEF"].includes(target.role)) {
        throw new AppError("Admins can only manage Helper and Chef accounts.");
      }
    } else {
      throw new UnauthorizedError("You are not authorized to manage user accounts.");
    }
    return target;
  }

  async create(input: CreateUserInput, requesterRole: string) {
    const validated = createUserSchema.parse(input);

    // Enforce role-based account creation permissions!
    if (requesterRole === "SUPER_ADMIN") {
      if (validated.role !== "ADMIN") {
        throw new AppError("Super Admins can only create Admin accounts.");
      }
    } else if (requesterRole === "ADMIN") {
      if (!["HELPER", "CHEF"].includes(validated.role)) {
        throw new AppError("Admins can only create Helper and Chef accounts.");
      }
    } else {
      throw new UnauthorizedError("You are not authorized to create user accounts.");
    }

    const existing = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existing) throw new ConflictError("Email already exists");

    // Generate 6-digit verification code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Generate a temporary hashed password
    const temporaryPassword = Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        role: validated.role,
        password: hashedPassword,
        resetOtp: otp,
        resetOtpExpires: otpExpires,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Send Onboarding Setup Email
    await sendWelcomeOnboardingEmail(user.email, otp, user.name, user.role);

    logger.info(`User created and onboarding email sent: ${user.email} with role ${user.role}`);
    return user;
  }

  async update(id: string, input: UpdateUserInput) {
    const validated = updateUserSchema.parse(input);

    await this.findById(id);

    const data: Record<string, unknown> = { ...validated };
    if (validated.password) {
      data.password = await bcrypt.hash(validated.password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    logger.info(`User updated: ${user.email}`);
    return user;
  }

  async block(id: string, requesterRole: string) {
    await this.verifyManagementAuthority(id, requesterRole);

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    logger.info(`User blocked: ${user.email}`);
    return user;
  }

  async unlock(id: string, requesterRole: string) {
    await this.verifyManagementAuthority(id, requesterRole);

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    logger.info(`User unlocked: ${user.email}`);
    return user;
  }

  async delete(id: string, requesterRole: string) {
    const target = await this.verifyManagementAuthority(id, requesterRole);

    try {
      // Attempt actual database hard delete
      await prisma.user.delete({ where: { id } });
      logger.info(`User hard deleted: ${target.email}`);
      return { message: "User deleted successfully" };
    } catch {
      // Safe fallback: if referenced by active transactions (orders, logs), deactivate instead
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      logger.warn(`User has active logs and could not be hard deleted. Blocked instead: ${target.email}`);
      return {
        message: "User has active transaction history. Account has been blocked and deactivated instead of deleted.",
      };
    }
  }
}

export const userService = new UserService();
