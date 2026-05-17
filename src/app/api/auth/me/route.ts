import { NextRequest } from "next/server";
import { authService } from "@/modules/auth/auth.service";
import { authenticate } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

// GET /api/auth/me
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    const profile = await authService.getMe(user.id);
    return successResponse(profile);
  } catch (error) {
    return handleError(error);
  }
}
