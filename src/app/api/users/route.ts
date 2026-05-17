import { NextRequest } from "next/server";
import { userService } from "@/modules/users/user.service";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

// GET /api/users
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN")(user.role);

    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
      search: searchParams.get("search") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
    };

    const result = await userService.findAll(params as never, user.role);
    return successResponse(result.users, undefined, 200, result.meta);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/users
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN")(user.role);

    const body = await request.json();
    const result = await userService.create(body, user.role);
    return successResponse(result, "User created successfully and onboarding email sent", 201);
  } catch (error) {
    return handleError(error);
  }
}
