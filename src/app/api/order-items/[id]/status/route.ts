import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { orderService } from "@/modules/orders/order.service";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/order-items/[id]/status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return handleItemStatusUpdate(request, params);
}

// PUT /api/order-items/[id]/status
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return handleItemStatusUpdate(request, params);
}

async function handleItemStatusUpdate(request: NextRequest, params: Promise<{ id: string }>) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN", "MANAGER", "CHEF")(user.role);
    const { id } = await params;
    const body = await request.json();
    const result = await orderService.updateItemStatus(id, body, user.id);
    
    return successResponse(result, "Item status updated successfully");
  } catch (error) {
    return handleError(error);
  }
}
