import { NextRequest } from "next/server";
import { userService } from "@/modules/users/user.service";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/users/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN")(user.role);

    const { id } = await params;
    // Verify authority to see this user
    await userService.verifyManagementAuthority(id, user.role);
    const result = await userService.findById(id);
    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}

// PATCH /api/users/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN")(user.role);

    const { id } = await params;
    const body = await request.json();

    let result;
    if (body.action === "block") {
      result = await userService.block(id, user.role);
    } else if (body.action === "unlock") {
      result = await userService.unlock(id, user.role);
    } else {
      await userService.verifyManagementAuthority(id, user.role);
      result = await userService.update(id, body);
    }

    return successResponse(result, "User updated successfully");
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/users/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN")(user.role);

    const { id } = await params;
    const result = await userService.delete(id, user.role);
    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
