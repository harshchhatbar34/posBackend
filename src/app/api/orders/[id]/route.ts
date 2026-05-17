import { NextRequest } from "next/server";
import { orderService } from "@/modules/orders/order.service";
import { authenticate } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/orders/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await authenticate(request);
    const { id } = await params;
    const result = await orderService.findById(id);
    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
