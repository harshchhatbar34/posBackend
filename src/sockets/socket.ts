import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@/lib/constants";
import { SOCKET_EVENTS, SOCKET_ROOMS } from "@/lib/constants";
import { logger } from "@/utils/logger";

// ============ Socket.IO Server ============

let io: Server | null = null;

export function getIO(): Server | null {
  return io;
}

export function initializeSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        role: string;
      };
      (socket as Socket & { user: typeof payload }).user = payload;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = (socket as Socket & { user: { userId: string; role: string; email: string } }).user;
    logger.info(`Socket connected: ${user.email} (${user.role})`);

    // Auto-join rooms based on role
    socket.join(SOCKET_ROOMS.DASHBOARD);

    if (["CHEF", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      socket.join(SOCKET_ROOMS.KITCHEN);
    }

    if (["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      socket.join(SOCKET_ROOMS.INVENTORY);
    }

    // Join section-specific rooms
    socket.on("join:section", (sectionId: string) => {
      socket.join(`section:${sectionId}`);
      logger.debug(`User ${user.email} joined section room: ${sectionId}`);
    });

    socket.on("leave:section", (sectionId: string) => {
      socket.leave(`section:${sectionId}`);
    });

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${user.email}`);
    });
  });

  logger.info("Socket.IO server initialized");
  return io;
}

// ============ Socket Emit Helpers ============

export function emitOrderNew(order: unknown) {
  if (io) {
    io.to(SOCKET_ROOMS.KITCHEN).emit(SOCKET_EVENTS.ORDER_NEW, order);
    io.to(SOCKET_ROOMS.DASHBOARD).emit(SOCKET_EVENTS.DASHBOARD_UPDATE, { type: "new_order" });
    logger.debug("Socket: order:new emitted");
  }
}

export function emitOrderUpdate(order: unknown) {
  if (io) {
    io.to(SOCKET_ROOMS.KITCHEN).emit(SOCKET_EVENTS.ORDER_UPDATE, order);
    io.to(SOCKET_ROOMS.DASHBOARD).emit(SOCKET_EVENTS.DASHBOARD_UPDATE, { type: "order_update" });
    logger.debug("Socket: order:update emitted");
  }
}

export function emitOrderServed(order: unknown) {
  if (io) {
    io.to(SOCKET_ROOMS.DASHBOARD).emit(SOCKET_EVENTS.ORDER_SERVED, order);
    logger.debug("Socket: order:served emitted");
  }
}

export function emitKitchenUpdate(data: unknown) {
  if (io) {
    io.to(SOCKET_ROOMS.KITCHEN).emit(SOCKET_EVENTS.KITCHEN_UPDATE, data);
    logger.debug("Socket: kitchen:update emitted");
  }
}

export function emitInventoryUpdate(data: unknown) {
  if (io) {
    io.to(SOCKET_ROOMS.INVENTORY).emit(SOCKET_EVENTS.INVENTORY_UPDATE, data);
    logger.debug("Socket: inventory:update emitted");
  }
}

export function emitDashboardUpdate(data: unknown) {
  if (io) {
    io.to(SOCKET_ROOMS.DASHBOARD).emit(SOCKET_EVENTS.DASHBOARD_UPDATE, data);
    logger.debug("Socket: dashboard:update emitted");
  }
}
