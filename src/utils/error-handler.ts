import { ZodError } from "zod";
import mongoose from "mongoose";
import { AppError, ValidationError } from "./errors";
import { errorResponse } from "./api-response";
import { logger } from "./logger";

// ============ Centralized Error Handler ============

export function handleError(error: any) {
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

  // Mongoose Duplicate Key Error (e.g. unique constraint)
  if (error && error.code === 11000) {
    return errorResponse("A record with this value already exists", 409);
  }

  // Mongoose Validation Error
  if (error instanceof mongoose.Error.ValidationError) {
    const formatted = Object.values(error.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    logger.warn("Mongoose validation error", formatted);
    return errorResponse("Database validation failed", 422, formatted);
  }

  // Mongoose CastError (e.g. invalid ObjectId)
  if (error instanceof mongoose.Error.CastError) {
    return errorResponse("Invalid ID format", 400);
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
