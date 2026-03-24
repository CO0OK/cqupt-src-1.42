import express from "express";
import { PrismaClient } from "@prisma/client";
import { type AuthRole } from "../../middlewares/auth.ts";
import { createLearningController } from "./learning.controller.ts";
import { LearningService } from "./learning.service.ts";

type RequireAuth = express.RequestHandler;
type RequireRoles = (...roles: AuthRole[]) => express.RequestHandler;

export function createLearningRouter(options: {
  prisma: PrismaClient;
  requireAuth: RequireAuth;
  requireRoles: RequireRoles;
}) {
  const router = express.Router();
  const service = new LearningService(options.prisma);
  const controller = createLearningController(service);

  router.get("/labs", controller.listLabs);
  router.get("/materials", controller.listMaterials);
  router.get("/discussions", controller.listDiscussions);

  router.post("/labs", options.requireAuth, options.requireRoles("admin", "auditor"), controller.createLab);
  router.put("/labs/:id", options.requireAuth, options.requireRoles("admin", "auditor"), controller.updateLab);
  router.delete("/labs/:id", options.requireAuth, options.requireRoles("admin", "auditor"), controller.deleteLab);

  router.post("/materials", options.requireAuth, options.requireRoles("admin", "auditor"), controller.createMaterial);
  router.put("/materials/:id", options.requireAuth, options.requireRoles("admin", "auditor"), controller.updateMaterial);
  router.delete(
    "/materials/:id",
    options.requireAuth,
    options.requireRoles("admin", "auditor"),
    controller.deleteMaterial,
  );

  router.post("/discussions", options.requireAuth, controller.createDiscussion);
  router.delete(
    "/discussions/:id",
    options.requireAuth,
    options.requireRoles("admin", "auditor"),
    controller.deleteDiscussion,
  );

  return router;
}
