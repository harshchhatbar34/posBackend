// ============ Application Constants ============

export const APP_NAME = "Jay Goga POS";
export const API_PREFIX = "/api";

// JWT
export const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

// Pagination
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Roles
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CHEF: "CHEF",
  HELPER: "HELPER",
} as const;

// Order statuses
export const ORDER_STATUSES = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  SERVED: "SERVED",
  CANCELLED: "CANCELLED",
} as const;

// Order item statuses
export const ORDER_ITEM_STATUSES = {
  PENDING: "PENDING",
  UNDER_COOK: "UNDER_COOK",
  COOKED: "COOKED",
} as const;

// Payment
export const PAYMENT_METHODS = {
  CASH: "CASH",
  ONLINE: "ONLINE",
} as const;

export const PAYMENT_STATUSES = {
  UNPAID: "UNPAID",
  PAID: "PAID",
} as const;

// Socket events
export const SOCKET_EVENTS = {
  ORDER_NEW: "order:new",
  ORDER_UPDATE: "order:update",
  ORDER_SERVED: "order:served",
  KITCHEN_UPDATE: "kitchen:update",
  INVENTORY_UPDATE: "inventory:update",
  DASHBOARD_UPDATE: "dashboard:update",
} as const;

// Socket rooms
export const SOCKET_ROOMS = {
  KITCHEN: "kitchen",
  DASHBOARD: "dashboard",
  INVENTORY: "inventory",
} as const;
