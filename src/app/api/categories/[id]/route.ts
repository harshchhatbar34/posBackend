import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { categoryService } from "@/modules/categories/category.service";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    await authenticate(request);
    const { id } = await params;
    const result = await categoryService.findById(id);
    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return handleCategoryUpdate(request, params);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  return handleCategoryUpdate(request, params);
}

async function handleCategoryUpdate(request: NextRequest, params: RouteParams["params"]) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN", "MANAGER")(user.role);
    const { id } = await params;
    const body = await request.json();
    const result = await categoryService.update(id, body);
    return successResponse(result, "Category updated successfully");
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN", "MANAGER")(user.role);
    const { id } = await params;
    const result = await categoryService.delete(id);
    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
