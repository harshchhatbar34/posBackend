import { NextRequest } from "next/server";
import { authService } from "@/modules/auth/auth.service";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await authService.login(body);
    return successResponse(result, "Login successful");
  } catch (error) {
    return handleError(error);
  }
}
