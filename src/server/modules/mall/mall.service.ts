import { PrismaClient } from "@prisma/client";
import type { AuthUser } from "../../middlewares/auth.ts";
import type {
  CreateProductInput,
  CreateRedemptionInput,
  UpdateProductInput,
} from "../../validators/mall.ts";

type ProductStatusApi = "Active" | "Out of Stock" | "Inactive";
type RedemptionStatusApi = "Pending" | "Issued";

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function productStatusToApi(status: "active" | "inactive" | "out_of_stock"): ProductStatusApi {
  if (status === "inactive") return "Inactive";
  if (status === "out_of_stock") return "Out of Stock";
  return "Active";
}

function apiToProductStatus(status?: string, stock?: number): "active" | "inactive" | "out_of_stock" {
  if (status === "Inactive" || status === "inactive") return "inactive";
  if (typeof stock === "number" && stock <= 0) return "out_of_stock";
  if (status === "Out of Stock" || status === "out_of_stock") return "out_of_stock";
  return "active";
}

function redemptionStatusToApi(status: "pending" | "issued" | "cancelled"): RedemptionStatusApi {
  return status === "issued" ? "Issued" : "Pending";
}

function apiToRedemptionStatus(status?: string): "pending" | "issued" {
  if (status === "Issued") return "issued";
  return "pending";
}

function buildProductCode(): string {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `P-${Date.now().toString(36).toUpperCase()}-${suffix}`;
}

function buildRedemptionCode(): string {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `R-${Date.now().toString(36).toUpperCase()}-${suffix}`;
}

export class MallService {
  constructor(private readonly prisma: PrismaClient) {}

  async listProducts() {
    const rows = await this.prisma.product.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((p) => ({
      id: p.productCode,
      name: p.name,
      price: p.pointsCost,
      stock: p.stock,
      category: p.category,
      image: p.imageUrl ?? "",
      status: productStatusToApi(p.status),
    }));
  }

  async createProduct(input: CreateProductInput) {
    const created = await this.prisma.product.create({
      data: {
        productCode: buildProductCode(),
        name: input.name,
        pointsCost: input.price,
        stock: input.stock,
        category: input.category,
        imageUrl: input.image,
        status: apiToProductStatus(input.status, input.stock),
        description: null,
      },
    });

    return {
      id: created.productCode,
      name: created.name,
      price: created.pointsCost,
      stock: created.stock,
      category: created.category,
      image: created.imageUrl ?? "",
      status: productStatusToApi(created.status),
    };
  }

  async updateProduct(productCode: string, input: UpdateProductInput) {
    const existing = await this.prisma.product.findUnique({ where: { productCode } });
    if (!existing) throw new Error("NOT_FOUND");

    const parsedStock = input.stock;
    const effectiveStock = parsedStock ?? existing.stock;
    const effectiveStatus =
      input.status !== undefined
        ? apiToProductStatus(input.status, effectiveStock)
        : parsedStock !== undefined
          ? apiToProductStatus(undefined, effectiveStock)
          : existing.status;

    const updated = await this.prisma.product.update({
      where: { productCode },
      data: {
        name: input.name,
        pointsCost: input.price,
        stock: parsedStock,
        category: input.category,
        imageUrl: input.image !== undefined ? input.image : undefined,
        status: effectiveStatus,
      },
    });

    return {
      id: updated.productCode,
      name: updated.name,
      price: updated.pointsCost,
      stock: updated.stock,
      category: updated.category,
      image: updated.imageUrl ?? "",
      status: productStatusToApi(updated.status),
    };
  }

  async deleteProduct(productCode: string) {
    const existing = await this.prisma.product.findUnique({
      where: { productCode },
      select: { id: true },
    });
    if (!existing) throw new Error("NOT_FOUND");

    const usedCount = await this.prisma.redemption.count({ where: { productId: existing.id } });
    if (usedCount > 0) throw new Error("CONFLICT");

    await this.prisma.product.delete({ where: { id: existing.id } });
  }

  async listRedemptions(authUser: AuthUser, userId?: string) {
    const targetUserId = authUser.role === "user" ? authUser.id : userId;
    const rows = await this.prisma.redemption.findMany({
      where: targetUserId ? { userId: targetUserId } : undefined,
      include: {
        user: { select: { username: true } },
        product: { select: { productCode: true, name: true, imageUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((r) => ({
      id: r.redemptionCode,
      userId: r.userId,
      username: r.user.username,
      productId: r.product.productCode,
      productName: r.product.name,
      productImage: r.product.imageUrl ?? "",
      points: r.pointsCost,
      date: toDateString(r.createdAt),
      status: redemptionStatusToApi(r.status),
    }));
  }

  async createRedemption(authUser: AuthUser, input: CreateRedemptionInput) {
    if (authUser.role !== "user") {
      throw new Error("FORBIDDEN_ROLE");
    }
    if (authUser.role === "user" && authUser.id !== input.userId) {
      throw new Error("FORBIDDEN");
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: input.userId } });
      const product = await tx.product.findUnique({ where: { productCode: input.productId } });

      if (!user || !product) throw new Error("NOT_FOUND");
      if (product.status !== "active" || product.stock < input.quantity) throw new Error("OUT_OF_STOCK");

      const totalCost = product.pointsCost * input.quantity;
      if (user.points < totalCost) throw new Error("INSUFFICIENT_POINTS");

      const nextPoints = user.points - totalCost;
      const nextStock = product.stock - input.quantity;

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { points: nextPoints },
      });

      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: nextStock,
          status: nextStock <= 0 ? "out_of_stock" : "active",
        },
      });

      const createdRedemption = await tx.redemption.create({
        data: {
          redemptionCode: buildRedemptionCode(),
          userId: user.id,
          productId: product.id,
          pointsCost: totalCost,
          quantity: input.quantity,
          status: "pending",
          note: null,
        },
        include: {
          user: { select: { username: true } },
          product: { select: { productCode: true, name: true, imageUrl: true } },
        },
      });

      await tx.userPointLog.create({
        data: {
          userId: user.id,
          changeType: "mall_redeem",
          delta: -totalCost,
          balanceAfter: nextPoints,
          referenceType: "redemption",
          referenceId: createdRedemption.id,
          note: `兑换商品 ${product.name} x${input.quantity}`,
          createdById: authUser.id,
        },
      });

      return {
        userPoints: updatedUser.points,
        redemption: {
          id: createdRedemption.redemptionCode,
          userId: createdRedemption.userId,
          username: createdRedemption.user.username,
          productId: createdRedemption.product.productCode,
          productName: createdRedemption.product.name,
          productImage: createdRedemption.product.imageUrl ?? "",
          points: createdRedemption.pointsCost,
          date: toDateString(createdRedemption.createdAt),
          status: redemptionStatusToApi(createdRedemption.status),
        },
      };
    });
  }

  async updateRedemptionStatus(redemptionCode: string, status?: string, issuerId?: string) {
    const updated = await this.prisma.redemption.update({
      where: { redemptionCode },
      data: {
        status: apiToRedemptionStatus(status),
        issuedAt: status === "Issued" ? new Date() : null,
        issuedById: status === "Issued" ? issuerId ?? null : null,
      },
      include: {
        user: { select: { username: true } },
        product: { select: { productCode: true, name: true, imageUrl: true } },
      },
    });

    return {
      id: updated.redemptionCode,
      userId: updated.userId,
      username: updated.user.username,
      productId: updated.product.productCode,
      productName: updated.product.name,
      productImage: updated.product.imageUrl ?? "",
      points: updated.pointsCost,
      date: toDateString(updated.createdAt),
      status: redemptionStatusToApi(updated.status),
    };
  }
}
