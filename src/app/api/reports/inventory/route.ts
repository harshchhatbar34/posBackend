import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { reportsService } from "@/modules/reports/reports.service";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

// GET /api/reports/inventory
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN", "MANAGER")(user.role);
    const result = await reportsService.getInventoryReport();
    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
