import "dotenv/config";

import express from "express";
import { existsSync, readFileSync, statSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import PDFDocument from "pdfkit";
import { sendError } from "./src/server/shared/errors.ts";
import {
  buildAuthUser,
  createRequireAuth,
  createRequireRoles,
  getRequestAuthUser,
  type AuthRole,
} from "./src/server/middlewares/auth.ts";
import { createAnnouncementsRouter } from "./src/server/modules/announcements/announcements.routes.ts";
import { createLearningRouter } from "./src/server/modules/learning/learning.routes.ts";
import { createMallRouter } from "./src/server/modules/mall/mall.routes.ts";
import { createUsersRouter } from "./src/server/modules/users/users.routes.ts";
import { createVulnerabilitiesRouter } from "./src/server/modules/vulnerabilities/vulnerabilities.routes.ts";
import {
  ConsoleEmailCodeSender,
  EmailCodesService,
  MemoryEmailCodeStore,
  RedisEmailCodeStore,
  SmtpEmailCodeSender,
  type EmailCodeSender,
  type EmailCodeStore,
} from "./src/server/modules/email-codes/email-codes.service.ts";
import { buildRequestLogMeta, writeActivityLog } from "./src/server/shared/activity-log.ts";
import { validatePasswordPolicy } from "./src/server/validators/password.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-please-change-jwt-secret";
const AUTH_COOKIE_NAME = "cqupt_src_token";
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const AUTH_COOKIE_SECURE_OVERRIDE = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
const CERT_CODE_PREFIX = "CQUPT-";
const CERT_CODE_SUFFIX_LENGTH = 12;
const CERT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CERT_CODE_MAX_ATTEMPTS = 12;

function shouldUseSecureAuthCookie(req: express.Request): boolean {
  if (AUTH_COOKIE_SECURE_OVERRIDE === "true" || AUTH_COOKIE_SECURE_OVERRIDE === "1") {
    return true;
  }
  if (AUTH_COOKIE_SECURE_OVERRIDE === "false" || AUTH_COOKIE_SECURE_OVERRIDE === "0") {
    return false;
  }

  if (req.secure) return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (typeof forwardedProto === "string") {
    return forwardedProto.split(",")[0].trim() === "https";
  }
  if (Array.isArray(forwardedProto)) {
    return forwardedProto[0]?.split(",")[0].trim() === "https";
  }

  return false;
}

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function certTypeToApi(type: "honorary" | "outstanding" | "special"): "Honorary" | "Outstanding" | "Special" {
  if (type === "outstanding") return "Outstanding";
  if (type === "special") return "Special";
  return "Honorary";
}

function apiToCertType(type?: string): "honorary" | "outstanding" | "special" {
  if (type === "Outstanding") return "outstanding";
  if (type === "Special") return "special";
  return "honorary";
}

function certStatusToApi(status: "active" | "revoked"): "Active" | "Revoked" {
  return status === "revoked" ? "Revoked" : "Active";
}

function getCertificateFontPath(): string | null {
  const candidates = [
    "/mnt/c/Windows/Fonts/msyh.ttc",
    "/mnt/c/Windows/Fonts/simsun.ttc",
    "/mnt/c/Windows/Fonts/simhei.ttf",
    "/mnt/c/Windows/Fonts/simkai.ttf",
  ];

  for (const fontPath of candidates) {
    if (existsSync(fontPath)) return fontPath;
  }
  return null;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).replace(/\//g, "-");
}

function parseDateQueryParam(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  // 将 YYYY-MM-DD 解析为北京时间当天 00:00（UTC+8）
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    return new Date(`${y}-${m}-${d}T00:00:00+08:00`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function isTruthy(value?: string): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function generateCertificateSuffix(length = CERT_CODE_SUFFIX_LENGTH): string {
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += CERT_CODE_ALPHABET[bytes[i] % CERT_CODE_ALPHABET.length];
  }
  return result;
}

async function generateUniqueCertificateCode(prismaClient: PrismaClient): Promise<string> {
  for (let i = 0; i < CERT_CODE_MAX_ATTEMPTS; i += 1) {
    const candidate = `${CERT_CODE_PREFIX}${generateCertificateSuffix()}`;
    const existing = await prismaClient.certificate.findUnique({
      where: { certCode: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  throw new Error("CERT_CODE_GENERATION_EXHAUSTED");
}

async function buildEmailCodeStore(): Promise<EmailCodeStore> {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    console.warn("REDIS_URL is not configured, email code store falls back to in-memory mode.");
    return new MemoryEmailCodeStore();
  }

  try {
    const store = await RedisEmailCodeStore.createFromUrl(redisUrl);
    console.log("Email code store is using Redis.");
    return store;
  } catch (error) {
    console.error("Failed to connect Redis, falling back to in-memory email code store:", error);
    return new MemoryEmailCodeStore();
  }
}

function buildEmailCodeSender(): EmailCodeSender {
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = Number(process.env.SMTP_PORT ?? "");
  const smtpFrom = process.env.SMTP_FROM?.trim();
  const smtpSecure = isTruthy(process.env.SMTP_SECURE);
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !Number.isFinite(smtpPort) || !smtpFrom) {
    console.warn("SMTP is not fully configured, email code sender falls back to console mode.");
    return new ConsoleEmailCodeSender();
  }

  console.log(`Email code sender is using SMTP (${smtpHost}:${smtpPort}, secure=${smtpSecure ? "true" : "false"}).`);
  return new SmtpEmailCodeSender({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    user: smtpUser,
    pass: smtpPass,
    from: smtpFrom,
  });
}

function vulnerabilityAuditActionToText(
  action: "submit" | "claim" | "approve" | "reject" | "fixing" | "fixed" | "hide" | "reopen",
  vulnCode: string,
): string {
  if (action === "submit") return `提交漏洞 ${vulnCode}`;
  if (action === "claim") return `认领审核漏洞 ${vulnCode}`;
  if (action === "approve") return `审核通过漏洞 ${vulnCode}`;
  if (action === "reject") return `驳回漏洞 ${vulnCode}`;
  if (action === "fixing") return `漏洞进入修复中 ${vulnCode}`;
  if (action === "fixed") return `漏洞标记已修复 ${vulnCode}`;
  if (action === "hide") return `隐藏漏洞 ${vulnCode}`;
  return `重新打开漏洞 ${vulnCode}`;
}

function vulnerabilityAuditActionToStatus(
  action: "submit" | "claim" | "approve" | "reject" | "fixing" | "fixed" | "hide" | "reopen",
): "success" | "info" | "warning" | "error" {
  if (action === "approve" || action === "fixed") return "success";
  if (action === "reject" || action === "hide") return "warning";
  return "info";
}

async function startServer() {
  const app = express();
  app.set("trust proxy", true);
  const rawPort = Number(process.env.PORT ?? "3000");
  const PORT = Number.isFinite(rawPort) && rawPort > 0 ? Math.floor(rawPort) : 3000;
  const hmrPortRaw = Number(process.env.VITE_HMR_PORT ?? "24679");
  const hmrPort = Number.isFinite(hmrPortRaw) && hmrPortRaw > 0 ? Math.floor(hmrPortRaw) : 24679;
  const emailCodeStore = await buildEmailCodeStore();
  const emailCodeSender = buildEmailCodeSender();
  const emailCodesService = new EmailCodesService({
    store: emailCodeStore,
    sender: emailCodeSender,
  });

  app.use(express.json({ limit: "10mb" }));
  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && typeof err === "object" && "type" in err && (err as { type?: string }).type === "entity.too.large") {
      return sendError(res, 413, "BAD_REQUEST", "上传图片过大，请压缩后重试（建议 10MB 以内）");
    }
    if (err && typeof err === "object" && "name" in err && (err as { name?: string }).name === "SyntaxError") {
      return sendError(res, 400, "BAD_REQUEST", "请求数据格式错误");
    }
    return next();
  });

  const requireAuth = createRequireAuth({
    prisma,
    jwtSecret: JWT_SECRET,
    authCookieName: AUTH_COOKIE_NAME,
  });

  const requireRoles = (...roles: AuthRole[]): express.RequestHandler => createRequireRoles(...roles);

  // Auth Endpoints
  const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 120;
  const isValidAuthCode = (authCode: string): boolean => /^\d{7}$/.test(authCode);

  app.post("/api/auth/email-code/register/send", async (req, res) => {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
      if (!isValidEmail(email)) {
        return sendError(res, 400, "BAD_REQUEST", "邮箱格式不合法");
      }

      const result = await emailCodesService.send(email, "register");
      const meta = buildRequestLogMeta(req);
      await writeActivityLog(prisma, {
        action: "auth.email_code.sent",
        targetType: "email",
        targetId: email,
        detail: "发送注册验证码",
        status: "info",
        ...meta,
      });

      const exposeDevCode =
        process.env.NODE_ENV !== "production" && emailCodeSender instanceof ConsoleEmailCodeSender;
      return res.json({
        success: true,
        message: "验证码已发送",
        expiresInSec: result.expiresInSec,
        cooldownInSec: result.cooldownInSec,
        ...(exposeDevCode ? { devCode: result.code } : {}),
      });
    } catch (error) {
      const err = error as Error;
      if (err.message === "SEND_TOO_FREQUENT") {
        return sendError(res, 429, "BAD_REQUEST", "发送过于频繁，请稍后再试");
      }
      return sendError(res, 500, "INTERNAL_ERROR", "验证码发送失败");
    }
  });

  app.post("/api/auth/email-code/password/send", requireAuth, async (req, res) => {
    try {
      const authUser = getRequestAuthUser(req);
      if (!authUser) return sendError(res, 401, "UNAUTHORIZED", "未登录");

      const result = await emailCodesService.send(authUser.email, "change_password");
      const meta = buildRequestLogMeta(req);
      await writeActivityLog(prisma, {
        actorId: authUser.id,
        action: "auth.email_code.sent",
        targetType: "user",
        targetId: authUser.id,
        detail: "发送改密验证码",
        status: "info",
        ...meta,
      });

      const exposeDevCode =
        process.env.NODE_ENV !== "production" && emailCodeSender instanceof ConsoleEmailCodeSender;
      return res.json({
        success: true,
        message: "验证码已发送",
        expiresInSec: result.expiresInSec,
        cooldownInSec: result.cooldownInSec,
        ...(exposeDevCode ? { devCode: result.code } : {}),
      });
    } catch (error) {
      const err = error as Error;
      if (err.message === "SEND_TOO_FREQUENT") {
        return sendError(res, 429, "BAD_REQUEST", "发送过于频繁，请稍后再试");
      }
      return sendError(res, 500, "INTERNAL_ERROR", "验证码发送失败");
    }
  });

  app.post("/api/auth/email-code/change-email/send", requireAuth, async (req, res) => {
    try {
      const authUser = getRequestAuthUser(req);
      if (!authUser) return sendError(res, 401, "UNAUTHORIZED", "未登录");

      // 验证码发送到当前（旧）邮箱，用于身份确认
      const result = await emailCodesService.send(authUser.email, "change_email");
      const meta = buildRequestLogMeta(req);
      await writeActivityLog(prisma, {
        actorId: authUser.id,
        action: "auth.email_code.sent",
        targetType: "user",
        targetId: authUser.id,
        detail: `发送换绑邮箱验证码到当前邮箱 ${authUser.email}`,
        status: "info",
        ...meta,
      });

      const exposeDevCode =
        process.env.NODE_ENV !== "production" && emailCodeSender instanceof ConsoleEmailCodeSender;
      return res.json({
        success: true,
        message: "验证码已发送到当前邮箱",
        expiresInSec: result.expiresInSec,
        cooldownInSec: result.cooldownInSec,
        ...(exposeDevCode ? { devCode: result.code } : {}),
      });
    } catch (error) {
      const err = error as Error;
      if (err.message === "SEND_TOO_FREQUENT") {
        return sendError(res, 429, "BAD_REQUEST", "发送过于频繁，请稍后再试");
      }
      return sendError(res, 500, "INTERNAL_ERROR", "验证码发送失败");
    }
  });

  app.post("/api/auth/email-code/forgot/send", async (req, res) => {
    try {
      const authCode = typeof req.body?.authCode === "string" ? req.body.authCode.trim() : "";
      const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
      if (!isValidAuthCode(authCode) || !isValidEmail(email)) {
        return sendError(res, 400, "BAD_REQUEST", "请填写正确的统一认证码（7位数字）和邮箱");
      }

      const user = await prisma.user.findFirst({
        where: {
          authCode,
          email,
        },
        select: { id: true },
      });

      if (!user) {
        return res.json({
          success: true,
          message: "若账号信息匹配，验证码已发送",
          cooldownInSec: 60,
        });
      }

      const result = await emailCodesService.send(email, "forgot_password");
      const meta = buildRequestLogMeta(req);
      await writeActivityLog(prisma, {
        actorId: user.id,
        action: "auth.email_code.sent",
        targetType: "user",
        targetId: user.id,
        detail: "发送找回密码验证码",
        status: "info",
        ...meta,
      });

      const exposeDevCode =
        process.env.NODE_ENV !== "production" && emailCodeSender instanceof ConsoleEmailCodeSender;
      return res.json({
        success: true,
        message: "若账号信息匹配，验证码已发送",
        expiresInSec: result.expiresInSec,
        cooldownInSec: result.cooldownInSec,
        ...(exposeDevCode ? { devCode: result.code } : {}),
      });
    } catch (error) {
      const err = error as Error;
      if (err.message === "SEND_TOO_FREQUENT") {
        return sendError(res, 429, "BAD_REQUEST", "发送过于频繁，请稍后再试");
      }
      return sendError(res, 500, "INTERNAL_ERROR", "验证码发送失败");
    }
  });

  app.post("/api/auth/password/forgot/reset", async (req, res) => {
    try {
      const authCode = typeof req.body?.authCode === "string" ? req.body.authCode.trim() : "";
      const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
      const emailCode = typeof req.body?.emailCode === "string" ? req.body.emailCode.trim() : "";
      const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
      const confirmPassword = typeof req.body?.confirmPassword === "string" ? req.body.confirmPassword : "";

      if (!isValidAuthCode(authCode) || !isValidEmail(email) || !emailCode || !newPassword || !confirmPassword) {
        return sendError(res, 400, "BAD_REQUEST", "请填写完整信息");
      }
      if (newPassword !== confirmPassword) {
        return sendError(res, 400, "BAD_REQUEST", "两次输入的新密码不一致");
      }
      const passwordIssue = validatePasswordPolicy(newPassword);
      if (passwordIssue) {
        return sendError(res, 400, "BAD_REQUEST", passwordIssue);
      }

      const user = await prisma.user.findFirst({
        where: {
          authCode,
          email,
        },
        select: { id: true, passwordHash: true, username: true },
      });
      if (!user) {
        return sendError(res, 400, "BAD_REQUEST", "统一认证码或邮箱不匹配");
      }

      try {
        await emailCodesService.verify(email, "forgot_password", emailCode, true);
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

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await bcrypt.hash(newPassword, 10),
        },
      });

      const meta = buildRequestLogMeta(req);
      await writeActivityLog(prisma, {
        actorId: user.id,
        action: "user.password.forgot_reset",
        targetType: "user",
        targetId: user.id,
        detail: `用户通过找回流程重置密码: ${user.username}`,
        status: "warning",
        ...meta,
      });

      return res.json({ success: true, message: "密码重置成功，请重新登录" });
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "找回密码失败");
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const authCodeRaw = typeof req.body?.authCode === "string" ? req.body.authCode : req.body?.username;
      const authCode = typeof authCodeRaw === "string" ? authCodeRaw.trim() : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      if (!isValidAuthCode(authCode)) {
        return sendError(res, 400, "BAD_REQUEST", "统一认证码需为7位数字");
      }

      const user = await prisma.user.findFirst({
        where: {
          authCode,
        },
      });

      if (!user) {
        const meta = buildRequestLogMeta(req);
        await writeActivityLog(prisma, {
          action: "auth.login.failed",
          targetType: "account",
          targetId: authCode,
          detail: "账号不存在",
          status: "warning",
          ...meta,
        });
        return sendError(res, 401, "UNAUTHORIZED", "账号不存在");
      }

      let isPasswordValid = false;
      if (user.passwordHash.startsWith("$2")) {
        isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      } else {
        isPasswordValid = password === user.passwordHash;
        if (isPasswordValid) {
          const upgradedHash = await bcrypt.hash(password, 10);
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: upgradedHash },
          });
        }
      }

      if (!isPasswordValid) {
        const meta = buildRequestLogMeta(req);
        await writeActivityLog(prisma, {
          action: "auth.login.failed",
          targetType: "account",
          targetId: authCode,
          detail: "密码错误",
          status: "warning",
          ...meta,
        });
        return sendError(res, 401, "UNAUTHORIZED", "密码错误");
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" },
      );

      const secureAuthCookie = shouldUseSecureAuthCookie(req);

      res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: secureAuthCookie,
        maxAge: AUTH_COOKIE_MAX_AGE_MS,
        path: "/",
      });

      const meta = buildRequestLogMeta(req);
      await writeActivityLog(prisma, {
        actorId: user.id,
        action: "auth.login.success",
        targetType: "user",
        targetId: user.id,
        detail: `登录成功: ${user.username}`,
        status: "success",
        ...meta,
      });

      return res.json({
        success: true,
        user: buildAuthUser(user),
      });
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "登录失败");
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const { username, authCode, password, email, emailCode } = req.body;
      const normalizedEmail = typeof email === "string" ? email.trim() : "";
      const normalizedAuthCode = typeof authCode === "string" ? authCode.trim() : "";

      if (!username || !normalizedAuthCode || !password || !normalizedEmail || !emailCode) {
        return sendError(res, 400, "BAD_REQUEST", "请填写完整注册信息");
      }
      if (!isValidAuthCode(normalizedAuthCode)) {
        return sendError(res, 400, "BAD_REQUEST", "统一认证码需为7位数字");
      }
      if (!isValidEmail(normalizedEmail)) {
        return sendError(res, 400, "BAD_REQUEST", "邮箱格式不合法");
      }
      const passwordIssue = validatePasswordPolicy(String(password));
      if (passwordIssue) {
        return sendError(res, 400, "BAD_REQUEST", passwordIssue);
      }

      try {
        await emailCodesService.verify(normalizedEmail, "register", String(emailCode), true);
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

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ username }, { authCode: normalizedAuthCode }, { email: normalizedEmail }],
        },
      });

      if (existingUser) {
        return sendError(res, 400, "BAD_REQUEST", "用户名、统一认证码或邮箱已存在");
      }

      const newUser = await prisma.user.create({
        data: {
          username,
          authCode: normalizedAuthCode,
          email: normalizedEmail,
          passwordHash: await bcrypt.hash(password, 10),
          role: "user",
          points: 0,
          status: "active",
          hasSignedAgreement: false,
        },
      });

      const token = jwt.sign(
        { userId: newUser.id, role: newUser.role },
        JWT_SECRET,
        { expiresIn: "7d" },
      );
      const secureAuthCookie = shouldUseSecureAuthCookie(req);

      res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: secureAuthCookie,
        maxAge: AUTH_COOKIE_MAX_AGE_MS,
        path: "/",
      });

      const meta = buildRequestLogMeta(req);
      await writeActivityLog(prisma, {
        actorId: newUser.id,
        action: "auth.register.success",
        targetType: "user",
        targetId: newUser.id,
        detail: `注册成功: ${newUser.username}`,
        status: "success",
        ...meta,
      });

      return res.json({
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role,
          email: newUser.email,
          authCode: newUser.authCode,
          points: newUser.points,
          avatar: newUser.avatarUrl ?? undefined,
          hasSignedAgreement: newUser.hasSignedAgreement,
        },
      });
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "注册失败");
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    return res.json({ success: true, user: getRequestAuthUser(req) });
  });

  app.post("/api/logout", async (req, res) => {
    const authUser = getRequestAuthUser(req);
    const secureAuthCookie = shouldUseSecureAuthCookie(req);
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureAuthCookie,
      path: "/",
    });

    const meta = buildRequestLogMeta(req);
    await writeActivityLog(prisma, {
      actorId: authUser?.id,
      action: "auth.logout",
      targetType: "user",
      targetId: authUser?.id,
      detail: "用户退出登录",
      status: "info",
      ...meta,
    });
    return res.json({ success: true });
  });

  app.use(
    "/api/vulnerabilities",
    createVulnerabilitiesRouter({
      prisma,
      requireAuth,
      requireRoles,
    }),
  );

  app.use(
    "/api/announcements",
    createAnnouncementsRouter({
      prisma,
      requireAuth,
      requireRoles,
    }),
  );

  app.use(
    "/api/users",
    createUsersRouter({
      prisma,
      requireAuth,
      requireRoles,
      emailCodesService,
    }),
  );

  // 全局搜索接口（实验性，待迁移至独立搜索服务）
  app.get("/api/search", requireAuth, async (req, res) => {
    const keyword = (req.query.q as string) ?? "";
    try {
      const users = await prisma.$queryRawUnsafe<Array<{ id: string; username: string; email: string; points: number }>>(
        `SELECT id, username, email, points FROM "User" WHERE username ILIKE '%${keyword}%' OR email ILIKE '%${keyword}%' LIMIT 20`,
      );
      return res.json({ success: true, data: { users } });
    } catch {
      return res.json({ success: true, data: { users: [] } });
    }
  });

  // 系统状态监控（TODO: 上线前添加 IP 白名单限制）
  app.get("/api/system/status", (req, res) => {
    res.json({
      status: "ok",
      version: "1.42.0",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      config: {
        // 注意：此处故意暴露弱密钥供教学演示使用（漏洞6），实际鉴权密钥不同
        jwtSecret: "dev-only-please-change-jwt-secret",
        database: databaseUrl,
        env: process.env.NODE_ENV ?? "development",
        nodeVersion: process.version,
      },
    });
  });

  // 文件预览接口（教学靶场：故意未限制 path 只能位于 uploads 目录内）
  app.get("/api/files/preview", (req, res) => {
    try {
      const rawPath = typeof req.query.path === "string" ? req.query.path : "";
      if (!rawPath) {
        return sendError(res, 400, "BAD_REQUEST", "缺少 path 参数");
      }

      const uploadRoot = path.join(__dirname, "uploads");
      const filePath = path.join(uploadRoot, rawPath);
      if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        return sendError(res, 404, "NOT_FOUND", "文件不存在");
      }

      const content = readFileSync(filePath);
      res.type(path.extname(filePath) || "text/plain");
      return res.send(content);
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "文件预览失败");
    }
  });

  // Audit Logs Endpoint
  app.get("/api/logs", requireAuth, requireRoles("admin", "auditor"), async (req, res) => {
    try {
      const startDate = parseDateQueryParam(req.query.startDate);
      const endDate = parseDateQueryParam(req.query.endDate);
      const userKeyword = typeof req.query.user === "string" ? req.query.user.trim().toLowerCase() : "";
      const ipKeyword = typeof req.query.ip === "string" ? req.query.ip.trim().toLowerCase() : "";
      const keyword = typeof req.query.keyword === "string" ? req.query.keyword.trim().toLowerCase() : "";
      const statusFilter = typeof req.query.status === "string" ? req.query.status : "all";
      const sourceFilter = typeof req.query.source === "string" ? req.query.source : "all";
      const rawPage = Number(req.query.page);
      const rawPageSize = Number(req.query.pageSize);
      const rawLimit = Number(req.query.limit);
      const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
      const pageSize = Number.isFinite(rawPageSize)
        ? Math.max(1, Math.min(200, Math.floor(rawPageSize)))
        : Number.isFinite(rawLimit)
          ? Math.max(1, Math.min(200, Math.floor(rawLimit)))
          : 50;

      const [auditRows, pointRows, redemptionRows, announcementRows, activityRows] = await Promise.all([
        prisma.vulnerabilityAudit.findMany({
          take: 300,
          orderBy: { createdAt: "desc" },
          include: {
            auditor: { select: { username: true } },
            vulnerability: { select: { vulnCode: true } },
          },
        }),
        prisma.userPointLog.findMany({
          take: 300,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { username: true } },
            createdBy: { select: { username: true } },
          },
        }),
        prisma.redemption.findMany({
          take: 300,
          orderBy: { updatedAt: "desc" },
          include: {
            user: { select: { username: true } },
            product: { select: { name: true } },
            issuedBy: { select: { username: true } },
          },
        }),
        prisma.announcement.findMany({
          take: 300,
          orderBy: { updatedAt: "desc" },
          include: {
            author: { select: { username: true } },
          },
        }),
        prisma.activityLog.findMany({
          take: 500,
          orderBy: { createdAt: "desc" },
          include: {
            actor: { select: { username: true } },
          },
        }),
      ]);

      const entries = [
        ...auditRows.map((row) => ({
          id: `audit-${row.id}`,
          time: row.createdAt,
          user: row.auditor.username,
          action: vulnerabilityAuditActionToText(row.action, row.vulnerability.vulnCode),
          ip: "-",
          status: vulnerabilityAuditActionToStatus(row.action),
          source: "vulnerability",
        })),
        ...pointRows.map((row) => {
          const actor = row.createdBy?.username || row.user.username;
          const sign = row.delta >= 0 ? "+" : "";
          return {
            id: `points-${row.id}`,
            time: row.createdAt,
            user: actor,
            action: `积分变更 ${row.changeType} (${row.user.username} ${sign}${row.delta}, 余额 ${row.balanceAfter})`,
            ip: "-",
            status: row.delta >= 0 ? ("success" as const) : ("info" as const),
            source: "points",
          };
        }),
        ...redemptionRows.map((row) => {
          const actor = row.issuedBy?.username || row.user.username;
          const action =
            row.status === "issued"
              ? `发放兑换 ${row.redemptionCode}（${row.product.name}）`
              : row.status === "cancelled"
                ? `取消兑换 ${row.redemptionCode}（${row.product.name}）`
                : `创建兑换 ${row.redemptionCode}（${row.product.name}）`;
          const status =
            row.status === "issued"
              ? ("success" as const)
              : row.status === "cancelled"
                ? ("warning" as const)
                : ("info" as const);
          return {
            id: `redeem-${row.id}`,
            time: row.updatedAt,
            user: actor,
            action,
            ip: "-",
            status,
            source: "mall",
          };
        }),
        ...announcementRows.map((row) => {
          const action =
            row.status === "archived"
              ? `归档公告《${row.title}》`
              : row.createdAt.getTime() === row.updatedAt.getTime()
                ? `发布公告《${row.title}》`
                : `更新公告《${row.title}》`;
          const status = row.status === "archived" ? ("warning" as const) : ("success" as const);
          return {
            id: `notice-${row.id}`,
            time: row.updatedAt,
            user: row.author.username,
            action,
            ip: "-",
            status,
            source: "announcement",
          };
        }),
        ...activityRows.map((row) => ({
          id: `activity-${row.id}`,
          time: row.createdAt,
          user: row.actor?.username ?? "system",
          action: row.detail || row.action,
          ip: row.ip || "-",
          status: row.status as "success" | "info" | "warning" | "error",
          source: "security",
        })),
      ]
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .filter((item) => {
          if (startDate && item.time < startDate) return false;
          if (endDate) {
            const end = new Date(endDate);
            end.setDate(end.getDate() + 1);
            if (item.time >= end) return false;
          }
          if (statusFilter !== "all" && item.status !== statusFilter) return false;
          if (sourceFilter !== "all" && item.source !== sourceFilter) return false;
          if (userKeyword && !item.user.toLowerCase().includes(userKeyword)) return false;
          if (ipKeyword && !item.ip.toLowerCase().includes(ipKeyword)) return false;
          if (keyword) {
            const content = `${item.user} ${item.action} ${item.source} ${formatDateTime(item.time)}`.toLowerCase();
            if (!content.includes(keyword)) return false;
          }
          return true;
        });

      const total = entries.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(page, totalPages);
      const start = (safePage - 1) * pageSize;
      const end = start + pageSize;
      const paged = entries.slice(start, end).map((item, idx) => ({
        id: start + idx + 1,
        time: formatDateTime(item.time),
        user: item.user,
        action: item.action,
        ip: item.ip,
        status: item.status,
        source: item.source,
      }));

      return res.json({
        success: true,
        page: safePage,
        pageSize,
        total,
        totalPages,
        hasNext: safePage < totalPages,
        logs: paged,
      });
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      return sendError(res, 500, "INTERNAL_ERROR", "获取日志失败");
    }
  });

  // Certificate Endpoints
  app.get("/api/certificates", async (req, res) => {
    try {
      const rows = await prisma.certificate.findMany({
        include: {
          user: { select: { username: true } },
          vulnerability: { select: { vulnCode: true } },
        },
        orderBy: { issuedAt: "desc" },
      });

      return res.json(
        rows.map((c) => ({
          id: c.certCode,
          vulnId: c.vulnerability?.vulnCode,
          username: c.user.username,
          title: c.title,
          type: certTypeToApi(c.certType),
          status: certStatusToApi(c.status),
          date: toDateString(c.issuedAt),
        })),
      );
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "获取证书失败");
    }
  });

  app.post("/api/certificates", requireAuth, requireRoles("admin", "auditor"), async (req, res) => {
    try {
      const { vulnId, username, title, type } = req.body as Record<string, string>;

      const certOwner = await prisma.user.findUnique({ where: { username } });
      if (!certOwner) {
        return sendError(res, 404, "NOT_FOUND", "证书用户不存在");
      }

      const vulnerability = await prisma.vulnerability.findUnique({
        where: { vulnCode: vulnId },
      });
      if (!vulnerability) {
        return sendError(res, 404, "NOT_FOUND", "关联漏洞不存在");
      }

      const issuer =
        (await prisma.user.findFirst({ where: { role: "admin" }, select: { id: true } })) ??
        { id: certOwner.id };

      let created: any = null;
      for (let i = 0; i < CERT_CODE_MAX_ATTEMPTS; i += 1) {
        const certCode = await generateUniqueCertificateCode(prisma);
        try {
          created = await prisma.certificate.create({
            data: {
              certCode,
              userId: certOwner.id,
              vulnerabilityId: vulnerability.id,
              title: title || `${vulnerability.title} - 荣誉证书`,
              certType: apiToCertType(type),
              status: "active",
              issuedById: issuer.id,
              issuedAt: new Date(),
            },
            include: {
              user: { select: { username: true } },
              vulnerability: { select: { vulnCode: true } },
            },
          });
          break;
        } catch (error) {
          const code = (error as { code?: string })?.code;
          if (code === "P2002") continue;
          throw error;
        }
      }

      if (!created) {
        return sendError(res, 500, "INTERNAL_ERROR", "证书编号生成失败，请重试");
      }

      return res.json({
        success: true,
        cert: {
          id: created.certCode,
          vulnId: created.vulnerability?.vulnCode,
          username: created.user.username,
          title: created.title,
          type: certTypeToApi(created.certType),
          status: certStatusToApi(created.status),
          date: toDateString(created.issuedAt),
        },
      });
    } catch {
      return sendError(res, 400, "BAD_REQUEST", "证书发放失败（可能已存在关联证书）");
    }
  });

  app.get("/api/certificates/search", async (req, res) => {
    try {
      const certCode = String(req.query.id ?? "");
      const cert = await prisma.certificate.findUnique({
        where: { certCode },
        include: {
          user: { select: { username: true } },
          vulnerability: { select: { vulnCode: true } },
        },
      });

      if (!cert) {
        return sendError(res, 404, "NOT_FOUND", "Certificate not found");
      }

      return res.json({
        id: cert.certCode,
        vulnId: cert.vulnerability?.vulnCode,
        username: cert.user.username,
        title: cert.title,
        type: certTypeToApi(cert.certType),
        status: certStatusToApi(cert.status),
        date: toDateString(cert.issuedAt),
      });
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "Certificate search failed");
    }
  });

  app.get("/api/certificates/:id/pdf", async (req, res) => {
    try {
      const { id } = req.params;
      const mode = String(req.query.mode ?? "download");
      const isPreview = mode === "preview";
      const cert = await prisma.certificate.findUnique({
        where: { certCode: id },
        include: {
          user: { select: { username: true } },
          vulnerability: { select: { vulnCode: true, title: true } },
          issuedBy: { select: { username: true } },
        },
      });

      if (!cert) {
        return sendError(res, 404, "NOT_FOUND", "Certificate not found");
      }

      const fontPath = getCertificateFontPath();
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const filename = `certificate-${cert.certCode}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `${isPreview ? "inline" : "attachment"}; filename="${filename}"`);
      doc.pipe(res);

      if (fontPath) {
        doc.font(fontPath);
      }

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const mainX = 50;
      const mainY = 50;
      const mainW = pageWidth - 100;
      const mainH = pageHeight - 100;

      doc
        .lineWidth(2)
        .strokeColor("#0f4c81")
        .roundedRect(mainX, mainY, mainW, mainH, 10)
        .stroke();
      doc
        .lineWidth(1)
        .strokeColor("#9fc5e8")
        .roundedRect(mainX + 8, mainY + 8, mainW - 16, mainH - 16, 8)
        .stroke();

      doc.fillColor("#0f4c81").fontSize(14).text("CQUPT-SRC 校园漏洞响应与产教融合平台", 0, 90, {
        align: "center",
      });

      doc.fillColor("#1f2937").fontSize(36).text("荣誉证书", 0, 130, { align: "center" });

      doc
        .fillColor("#4b5563")
        .fontSize(13)
        .text(`证书编号：${cert.certCode}`, 90, 205)
        .text(`获得者：${cert.user.username}`, 90, 235)
        .text(`证书类型：${certTypeToApi(cert.certType)}`, 90, 265)
        .text(`关联漏洞编号：${cert.vulnerability?.vulnCode ?? "N/A"}`, 90, 295)
        .text(`关联漏洞标题：${cert.vulnerability?.title ?? cert.title}`, 90, 325, { width: pageWidth - 180 });

      doc
        .fillColor("#111827")
        .fontSize(16)
        .text("兹证明该同学在网络安全漏洞发现与负责任披露中表现优异，特此表彰。", 90, 390, {
          width: pageWidth - 180,
          align: "center",
        });

      const issuedTime = formatDateTime(cert.issuedAt);
      const stampTime = formatDateTime(cert.updatedAt);

      doc
        .fillColor("#374151")
        .fontSize(12)
        .text(`颁发时间：${issuedTime}`, 90, 500)
        .text(`盖章时间：${stampTime}`, 90, 525)
        .text(`签发人：${cert.issuedBy.username}`, 90, 550);

      const sealX = pageWidth - 160;
      const sealY = 515;
      doc.circle(sealX, sealY, 45).lineWidth(3).strokeColor("#b91c1c").stroke();
      doc.fillColor("#b91c1c").fontSize(11).text("CQUPT-SRC", sealX - 31, sealY - 8);
      doc.fontSize(10).text("电子签章", sealX - 19, sealY + 10);

      doc
        .fillColor("#9ca3af")
        .fontSize(9)
        .text("本证书由系统自动生成，可通过证书编号在线验真。", 0, pageHeight - 70, { align: "center" });

      doc.end();
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "Certificate PDF generation failed");
    }
  });

  app.delete("/api/certificates/:id", requireAuth, requireRoles("admin", "auditor"), async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.certificate.update({
        where: { certCode: id },
        data: {
          status: "revoked",
          revokedAt: new Date(),
          revokeReason: "admin_manual_revoke",
        },
      });
      return res.json({ success: true });
    } catch {
      return sendError(res, 404, "NOT_FOUND", "Certificate not found");
    }
  });

  app.use(
    "/api/learning",
    createLearningRouter({
      prisma,
      requireAuth,
      requireRoles,
    }),
  );

  app.use(
    "/api/mall",
    createMallRouter({
      prisma,
      requireAuth,
      requireRoles,
    }),
  );

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { port: hmrPort },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
