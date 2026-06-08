import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { orderService } from "@/modules/orders/order.service";
import { authenticate } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/orders/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    await authenticate(request);
    const { id } = await params;
    const result = await orderService.findById(id);
    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/orders/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const user = await authenticate(request);
    const { id } = await params;
    const result = await orderService.deleteOrder(id, user.id, user.role);
    return successResponse(result, "Order deleted successfully");
  } catch (error) {
    return handleError(error);
  }
}

