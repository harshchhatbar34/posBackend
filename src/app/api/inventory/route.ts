import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

// GET /api/inventory
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN", "MANAGER")(user.role);
    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
      search: searchParams.get("search") || undefined,
      location: searchParams.get("location") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
    };
    const result = await inventoryService.findAll(params as never);
    return successResponse(result.items, undefined, 200, result.meta);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/inventory
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN", "MANAGER")(user.role);
    const body = await request.json();
    const result = await inventoryService.create(body);
    return successResponse(result, "Inventory item created successfully", 201);
  } catch (error) {
    return handleError(error);
  }
}
