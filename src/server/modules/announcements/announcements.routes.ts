import express from "express";
import { PrismaClient } from "@prisma/client";
import { type AuthRole } from "../../middlewares/auth.ts";
import { createAnnouncementsController } from "./announcements.controller.ts";
import { AnnouncementsService } from "./announcements.service.ts";

type RequireAuth = express.RequestHandler;
type RequireRoles = (...roles: AuthRole[]) => express.RequestHandler;

export function createAnnouncementsRouter(options: {
  prisma: PrismaClient;
  requireAuth: RequireAuth;
  requireRoles: RequireRoles;
}) {
  const router = express.Router();
  const service = new AnnouncementsService(options.prisma);
  const controller = createAnnouncementsController(service);

  router.get("/", controller.listAnnouncements);
  router.post("/", options.requireAuth, options.requireRoles("admin", "auditor"), controller.createAnnouncement);
  router.delete("/:id", options.requireAuth, options.requireRoles("admin", "auditor"), controller.deleteAnnouncement);
  router.put("/:id", options.requireAuth, options.requireRoles("admin", "auditor"), controller.updateAnnouncement);

  return router;
}
