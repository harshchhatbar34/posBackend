import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { orderService } from "@/modules/orders/order.service";
import { authenticate } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/orders/[id]/status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return handleStatusUpdate(request, params);
}

// PUT /api/orders/[id]/status
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return handleStatusUpdate(request, params);
}

async function handleStatusUpdate(request: NextRequest, params: Promise<{ id: string }>) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    const { id } = await params;
    const body = await request.json();
    const result = await orderService.updateStatus(id, body, user.id);
    
    return successResponse(result, "Order status updated successfully");
  } catch (error) {
    return handleError(error);
  }
}
