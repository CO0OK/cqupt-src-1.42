import express from "express";
import { PrismaClient } from "@prisma/client";
import { type AuthRole } from "../../middlewares/auth.ts";
import { type EmailCodesService } from "../email-codes/email-codes.service.ts";
import { createUsersController } from "./users.controller.ts";
import { UsersService } from "./users.service.ts";

type RequireAuth = express.RequestHandler;
type RequireRoles = (...roles: AuthRole[]) => express.RequestHandler;

export function createUsersRouter(options: {
  prisma: PrismaClient;
  requireAuth: RequireAuth;
  requireRoles: RequireRoles;
  emailCodesService: EmailCodesService;
}) {
  const router = express.Router();
  const service = new UsersService(options.prisma);
  const controller = createUsersController(service, options.emailCodesService, options.prisma);

  router.get("/leaderboard", options.requireAuth, controller.listLeaderboard);
  router.patch("/me/profile", options.requireAuth, controller.updateSelfProfile);
  router.patch("/me/password", options.requireAuth, controller.updateSelfPassword);
  router.patch("/profile", options.requireAuth, controller.updateSelfProfile);
  router.patch("/password", options.requireAuth, controller.updateSelfPassword);

  router.get("/", options.requireAuth, options.requireRoles("admin"), controller.listUsers);
  router.post("/", options.requireAuth, options.requireRoles("admin"), controller.createUser);
  router.patch("/:id", options.requireAuth, options.requireRoles("admin"), controller.updateUser);
  router.delete("/:id", options.requireAuth, options.requireRoles("admin"), controller.deleteUser);
  router.post("/:id/reset-password", options.requireAuth, options.requireRoles("admin"), controller.resetPassword);
  router.post("/:id/sign-agreement", options.requireAuth, controller.signAgreement);

  return router;
}
