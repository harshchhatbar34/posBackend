import { NextResponse } from "next/server";

// ============ API Response Formatter ============

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200,
  meta?: PaginationMeta
) {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
  };
  if (message) {
    body.message = message;
  }
  if (meta) {
    body.meta = meta;
  }
  return NextResponse.json(body, { status });
}

export function errorResponse(
  error: string,
  status: number = 400,
  details?: unknown
) {
  const body: ApiErrorResponse = {
    success: false,
    error,
  };
  if (details !== undefined) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

export function paginationMeta(
  page: number,
  pageSize: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / pageSize);
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
