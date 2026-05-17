import { NextRequest } from "next/server";
import { productService } from "@/modules/products/product.service";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await authenticate(request);
    const { id } = await params;
    const result = await productService.findById(id);
    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN")(user.role);
    const { id } = await params;
    const body = await request.json();
    const result = await productService.update(id, body);
    return successResponse(result, "Product updated successfully");
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN")(user.role);
    const { id } = await params;
    const result = await productService.delete(id);
    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
