import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { reportsService } from "@/modules/reports/reports.service";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

// GET /api/reports/orders
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN")(user.role);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const result = await reportsService.getOrderReport(startDate, endDate);
    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
