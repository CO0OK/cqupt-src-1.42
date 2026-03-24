import express from "express";
import { PrismaClient } from "@prisma/client";
import { VulnerabilitiesService } from "./vulnerabilities.service.ts";
import { createVulnerabilitiesController } from "./vulnerabilities.controller.ts";

type RouteDeps = {
  prisma: PrismaClient;
  requireAuth: express.RequestHandler;
  requireRoles: (...roles: ("admin" | "auditor" | "user")[]) => express.RequestHandler;
};

export function createVulnerabilitiesRouter({ prisma, requireAuth, requireRoles }: RouteDeps): express.Router {
  const router = express.Router();
  const service = new VulnerabilitiesService(prisma);
  const controller = createVulnerabilitiesController(service, prisma);

  router.get("/", controller.listVulnerabilities);
  router.get("/:id/attachment", requireAuth, controller.getVulnerabilityAttachment);
  router.post("/", requireAuth, controller.createVulnerability);
  router.patch("/:id", requireAuth, requireRoles("admin", "auditor"), controller.updateVulnerability);

  return router;
}
