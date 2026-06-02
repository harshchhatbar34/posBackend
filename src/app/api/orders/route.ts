import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { orderService } from "@/modules/orders/order.service";
import { authenticate } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

// GET /api/orders
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    await authenticate(request);
    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
      status: searchParams.get("status") || undefined,
      tableId: searchParams.get("tableId") || undefined,
      paymentStatus: searchParams.get("paymentStatus") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
    };
    const result = await orderService.findAll(params as never);
    return successResponse(result.orders, undefined, 200, result.meta);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/orders
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    const body = await request.json();
    const result = await orderService.create(body, user.id);
    
    return successResponse(result, "Order created successfully", 201);
  } catch (error) {
    return handleError(error);
  }
}
