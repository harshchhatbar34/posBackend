import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { orderService } from "@/modules/orders/order.service";
import { authenticate } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/orders/[id]/items — Add items to an existing order
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const user = await authenticate(request);
    const { id } = await params;
    const body = await request.json();
    const result = await orderService.addItems(id, body, user.id);
    return successResponse(result, "Items added to order successfully");
  } catch (error) {
    return handleError(error);
  }
}
