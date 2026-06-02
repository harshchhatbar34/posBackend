import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { sectionService } from "@/modules/sections/section.service";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/sections/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    await authenticate(request);
    const { id } = await params;
    const result = await sectionService.findById(id);
    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}

// PATCH /api/sections/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN")(user.role);
    const { id } = await params;
    const body = await request.json();
    const result = await sectionService.update(id, body);
    return successResponse(result, "Section updated successfully");
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/sections/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN")(user.role);
    const { id } = await params;
    const result = await sectionService.delete(id);
    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
