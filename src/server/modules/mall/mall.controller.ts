import express from "express";
import { getRequestAuthUser } from "../../middlewares/auth.ts";
import { sendError } from "../../shared/errors.ts";
import {
  validateCreateProductPayload,
  validateCreateRedemptionPayload,
  validateUpdateProductPayload,
} from "../../validators/mall.ts";
import { MallService } from "./mall.service.ts";

export function createMallController(service: MallService) {
  const listProducts: express.RequestHandler = async (_req, res) => {
    try {
      const products = await service.listProducts();
      return res.json(products);
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "获取商品失败");
    }
  };

  const createProduct: express.RequestHandler = async (req, res) => {
    try {
      const validated = validateCreateProductPayload(req.body);
      if (validated.ok === false) {
        return sendError(res, 400, "BAD_REQUEST", "商品参数校验失败", validated.issues);
      }

      const product = await service.createProduct(validated.data);
      return res.json({ success: true, product });
    } catch {
      return sendError(res, 400, "BAD_REQUEST", "商品创建失败");
    }
  };

  const updateProduct: express.RequestHandler = async (req, res) => {
    try {
      const validated = validateUpdateProductPayload(req.body);
      if (validated.ok === false) {
        return sendError(res, 400, "BAD_REQUEST", "商品参数校验失败", validated.issues);
      }

      const product = await service.updateProduct(req.params.id, validated.data);
      return res.json({ success: true, product });
    } catch (error) {
      const err = error as Error;
      if (err.message === "NOT_FOUND") {
        return sendError(res, 404, "NOT_FOUND", "商品不存在");
      }
      return sendError(res, 400, "BAD_REQUEST", "商品更新失败");
    }
  };

  const deleteProduct: express.RequestHandler = async (req, res) => {
    try {
      await service.deleteProduct(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      const err = error as Error;
      if (err.message === "NOT_FOUND") {
        return sendError(res, 404, "NOT_FOUND", "商品不存在");
      }
      if (err.message === "CONFLICT") {
        return sendError(res, 409, "CONFLICT", "商品已有兑换记录，无法删除，请改为下架");
      }
      return sendError(res, 400, "BAD_REQUEST", "商品删除失败");
    }
  };

  const listRedemptions: express.RequestHandler = async (req, res) => {
    try {
      const authUser = getRequestAuthUser(req);
      if (!authUser) return sendError(res, 401, "UNAUTHORIZED", "未登录");

      const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
      const redemptions = await service.listRedemptions(authUser, userId);
      return res.json(redemptions);
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "获取兑换记录失败");
    }
  };

  const createRedemption: express.RequestHandler = async (req, res) => {
    try {
      const authUser = getRequestAuthUser(req);
      if (!authUser) return sendError(res, 401, "UNAUTHORIZED", "未登录");

      const validated = validateCreateRedemptionPayload(req.body);
      if (validated.ok === false) {
        return sendError(res, 400, "BAD_REQUEST", "兑换参数校验失败", validated.issues);
      }

      const result = await service.createRedemption(authUser, validated.data);
      return res.json({ success: true, redemption: result.redemption, userPoints: result.userPoints });
    } catch (error) {
      const err = error as Error;
      if (err.message === "FORBIDDEN_ROLE") {
        return sendError(res, 403, "FORBIDDEN", "管理员和审核员不支持积分兑换");
      }
      if (err.message === "FORBIDDEN") {
        return sendError(res, 403, "FORBIDDEN", "仅可为本人发起兑换");
      }
      if (err.message === "NOT_FOUND") {
        return sendError(res, 404, "NOT_FOUND", "用户或商品不存在");
      }
      if (err.message === "OUT_OF_STOCK") {
        return sendError(res, 400, "BAD_REQUEST", "库存不足或商品已下架");
      }
      if (err.message === "INSUFFICIENT_POINTS") {
        return sendError(res, 400, "BAD_REQUEST", "积分不足");
      }
      return sendError(res, 500, "INTERNAL_ERROR", "兑换失败");
    }
  };

  const updateRedemptionStatus: express.RequestHandler = async (req, res) => {
    try {
      const { status } = req.body as { status?: string };
      const redemption = await service.updateRedemptionStatus(
        req.params.id,
        status,
        status === "Issued" ? getRequestAuthUser(req)?.id : undefined,
      );

      return res.json({ success: true, redemption });
    } catch {
      return sendError(res, 404, "NOT_FOUND", "兑换记录不存在");
    }
  };

  return {
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    listRedemptions,
    createRedemption,
    updateRedemptionStatus,
  };
}
