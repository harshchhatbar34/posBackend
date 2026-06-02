import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN } from "@/lib/constants";
import { UnauthorizedError, ForbiddenError } from "@/utils/errors";
import User, { Role } from "@/models/User";

// ============ JWT Helpers ============

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as any,
  });
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN as any,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}

export function verifyRefreshToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }
}

// ============ Auth Middleware ============

export async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("No token provided");
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyAccessToken(token);

  // Verify user still exists and is active
  const user = await User.findById(payload.userId).select('name email role isActive');

  if (!user || !user.isActive) {
    throw new UnauthorizedError("User not found or deactivated");
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role as Role,
    isActive: user.isActive
  };
}

// ============ RBAC Middleware ============

export function authorize(...allowedRoles: Role[]) {
  return (userRole: Role) => {
    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenError("You do not have permission to perform this action");
    }
  };
}

// Role hierarchy helper
const roleHierarchy: Record<Role, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  CHEF: 2,
  HELPER: 1,
};

export function hasMinimumRole(userRole: Role, minimumRole: Role): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[minimumRole];
}
