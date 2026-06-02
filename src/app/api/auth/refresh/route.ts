import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { authService } from "@/modules/auth/auth.service";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

// POST /api/auth/refresh
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const result = await authService.refreshToken(body.refreshToken);
    return successResponse(result, "Token refreshed successfully");
  } catch (error) {
    return handleError(error);
  }
}
