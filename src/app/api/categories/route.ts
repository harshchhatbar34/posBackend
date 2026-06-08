import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { categoryService } from "@/modules/categories/category.service";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    await authenticate(request);
    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
      search: searchParams.get("search") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
    };
    const result = await categoryService.findAll(params as never);
    return successResponse(result.categories, undefined, 200, result.meta);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN", "MANAGER")(user.role);
    const body = await request.json();
    const result = await categoryService.create(body);
    return successResponse(result, "Category created successfully", 201);
  } catch (error) {
    return handleError(error);
  }
}
