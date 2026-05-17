import { NextRequest } from "next/server";
import { productService } from "@/modules/products/product.service";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

export async function GET(request: NextRequest) {
  try {
    await authenticate(request);
    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
      search: searchParams.get("search") || undefined,
      sectionId: searchParams.get("sectionId") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      isAvailable: searchParams.get("isAvailable") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
    };
    const result = await productService.findAll(params as never);
    return successResponse(result.products, undefined, 200, result.meta);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN")(user.role);
    const body = await request.json();
    const result = await productService.create(body);
    return successResponse(result, "Product created successfully", 201);
  } catch (error) {
    return handleError(error);
  }
}
