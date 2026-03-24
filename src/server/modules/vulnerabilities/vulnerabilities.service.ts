import { PrismaClient } from "@prisma/client";
import type {
  CreateVulnerabilityInput,
  UpdateVulnerabilityInput,
} from "../../validators/vulnerabilities.ts";

type StoredAttachment = {
  attachmentName: string;
  attachmentType: string;
  attachmentData: string;
};

const PREVIEWABLE_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "text/plain"]);

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function severityToCn(
  severity: "critical" | "high" | "medium" | "low" | "info",
): "严重" | "高危" | "中危" | "低危" | "信息" {
  if (severity === "critical") return "严重";
  if (severity === "high") return "高危";
  if (severity === "medium") return "中危";
  if (severity === "low") return "低危";
  return "信息";
}

function cnToSeverity(level?: string): "critical" | "high" | "medium" | "low" | "info" {
  if (level === "严重") return "critical";
  if (level === "高危") return "high";
  if (level === "中危") return "medium";
  if (level === "低危") return "low";
  return "info";
}

function statusToCn(
  status: "pending" | "reviewing" | "approved" | "fixing" | "fixed" | "rejected" | "hidden",
): "待处理" | "审核中" | "已审核" | "修复中" | "已修复" | "已忽略" | "已隐藏" {
  if (status === "pending") return "待处理";
  if (status === "reviewing") return "审核中";
  if (status === "approved") return "已审核";
  if (status === "fixing") return "修复中";
  if (status === "fixed") return "已修复";
  if (status === "hidden") return "已隐藏";
  return "已忽略";
}

function cnToStatus(
  status?: string,
): "pending" | "reviewing" | "approved" | "fixing" | "fixed" | "rejected" | "hidden" {
  if (status === "待处理" || status === "pending") return "pending";
  if (status === "审核中" || status === "reviewing") return "reviewing";
  if (status === "已审核" || status === "approved") return "approved";
  if (status === "修复中" || status === "fixing") return "fixing";
  if (status === "已修复" || status === "fixed") return "fixed";
  if (status === "已隐藏" || status === "hidden") return "hidden";
  if (status === "已忽略" || status === "rejected") return "rejected";
  return "pending";
}

function statusToAuditAction(
  status: "pending" | "reviewing" | "approved" | "fixing" | "fixed" | "rejected" | "hidden",
): "submit" | "claim" | "approve" | "reject" | "fixing" | "fixed" | "hide" | "reopen" {
  if (status === "approved") return "approve";
  if (status === "rejected") return "reject";
  if (status === "fixing") return "fixing";
  if (status === "fixed") return "fixed";
  if (status === "hidden") return "hide";
  if (status === "pending") return "reopen";
  if (status === "reviewing") return "claim";
  return "submit";
}

function parseStoredAttachment(raw: string | null): StoredAttachment | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredAttachment>;
    if (
      typeof parsed.attachmentName !== "string" ||
      typeof parsed.attachmentType !== "string" ||
      typeof parsed.attachmentData !== "string"
    ) {
      return null;
    }
    return {
      attachmentName: parsed.attachmentName,
      attachmentType: parsed.attachmentType,
      attachmentData: parsed.attachmentData,
    };
  } catch {
    return null;
  }
}

function decodeDataUrl(dataUrl: string, mimeType: string): Buffer | null {
  const prefix = `data:${mimeType};base64,`;
  if (!dataUrl.startsWith(prefix)) return null;
  const base64 = dataUrl.slice(prefix.length);
  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) return null;
  try {
    return Buffer.from(base64, "base64");
  } catch {
    return null;
  }
}

export class VulnerabilitiesService {
  constructor(private readonly prisma: PrismaClient) {}

  async listVulnerabilities() {
    const rows = await this.prisma.vulnerability.findMany({
      include: {
        submitter: { select: { username: true } },
        audits: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { note: true },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return rows.map((v) => {
      const attachment = parseStoredAttachment(v.reproductionSteps);

      return {
        id: v.vulnCode,
        title: v.title,
        url: v.targetUrl,
        type: v.vulnType,
        level: severityToCn(v.severity),
        status: statusToCn(v.status),
        author: v.submitter.username,
        date: toDateString(v.submittedAt),
        description: v.description,
        auditNote: v.audits[0]?.note ?? "",
        attachment: attachment?.attachmentName ?? "",
        attachmentType: attachment?.attachmentType ?? "",
      };
    });
  }

  async createVulnerability(input: {
    payload: CreateVulnerabilityInput;
    submitterId: string;
  }) {
    const year = new Date().getFullYear();
    const existingCodes = await this.prisma.vulnerability.findMany({
      where: { vulnCode: { startsWith: `VU-${year}-` } },
      select: { vulnCode: true },
    });
    const maxSerial = existingCodes.reduce((max, item) => {
      const serial = Number(item.vulnCode.split("-")[2]);
      if (Number.isNaN(serial)) return max;
      return Math.max(max, serial);
    }, 0);
    const nextSerial = String(maxSerial + 1).padStart(4, "0");
    const vulnCode = `VU-${year}-${nextSerial}`;

    const created = await this.prisma.vulnerability.create({
      data: {
        vulnCode,
        title: input.payload.title,
        targetUrl: input.payload.url,
        vulnType: input.payload.type,
        severity: cnToSeverity(input.payload.level),
        status: "pending",
        description: input.payload.description,
        reproductionSteps: JSON.stringify({
          attachmentName: input.payload.attachmentName,
          attachmentType: input.payload.attachmentType,
          attachmentData: input.payload.attachmentData,
        }),
        submitterId: input.submitterId,
        submittedAt: new Date(),
      },
      include: {
        submitter: { select: { username: true } },
      },
    });

    await this.prisma.vulnerabilityAudit.create({
      data: {
        vulnerabilityId: created.id,
        auditorId: created.submitterId,
        action: "submit",
        toStatus: "pending",
        note: "漏洞已提交，待审核。",
      },
    });

    return {
      id: created.vulnCode,
      title: created.title,
      url: created.targetUrl,
      type: created.vulnType,
      level: severityToCn(created.severity),
      status: statusToCn(created.status),
      author: created.submitter.username,
      date: toDateString(created.submittedAt),
      description: created.description,
      auditNote: "",
      attachment: input.payload.attachmentName,
      attachmentType: input.payload.attachmentType,
    };
  }

  async getVulnerabilityAttachment(vulnCode: string) {
    const vuln = await this.prisma.vulnerability.findUnique({
      where: { vulnCode },
      select: { reproductionSteps: true },
    });
    if (!vuln) throw new Error("NOT_FOUND");

    const attachment = parseStoredAttachment(vuln.reproductionSteps);
    if (!attachment) throw new Error("ATTACHMENT_NOT_FOUND");

    const content = decodeDataUrl(attachment.attachmentData, attachment.attachmentType);
    if (!content) throw new Error("ATTACHMENT_CORRUPTED");

    return {
      fileName: attachment.attachmentName.replace(/[\r\n\\/]/g, "_"),
      mimeType: attachment.attachmentType,
      content,
      canPreview: PREVIEWABLE_MIME_TYPES.has(attachment.attachmentType),
    };
  }

  async updateVulnerability(vulnCode: string, updates: UpdateVulnerabilityInput) {
    const existing = await this.prisma.vulnerability.findUnique({ where: { vulnCode } });
    if (!existing) {
      throw new Error("NOT_FOUND");
    }

    const hasFieldEdit =
      typeof updates.title === "string" ||
      typeof updates.url === "string" ||
      typeof updates.type === "string" ||
      typeof updates.level === "string" ||
      typeof updates.description === "string";
    const isNotAudited = existing.status === "pending" || existing.status === "reviewing";
    if (isNotAudited && hasFieldEdit) {
      throw new Error("EDIT_BEFORE_AUDIT_FORBIDDEN");
    }

    const data: Record<string, unknown> = {};
    if (typeof updates.title === "string") data.title = updates.title;
    if (typeof updates.url === "string") data.targetUrl = updates.url;
    if (typeof updates.type === "string") data.vulnType = updates.type;
    if (typeof updates.level === "string") data.severity = cnToSeverity(updates.level);
    if (typeof updates.description === "string") data.description = updates.description;
    if (typeof updates.status === "string") data.status = cnToStatus(updates.status);

    const updated = await this.prisma.vulnerability.update({
      where: { vulnCode },
      data,
    });

    if (typeof updates.status === "string" || typeof updates.auditNote === "string") {
      await this.prisma.vulnerabilityAudit.create({
        data: {
          vulnerabilityId: existing.id,
          auditorId: existing.currentAuditorId ?? existing.submitterId,
          action: statusToAuditAction(updated.status),
          fromStatus: existing.status,
          toStatus: updated.status,
          note: typeof updates.auditNote === "string" ? updates.auditNote : null,
        },
      });
    }
  }
}
