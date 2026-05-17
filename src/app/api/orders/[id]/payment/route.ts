import { NextRequest } from "next/server";
import { orderService } from "@/modules/orders/order.service";
import { authenticate } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";
import { emitDashboardUpdate } from "@/sockets/socket";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/orders/[id]/payment
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await authenticate(request);
    const { id } = await params;
    const body = await request.json();
    const result = await orderService.recordPayment(id, body, user.id);
    
    // Trigger realtime socket updates
    emitDashboardUpdate({ type: "payment_recorded", orderId: id });

    return successResponse(result, "Payment recorded successfully");
  } catch (error) {
    return handleError(error);
  }
}
