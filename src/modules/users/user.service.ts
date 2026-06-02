import bcrypt from "bcryptjs";
import User, { Role } from "@/models/User";
import Order from "@/models/Order";
import OrderLog from "@/models/OrderLog";
import InventoryStockLog from "@/models/InventoryStockLog";
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
import { sendWelcomeEmail } from "@/lib/mail";

export class UserService {
  async findAll(params: PaginationParams, requesterRole: string) {
    const { page, pageSize, search, sortBy, sortOrder } = paginationSchema.parse(params);
    const skip = (page - 1) * pageSize;

    let roleQuery: any = {};
    if (requesterRole === "SUPER_ADMIN") {
      roleQuery = { role: Role.ADMIN };
    } else if (requesterRole === "ADMIN") {
      roleQuery = { role: { $in: [Role.HELPER, Role.CHEF] } };
    } else {
      roleQuery = { _id: null };
    }

    const where: any = search
      ? {
          $and: [
            roleQuery,
            {
              $or: [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
              ],
            },
          ],
        }
      : roleQuery;

    const sortOpt: any = { [sortBy || "createdAt"]: sortOrder === "desc" ? -1 : 1 };

    const [users, total] = await Promise.all([
      User.find(where)
        .select('name email role isActive createdAt')
        .sort(sortOpt)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      User.countDocuments(where),
    ]);

    const enrichedUsers = users.map(u => ({ ...u, id: u._id.toString() }));

    return {
      users: enrichedUsers,
      meta: paginationMeta(page, pageSize, total),
    };
  }

  async findById(id: string) {
    const user = await User.findById(id).select('name email role isActive createdAt').lean();
    if (!user) throw new NotFoundError("User");
    return { ...user, id: user._id.toString() };
  }

  async verifyManagementAuthority(targetId: string, requesterRole: string) {
    const target = await User.findById(targetId);
    if (!target) throw new NotFoundError("User");

    if (requesterRole === "SUPER_ADMIN") {
      if (target.role !== Role.ADMIN) {
        throw new AppError("Super Admins can only manage Admin accounts.");
      }
    } else if (requesterRole === "ADMIN") {
      if (![Role.HELPER, Role.CHEF].includes(target.role as any)) {
        throw new AppError("Admins can only manage Helper and Chef accounts.");
      }
    } else {
      throw new UnauthorizedError("You are not authorized to manage user accounts.");
    }
    return target;
  }

  async create(input: CreateUserInput, requesterRole: string) {
    const validated = createUserSchema.parse(input);

    if (requesterRole === "SUPER_ADMIN") {
      if (validated.role !== Role.ADMIN) {
        throw new AppError("Super Admins can only create Admin accounts.");
      }
    } else if (requesterRole === "ADMIN") {
      if (![Role.HELPER, Role.CHEF].includes(validated.role as any)) {
        throw new AppError("Admins can only create Helper and Chef accounts.");
      }
    } else {
      throw new UnauthorizedError("You are not authorized to create user accounts.");
    }

    const existing = await User.findOne({ email: validated.email });
    if (existing) throw new ConflictError("Email already exists");

    const hashedPassword = await bcrypt.hash(validated.password, 12);

    const user = await User.create({
      name: validated.name,
      email: validated.email,
      role: validated.role,
      password: hashedPassword,
      isActive: true,
    });

    await sendWelcomeEmail(user.email, user.name, user.role);
    logger.info(`User created and welcome email sent: ${user.email} with role ${user.role}`);

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async update(id: string, input: UpdateUserInput) {
    const validated = updateUserSchema.parse(input);
    await this.findById(id);

    const data: any = { ...validated };
    if (validated.password) {
      data.password = await bcrypt.hash(validated.password, 12);
    }

    const user = await User.findByIdAndUpdate(id, data, { new: true }).select('name email role isActive createdAt').lean();
    if (!user) throw new NotFoundError("User");

    logger.info(`User updated: ${user.email}`);
    return { ...user, id: user._id.toString() };
  }

  async block(id: string, requesterRole: string) {
    const target = await this.verifyManagementAuthority(id, requesterRole);

    target.isActive = false;
    await target.save();

    logger.info(`User blocked: ${target.email}`);
    return {
      id: target._id.toString(),
      name: target.name,
      email: target.email,
      role: target.role,
      isActive: target.isActive,
    };
  }

  async unlock(id: string, requesterRole: string) {
    const target = await this.verifyManagementAuthority(id, requesterRole);

    target.isActive = true;
    await target.save();

    logger.info(`User unlocked: ${target.email}`);
    return {
      id: target._id.toString(),
      name: target.name,
      email: target.email,
      role: target.role,
      isActive: target.isActive,
    };
  }

  async delete(id: string, requesterRole: string) {
    const target = await this.verifyManagementAuthority(id, requesterRole);

    // Check for references before hard delete
    const hasOrders = await Order.exists({ $or: [{ takenById: id }, { chefId: id }, { servedById: id }] });
    const hasOrderLogs = await OrderLog.exists({ userId: id });
    const hasInventoryLogs = await InventoryStockLog.exists({ addedById: id });

    if (hasOrders || hasOrderLogs || hasInventoryLogs) {
      target.isActive = false;
      await target.save();
      logger.warn(`User has active logs and could not be hard deleted. Blocked instead: ${target.email}`);
      return {
        message: "User has active transaction history. Account has been blocked and deactivated instead of deleted.",
      };
    }

    await User.findByIdAndDelete(id);
    logger.info(`User hard deleted: ${target.email}`);
    return { message: "User deleted successfully" };
  }
}

export const userService = new UserService();
