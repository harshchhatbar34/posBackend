import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { kitchenService } from "@/modules/kitchen/kitchen.service";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

// GET /api/kitchen/summary
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN", "MANAGER", "CHEF")(user.role);

    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get("sectionId") || undefined;

    const summary = await kitchenService.getKitchenSummary(sectionId);
    return successResponse(summary);
  } catch (error) {
    return handleError(error);
  }
}
