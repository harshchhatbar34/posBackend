import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { tableService } from "@/modules/tables/table.service";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

// GET /api/tables
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    await authenticate(request);
    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
      sectionId: searchParams.get("sectionId") || undefined,
      status: searchParams.get("status") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
    };
    const result = await tableService.findAll(params as never);
    return successResponse(result.tables, undefined, 200, result.meta);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/tables
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN", "MANAGER")(user.role);
    const body = await request.json();
    const result = await tableService.create(body);
    return successResponse(result, "Table created successfully", 201);
  } catch (error) {
    return handleError(error);
  }
}
