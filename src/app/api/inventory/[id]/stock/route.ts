import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/inventory/[id]/stock
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN")(user.role);
    const { id } = await params;
    const body = await request.json();
    const result = await inventoryService.addStock(id, body, user.id);
    
    return successResponse(result, "Stock added successfully");
  } catch (error) {
    return handleError(error);
  }
}
