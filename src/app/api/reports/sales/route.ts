import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { reportsService } from "@/modules/reports/reports.service";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";

// GET /api/reports/sales
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN")(user.role);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const sectionId = searchParams.get("sectionId") || undefined;
    const result = await reportsService.getSalesReport(startDate, endDate, sectionId);
    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
