import { ZodError } from "zod";
import { AppError, ValidationError } from "./errors";
import { errorResponse } from "./api-response";
import { logger } from "./logger";
import { Prisma } from "@prisma/client";

// ============ Centralized Error Handler ============

export function handleError(error: unknown) {
  // Zod validation errors
  if (error instanceof ZodError) {
    const formatted = error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    logger.warn("Validation error", formatted);
    return errorResponse("Validation failed", 422, formatted);
  }

  // Custom app errors
  if (error instanceof ValidationError) {
    logger.warn(error.message, error.details);
    return errorResponse(error.message, error.statusCode, error.details);
  }

  if (error instanceof AppError) {
    logger.warn(error.message);
    return errorResponse(error.message, error.statusCode);
  }

  // Prisma known errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return errorResponse("A record with this value already exists", 409);
      case "P2025":
        return errorResponse("Record not found", 404);
      case "P2003":
        return errorResponse("Related record not found", 400);
      default:
        logger.error("Prisma error", { code: error.code, message: error.message });
        return errorResponse("Database error", 500);
    }
  }

  // Unknown errors
  if (error instanceof Error) {
    logger.error("Unhandled error", { message: error.message, stack: error.stack });
    return errorResponse(
      process.env.NODE_ENV === "development" ? error.message : "Internal server error",
      500
    );
  }

  logger.error("Unknown error", error);
  return errorResponse("Internal server error", 500);
}
