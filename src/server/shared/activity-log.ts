import { PrismaClient } from "@prisma/client";
import type express from "express";

export type ActivityLogStatus = "success" | "info" | "warning" | "error";

export type WriteActivityLogInput = {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: string;
  status?: ActivityLogStatus;
  ip?: string;
  userAgent?: string;
};

function clamp(input: string | undefined, max: number): string | undefined {
  if (!input) return undefined;
  return input.length > max ? input.slice(0, max) : input;
}

function extractIp(req: express.Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0 && forwarded[0]) {
    return forwarded[0].split(",")[0].trim();
  }
  return req.ip || "-";
}

export function buildRequestLogMeta(req: express.Request): { ip: string; userAgent?: string } {
  const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"].trim() : "";
  return {
    ip: clamp(extractIp(req), 64) ?? "-",
    userAgent: clamp(userAgent, 255),
  };
}

export async function writeActivityLog(prisma: PrismaClient, input: WriteActivityLogInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: clamp(input.action.trim(), 80) || "unknown_action",
        targetType: clamp(input.targetType?.trim(), 50) ?? null,
        targetId: clamp(input.targetId?.trim(), 120) ?? null,
        detail: input.detail?.trim() ? input.detail.trim() : null,
        status: clamp(input.status ?? "success", 20) ?? "success",
        ip: clamp(input.ip, 64) ?? "-",
        userAgent: clamp(input.userAgent, 255) ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to write activity log:", error);
  }
}
