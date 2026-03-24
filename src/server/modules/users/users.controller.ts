import express from "express";
import { PrismaClient } from "@prisma/client";
import { getRequestAuthUser } from "../../middlewares/auth.ts";
import { sendError } from "../../shared/errors.ts";
import { buildRequestLogMeta, writeActivityLog } from "../../shared/activity-log.ts";
import { type EmailCodesService } from "../email-codes/email-codes.service.ts";
import { validatePasswordPolicy } from "../../validators/password.ts";
import { UsersService } from "./users.service.ts";

export function createUsersController(
  service: UsersService,
  emailCodesService: EmailCodesService,
  prisma: PrismaClient,
) {
  const listLeaderboard: express.RequestHandler = async (req, res) => {
    try {
      const authUser = getRequestAuthUser(req);
      if (!authUser) return sendError(res, 401, "UNAUTHORIZED", "未登录");

      const rawLimit = Number(req.query.limit);
      const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.floor(rawLimit))) : 50;
      const leaderboard = await service.listLeaderboard(authUser.id, limit);
      return res.json({ success: true, leaderboard });
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "获取排行榜失败");
    }
  };

  const validateAvatarDataUrl = (raw: string): boolean => {
    const supportedPrefix = /^data:(image\/png|image\/jpeg);base64,/;
    if (!supportedPrefix.test(raw)) return false;
    const idx = raw.indexOf("base64,");
    if (idx < 0) return false;
    const base64 = raw.slice(idx + "base64,".length);
    if (!/^[A-Za-z0-9+/=]+$/.test(base64)) return false;
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    const bytes = Math.floor((base64.length * 3) / 4) - padding;
    return bytes > 0 && bytes <= 2 * 1024 * 1024;
  };

  const listUsers: express.RequestHandler = async (_req, res) => {
    try {
      const users = await service.listUsers();
      return res.json(users);
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "获取用户失败");
    }
  };

  const createUser: express.RequestHandler = async (req, res) => {
    try {
      const authUser = getRequestAuthUser(req);
      const { username, email, role, authCode, points, status } = req.body as Record<string, unknown>;
      const result = await service.createUser({
        username: String(username ?? ""),
        email: String(email ?? ""),
        role: typeof role === "string" ? role : undefined,
        authCode: String(authCode ?? ""),
        points,
        status: typeof status === "string" ? status : undefined,
      });

      const meta = buildRequestLogMeta(req);
      await writeActivityLog(prisma, {
        actorId: authUser?.id,
        action: "user.created",
        targetType: "user",
        targetId: result.user.id,
        detail: `创建账号 ${result.user.username}，角色 ${result.user.role}`,
        status: "success",
        ...meta,
      });
      return res.status(201).json({ success: true, user: result.user, initialPassword: result.initialPassword });
    } catch (error) {
      const err = error as Error;
      if (err.message === "INVALID_AUTH_CODE") {
        return sendError(res, 400, "BAD_REQUEST", "统一认证码需为7位数字");
      }
      return sendError(res, 400, "BAD_REQUEST", "用户创建失败（可能存在重复字段）");
    }
  };

  const updateUser: express.RequestHandler = async (req, res) => {
    try {
      const authUser = getRequestAuthUser(req);
      const roleChanged = typeof (req.body as Record<string, unknown>).role === "string";
      const user = await service.updateUser(req.params.id, req.body as Record<string, unknown>);

      const meta = buildRequestLogMeta(req);
      await writeActivityLog(prisma, {
        actorId: authUser?.id,
        action: roleChanged ? "user.role.changed" : "user.updated",
        targetType: "user",
        targetId: user.id,
        detail: roleChanged ? `更新用户角色为 ${user.role}` : `更新用户资料 ${user.username}`,
        status: "success",
        ...meta,
      });
      return res.json({ success: true, user });
    } catch (error) {
      const err = error as Error;
      if (err.message === "INVALID_AUTH_CODE") {
        return sendError(res, 400, "BAD_REQUEST", "统一认证码需为7位数字");
      }
      return sendError(res, 404, "NOT_FOUND", "用户不存在或更新失败");
    }
  };

  const deleteUser: express.RequestHandler = async (req, res) => {
    try {
      const authUser = getRequestAuthUser(req);
      await service.deleteUser(req.params.id);
      const meta = buildRequestLogMeta(req);
      await writeActivityLog(prisma, {
        actorId: authUser?.id,
        action: "user.deleted",
        targetType: "user",
        targetId: req.params.id,
        detail: "删除用户账号",
        status: "warning",
        ...meta,
      });
      return res.json({ success: true });
    } catch {
      return sendError(res, 404, "NOT_FOUND", "用户不存在");
    }
  };

  const resetPassword: express.RequestHandler = async (req, res) => {
    try {
      const authUser = getRequestAuthUser(req);
      const { newPassword } = req.body as { newPassword?: string };
      const provided = typeof newPassword === "string" ? newPassword.trim() : "";
      if (!provided) return sendError(res, 400, "BAD_REQUEST", "请填写新密码");
      const issue = validatePasswordPolicy(provided);
      if (issue) return sendError(res, 400, "BAD_REQUEST", issue);

      await service.resetPassword(req.params.id, provided);
      const meta = buildRequestLogMeta(req);
      await writeActivityLog(prisma, {
        actorId: authUser?.id,
        action: "user.password.reset",
        targetType: "user",
        targetId: req.params.id,
        detail: "管理员重置用户密码",
        status: "warning",
        ...meta,
      });
      return res.json({ success: true, message: "密码重置成功" });
    } catch {
      return sendError(res, 404, "NOT_FOUND", "用户不存在");
    }
  };

  const signAgreement: express.RequestHandler = async (req, res) => {
    try {
      const authUser = getRequestAuthUser(req);
      if (!authUser) {
        return sendError(res, 401, "UNAUTHORIZED", "未登录");
      }
      if (authUser.role !== "admin" && authUser.id !== req.params.id) {
        return sendError(res, 403, "FORBIDDEN", "权限不足");
      }

      const user = await service.signAgreement(req.params.id);
      const meta = buildRequestLogMeta(req);
      await writeActivityLog(prisma, {
        actorId: authUser.id,
        action: "user.agreement.signed",
        targetType: "user",
        targetId: user.id,
        detail: `签署协议: ${user.username}`,
        status: "info",
        ...meta,
      });
      return res.json({ success: true, user });
    } catch {
      return sendError(res, 404, "NOT_FOUND", "用户不存在");
    }
  };

  const updateSelfProfile: express.RequestHandler = async (req, res) => {
    try {
      const authUser = getRequestAuthUser(req);
      if (!authUser) return sendError(res, 401, "UNAUTHORIZED", "未登录");

      const body = req.body as Record<string, unknown>;
      const username = typeof body.username === "string" ? body.username.trim() : undefined;
      const email = typeof body.email === "string" ? body.email.trim() : undefined;
      const avatar = typeof body.avatar === "string" ? body.avatar : undefined;

      if (username !== undefined && (username.length < 2 || username.length > 50)) {
        return sendError(res, 400, "BAD_REQUEST", "用户名长度需在 2-50 之间");
      }
      if (email !== undefined) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email) || email.length > 120) {
          return sendError(res, 400, "BAD_REQUEST", "邮箱格式不合法");
        }
      }
      if (avatar !== undefined && !validateAvatarDataUrl(avatar)) {
        return sendError(res, 400, "BAD_REQUEST", "头像格式仅支持 PNG/JPG，且大小不超过 2MB");
      }

      const user = await service.updateSelfProfile(authUser.id, { username, email, avatar });
      const meta = buildRequestLogMeta(req);
      await writeActivityLog(prisma, {
        actorId: authUser.id,
        action: "user.profile.updated",
        targetType: "user",
        targetId: authUser.id,
        detail: `更新个人资料: ${user.username}`,
        status: "info",
        ...meta,
      });
      return res.json({ success: true, user });
    } catch {
      return sendError(res, 400, "BAD_REQUEST", "个人资料更新失败（可能存在重复字段）");
    }
  };

  const updateSelfPassword: express.RequestHandler = async (req, res) => {
    try {
      const authUser = getRequestAuthUser(req);
      if (!authUser) return sendError(res, 401, "UNAUTHORIZED", "未登录");

      const { currentPassword, newPassword, confirmPassword, emailCode } = req.body as {
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
        emailCode?: string;
      };

      if (!currentPassword || !newPassword || !confirmPassword || !emailCode) {
        return sendError(res, 400, "BAD_REQUEST", "请填写完整密码信息");
      }
      if (newPassword !== confirmPassword) {
        return sendError(res, 400, "BAD_REQUEST", "两次输入的新密码不一致");
      }
      const passwordIssue = validatePasswordPolicy(newPassword);
      if (passwordIssue) return sendError(res, 400, "BAD_REQUEST", passwordIssue);
      if (newPassword === currentPassword) {
        return sendError(res, 400, "BAD_REQUEST", "新密码不能与旧密码相同");
      }

      try {
        await emailCodesService.verify(authUser.email, "change_password", emailCode, true);
      } catch (error) {
        const err = error as Error;
        if (err.message === "CODE_NOT_FOUND") {
          return sendError(res, 400, "BAD_REQUEST", "请先获取邮箱验证码");
        }
        if (err.message === "CODE_EXPIRED") {
          return sendError(res, 400, "BAD_REQUEST", "邮箱验证码已过期，请重新获取");
        }
        if (err.message === "CODE_INVALID") {
          return sendError(res, 400, "BAD_REQUEST", "邮箱验证码错误");
        }
        return sendError(res, 500, "INTERNAL_ERROR", "验证码校验失败");
      }

      await service.changeSelfPassword(authUser.id, currentPassword, newPassword);
      const meta = buildRequestLogMeta(req);
      await writeActivityLog(prisma, {
        actorId: authUser.id,
        action: "user.password.changed",
        targetType: "user",
        targetId: authUser.id,
        detail: "用户修改个人密码",
        status: "warning",
        ...meta,
      });
      return res.json({ success: true, message: "密码修改成功" });
    } catch (error) {
      const err = error as Error;
      if (err.message === "INVALID_CURRENT_PASSWORD") {
        return sendError(res, 400, "BAD_REQUEST", "当前密码错误");
      }
      if (err.message === "NOT_FOUND") {
        return sendError(res, 404, "NOT_FOUND", "用户不存在");
      }
      return sendError(res, 500, "INTERNAL_ERROR", "密码修改失败");
    }
  };

  return {
    listLeaderboard,
    listUsers,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    signAgreement,
    updateSelfProfile,
    updateSelfPassword,
  };
}
