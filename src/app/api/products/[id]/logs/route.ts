import connectToDatabase from "@/lib/mongoose";
import { NextRequest } from "next/server";
import { authenticate, authorize } from "@/middleware/auth";
import { successResponse } from "@/utils/api-response";
import { handleError } from "@/utils/error-handler";
import ProductLog from "@/models/ProductLog";
import { NotFoundError } from "@/utils/errors";
import Product, { ProductAvailability } from "@/models/Product";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/products/[id]/logs
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    const user = await authenticate(request);
    authorize("SUPER_ADMIN", "ADMIN", "MANAGER")(user.role);

    const { id } = await params;

    // Verify product exists
    const product = await Product.findOne({
      _id: id,
      availability: { $ne: ProductAvailability.DELETED },
    }).lean();
    if (!product) throw new NotFoundError("Product");

    const logs = await ProductLog.find({ productId: id })
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    const enrichedLogs = logs.map((log) => ({
      id: log._id.toString(),
      productId: log.productId.toString(),
      action: log.action,
      details: log.details,
      createdAt: log.createdAt,
      editedBy: log.userId
        ? {
            id: (log.userId as any)._id.toString(),
            name: (log.userId as any).name,
            email: (log.userId as any).email,
            role: (log.userId as any).role,
          }
        : null,
    }));

    return successResponse(enrichedLogs);
  } catch (error) {
    return handleError(error);
  }
}
