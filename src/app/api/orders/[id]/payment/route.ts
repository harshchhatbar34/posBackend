import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { orderService } from "@/modules/orders/order.service";
import { authenticate } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/orders/[id]/payment
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return handlePayment(request, params);
}

// POST /api/orders/[id]/payment
export async function POST(request: NextRequest, { params }: RouteParams) {
  return handlePayment(request, params);
}

async function handlePayment(request: NextRequest, params: Promise<{ id: string }>) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    const { id } = await params;
    const body = await request.json();
    const result = await orderService.recordPayment(id, body, user.id);
    
    return successResponse(result, "Payment recorded successfully");
  } catch (error) {
    return handleError(error);
  }
}
