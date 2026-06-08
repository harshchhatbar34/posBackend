import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

type RouteParams = { params: Promise<{ id: string, logId: string }> };

// PUT /api/inventory/[id]/usage/[logId]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN")(user.role);
    const { id, logId } = await params;
    const body = await request.json();
    const result = await inventoryService.updateUsageLog(id, logId, body);
    
    return successResponse(result, "Usage log updated successfully");
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/inventory/[id]/usage/[logId]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN")(user.role);
    const { id, logId } = await params;
    const result = await inventoryService.deleteUsageLog(id, logId);
    
    return successResponse(result, "Usage log deleted successfully");
  } catch (error) {
    return handleError(error);
  }
}
