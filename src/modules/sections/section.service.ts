import mongoose from "mongoose";
import Section from "@/models/Section";
import Table from "@/models/Table";
import Product from "@/models/Product";
import {
  createSectionSchema,
  updateSectionSchema,
  type CreateSectionInput,
  type UpdateSectionInput,
} from "./section.validator";
import { paginationSchema, type PaginationParams } from "@/validators/common";
import { NotFoundError } from "@/utils/errors";
import { paginationMeta } from "@/utils/api-response";
import { logger } from "@/utils/logger";

export class SectionService {
  async findAll(params: PaginationParams) {
    const { page, pageSize, search, sortBy, sortOrder } = paginationSchema.parse(params);
    const skip = (page - 1) * pageSize;

    const where: any = { isActive: { $ne: false } };
    if (search) {
      where.name = { $regex: search, $options: "i" };
    }

    const sortOpt: any = { [sortBy || "createdAt"]: sortOrder === "desc" ? -1 : 1 };

    const [sections, total] = await Promise.all([
      Section.aggregate([
        { $match: where },
        { $sort: sortOpt },
        { $skip: skip },
        { $limit: pageSize },
        {
          $lookup: {
            from: "tables",
            localField: "_id",
            foreignField: "sectionId",
            as: "tables",
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "sectionId",
            as: "products",
          },
        },
        {
          $addFields: {
            _count: {
              tables: { $size: "$tables" },
              products: { $size: "$products" },
            },
            id: { $toString: "$_id" },
          },
        },
        { $project: { tables: 0, products: 0 } },
      ]),
      Section.countDocuments(where),
    ]);

    return {
      sections,
      meta: paginationMeta(page, pageSize, total),
    };
  }

  async findById(id: string) {
    const section = await Section.findById(id).lean();
    if (!section) throw new NotFoundError("Section");

    const tables = await Table.find({ sectionId: id }).lean();
    const productCount = await Product.countDocuments({ sectionId: id });

    return {
      ...section,
      id: section._id.toString(),
      tables: tables.map(t => ({ ...t, id: t._id.toString() })),
      _count: { products: productCount }
    };
  }

  async create(input: CreateSectionInput) {
    const validated = createSectionSchema.parse(input);
    const section = await Section.create(validated);
    logger.info(`Section created: ${section.name}`);
    return this.findById(section._id.toString());
  }

  async update(id: string, input: UpdateSectionInput) {
    const validated = updateSectionSchema.parse(input);
    const section = await Section.findByIdAndUpdate(id, validated, { new: true });
    if (!section) throw new NotFoundError("Section");
    logger.info(`Section updated: ${section.name}`);
    return this.findById(id);
  }

  async delete(id: string) {
    const section = await Section.findByIdAndUpdate(id, { isActive: false });
    if (!section) throw new NotFoundError("Section");

    logger.info(`Section deactivated: ${id}`);
    return { message: "Section deactivated successfully" };
  }
}

export const sectionService = new SectionService();
