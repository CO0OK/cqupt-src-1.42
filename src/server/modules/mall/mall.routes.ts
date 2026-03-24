import express from "express";
import { PrismaClient } from "@prisma/client";
import { MallService } from "./mall.service.ts";
import { createMallController } from "./mall.controller.ts";

type RouteDeps = {
  prisma: PrismaClient;
  requireAuth: express.RequestHandler;
  requireRoles: (...roles: ("admin" | "auditor" | "user")[]) => express.RequestHandler;
};

export function createMallRouter({ prisma, requireAuth, requireRoles }: RouteDeps): express.Router {
  const router = express.Router();
  const service = new MallService(prisma);
  const controller = createMallController(service);

  router.get("/products", controller.listProducts);
  router.post("/products", requireAuth, requireRoles("admin"), controller.createProduct);
  router.patch("/products/:id", requireAuth, requireRoles("admin"), controller.updateProduct);
  router.delete("/products/:id", requireAuth, requireRoles("admin"), controller.deleteProduct);

  router.get("/redemptions", requireAuth, controller.listRedemptions);
  router.post("/redemptions", requireAuth, controller.createRedemption);
  router.patch("/redemptions/:id", requireAuth, requireRoles("admin"), controller.updateRedemptionStatus);

  return router;
}
