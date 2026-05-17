import { NextRequest } from "next/server";
import { sectionService } from "@/modules/sections/section.service";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

// GET /api/sections
export async function GET(request: NextRequest) {
  try {
    await authenticate(request);
    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
      search: searchParams.get("search") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
    };
    const result = await sectionService.findAll(params as never);
    return successResponse(result.sections, undefined, 200, result.meta);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/sections
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN")(user.role);
    const body = await request.json();
    const result = await sectionService.create(body);
    return successResponse(result, "Section created successfully", 201);
  } catch (error) {
    return handleError(error);
  }
}
