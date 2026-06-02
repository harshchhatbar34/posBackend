import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { orderService } from "@/modules/orders/order.service";
import { authenticate } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

type RouteParams = { params: Promise<{ id: string; itemId: string }> };

// DELETE /api/orders/[id]/items/[itemId] — Remove a specific item from an order
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const user = await authenticate(request);
    const { id, itemId } = await params;
    const result = await orderService.removeItem(id, itemId, user.id);
    return successResponse(result, "Item removed from order successfully");
  } catch (error) {
    return handleError(error);
  }
}
