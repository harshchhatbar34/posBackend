import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { authService } from "@/modules/auth/auth.service";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

// POST /api/auth/reset-password
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const result = await authService.resetPassword(body);
    return successResponse(result, "Your password has been reset successfully");
  } catch (error) {
    return handleError(error);
  }
}
