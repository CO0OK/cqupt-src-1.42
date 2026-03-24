import express from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { sendError } from "../shared/errors.ts";

export type AuthRole = "admin" | "auditor" | "user";

type AuthPayload = {
  userId: string;
  role: AuthRole;
};

export type AuthUser = {
  id: string;
  username: string;
  role: AuthRole;
  email: string;
  authCode: string;
  points: number;
  avatar?: string;
  hasSignedAgreement: boolean;
};

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  const parts = cookieHeader.split(";");
  const cookies: Record<string, string> = {};
  for (const part of parts) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) continue;
    cookies[rawKey] = decodeURIComponent(rawValue.join("="));
  }
  return cookies;
}

export function buildAuthUser(user: {
  id: string;
  username: string;
  role: AuthRole;
  email: string;
  authCode: string;
  points: number;
  avatarUrl?: string | null;
  hasSignedAgreement: boolean;
}) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email,
    authCode: user.authCode,
    points: user.points,
    avatar: user.avatarUrl ?? undefined,
    hasSignedAgreement: user.hasSignedAgreement,
  };
}

export function getRequestAuthUser(req: express.Request): AuthUser | undefined {
  return (req as express.Request & { authUser?: AuthUser }).authUser;
}

function setRequestAuthUser(req: express.Request, user: AuthUser): void {
  (req as express.Request & { authUser?: AuthUser }).authUser = user;
}

export function createRequireAuth(args: {
  prisma: PrismaClient;
  jwtSecret: string;
  authCookieName: string;
}): express.RequestHandler {
  const { prisma, jwtSecret, authCookieName } = args;

  return async (req, res, next) => {
    try {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies[authCookieName];

      if (!token) {
        return sendError(res, 401, "UNAUTHORIZED", "未登录或会话已失效");
      }

      const payload = jwt.verify(token, jwtSecret) as AuthPayload;
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user || user.status !== "active") {
        return sendError(res, 401, "UNAUTHORIZED", "用户状态异常，请重新登录");
      }

      setRequestAuthUser(req, buildAuthUser(user));
      return next();
    } catch {
      return sendError(res, 401, "UNAUTHORIZED", "登录状态无效，请重新登录");
    }
  };
}

export function createRequireRoles(...roles: AuthRole[]): express.RequestHandler {
  return (req, res, next) => {
    const authUser = getRequestAuthUser(req);
    if (!authUser) {
      return sendError(res, 401, "UNAUTHORIZED", "未登录");
    }
    if (!roles.includes(authUser.role)) {
      return sendError(res, 403, "FORBIDDEN", "权限不足");
    }
    return next();
  };
}
