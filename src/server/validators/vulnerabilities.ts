export type ValidationIssue = {
  field: string;
  reason: string;
};

type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; issues: ValidationIssue[] };

export type CreateVulnerabilityInput = {
  title: string;
  url: string;
  type: string;
  level: string;
  description: string;
  attachmentName: string;
  attachmentType: string;
  attachmentData: string;
};

export type UpdateVulnerabilityInput = {
  title?: string;
  url?: string;
  type?: string;
  level?: string;
  description?: string;
  status?: string;
  auditNote?: string;
};

const LEVELS = ["严重", "高危", "中危", "低危", "信息"] as const;
const STATUSES = ["待处理", "审核中", "已审核", "修复中", "已修复", "已忽略", "已隐藏"] as const;
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
]);
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const OLE_HEADER = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function parseText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalTrimmed(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return "";
  return value.trim();
}

function isValidUrlLike(url: string): boolean {
  if (url.length > 500) return false;
  if (url.startsWith("http://") || url.startsWith("https://")) return true;
  return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}([/:?#].*)?$/.test(url);
}

function estimateBase64Bytes(dataUrl: string): number | null {
  const marker = "base64,";
  const idx = dataUrl.indexOf(marker);
  if (idx < 0) return null;
  const base64 = dataUrl.slice(idx + marker.length);
  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) return null;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
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

function startsWithBytes(content: Buffer, signature: Buffer): boolean {
  if (content.length < signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (content[i] !== signature[i]) return false;
  }
  return true;
}

function containsSuspiciousText(text: string): boolean {
  const lowered = text.toLowerCase();
  const suspiciousPatterns = [
    "<script",
    "javascript:",
    "vbscript:",
    "<?php",
    "<iframe",
    "powershell -",
    "cmd.exe",
    "eval(",
  ];
  return suspiciousPatterns.some((pattern) => lowered.includes(pattern));
}

function hasMaliciousMarkers(content: Buffer, mimeType: string): boolean {
  const latin = content.toString("latin1");
  const lower = latin.toLowerCase();

  if (mimeType === "application/pdf") {
    // Block active content features in PDF to reduce embedded script/exploit risk.
    return ["/javascript", "/js", "/openaction", "/launch", "/aa", "/richmedia"].some((token) =>
      lower.includes(token),
    );
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    // DOCX is a zip package; reject macro-related entries.
    return lower.includes("vbaProject.bin".toLowerCase()) || lower.includes("word/vbadata.xml");
  }

  if (mimeType === "application/msword") {
    // Legacy DOC may contain VBA streams in OLE.
    return lower.includes("vba") || lower.includes("macros") || lower.includes("autoopen");
  }

  if (mimeType === "text/plain") {
    if (content.includes(0x00)) return true;
    return containsSuspiciousText(content.toString("utf8"));
  }

  return false;
}

function isMimeSignatureValid(content: Buffer, mimeType: string): boolean {
  if (mimeType === "application/pdf") return content.toString("latin1", 0, 5) === "%PDF-";
  if (mimeType === "application/msword") return startsWithBytes(content, OLE_HEADER);
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return content.length >= 4 && content[0] === 0x50 && content[1] === 0x4b; // ZIP header
  }
  if (mimeType === "image/png") return startsWithBytes(content, PNG_HEADER);
  if (mimeType === "image/jpeg") return content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
  if (mimeType === "text/plain") return !content.includes(0x00);
  return false;
}

export function validateCreateVulnerabilityPayload(body: unknown): ValidationResult<CreateVulnerabilityInput> {
  const input = (body ?? {}) as Record<string, unknown>;
  const issues: ValidationIssue[] = [];

  const title = parseText(input.title);
  if (!title) issues.push({ field: "title", reason: "required" });
  if (title && title.length > 255) issues.push({ field: "title", reason: "length must be <= 255" });

  const url = parseText(input.url);
  if (!url) issues.push({ field: "url", reason: "required" });
  if (url && !isValidUrlLike(url)) issues.push({ field: "url", reason: "must be valid url or domain" });

  const type = parseText(input.type);
  if (!type) issues.push({ field: "type", reason: "required" });
  if (type && type.length > 50) issues.push({ field: "type", reason: "length must be <= 50" });

  const level = parseText(input.level);
  if (!level) issues.push({ field: "level", reason: "required" });
  if (level && !LEVELS.includes(level as (typeof LEVELS)[number])) {
    issues.push({ field: "level", reason: "must be 严重|高危|中危|低危|信息" });
  }

  const description = parseText(input.description);
  if (!description) issues.push({ field: "description", reason: "required" });
  if (description && description.length > 5000) {
    issues.push({ field: "description", reason: "length must be <= 5000" });
  }

  const attachmentName = parseText(input.attachmentName);
  if (!attachmentName) issues.push({ field: "attachment", reason: "required" });
  if (attachmentName && attachmentName.length > 255) {
    issues.push({ field: "attachment", reason: "filename length must be <= 255" });
  }

  const attachmentType = parseText(input.attachmentType);
  if (!attachmentType) issues.push({ field: "attachment", reason: "required" });
  if (attachmentType && !ALLOWED_ATTACHMENT_MIME_TYPES.has(attachmentType)) {
    issues.push({ field: "attachment", reason: "unsupported attachment type" });
  }

  const attachmentData = parseText(input.attachmentData);
  if (!attachmentData) issues.push({ field: "attachment", reason: "required" });
  if (attachmentData && !attachmentData.startsWith(`data:${attachmentType ?? ""};base64,`)) {
    issues.push({ field: "attachment", reason: "invalid attachment content" });
  }
  if (attachmentData) {
    const bytes = estimateBase64Bytes(attachmentData);
    if (bytes === null) {
      issues.push({ field: "attachment", reason: "invalid attachment content" });
    } else if (bytes > MAX_ATTACHMENT_BYTES) {
      issues.push({ field: "attachment", reason: "attachment size must be <= 8MB" });
    } else if (attachmentType) {
      const content = decodeDataUrl(attachmentData, attachmentType);
      if (!content) {
        issues.push({ field: "attachment", reason: "invalid attachment content" });
      } else if (!isMimeSignatureValid(content, attachmentType)) {
        issues.push({ field: "attachment", reason: "attachment mime/signature mismatch" });
      } else if (hasMaliciousMarkers(content, attachmentType)) {
        issues.push({ field: "attachment", reason: "malicious content detected" });
      }
    }
  }

  if (
    issues.length > 0 ||
    !title ||
    !url ||
    !type ||
    !level ||
    !description ||
    !attachmentName ||
    !attachmentType ||
    !attachmentData
  ) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    data: { title, url, type, level, description, attachmentName, attachmentType, attachmentData },
  };
}

export function validateUpdateVulnerabilityPayload(body: unknown): ValidationResult<UpdateVulnerabilityInput> {
  const input = (body ?? {}) as Record<string, unknown>;
  const issues: ValidationIssue[] = [];
  const data: UpdateVulnerabilityInput = {};

  if (Object.keys(input).length === 0) {
    return { ok: false, issues: [{ field: "body", reason: "at least one field is required" }] };
  }

  if ("title" in input) {
    const title = asOptionalTrimmed(input.title);
    if (!title) issues.push({ field: "title", reason: "must be non-empty string" });
    else if (title.length > 255) issues.push({ field: "title", reason: "length must be <= 255" });
    else data.title = title;
  }

  if ("url" in input) {
    const url = asOptionalTrimmed(input.url);
    if (!url) issues.push({ field: "url", reason: "must be non-empty string" });
    else if (!isValidUrlLike(url)) issues.push({ field: "url", reason: "must be valid url or domain" });
    else data.url = url;
  }

  if ("type" in input) {
    const type = asOptionalTrimmed(input.type);
    if (!type) issues.push({ field: "type", reason: "must be non-empty string" });
    else if (type.length > 50) issues.push({ field: "type", reason: "length must be <= 50" });
    else data.type = type;
  }

  if ("level" in input) {
    const level = asOptionalTrimmed(input.level);
    if (!level) issues.push({ field: "level", reason: "must be non-empty string" });
    else if (!LEVELS.includes(level as (typeof LEVELS)[number])) {
      issues.push({ field: "level", reason: "must be 严重|高危|中危|低危|信息" });
    } else {
      data.level = level;
    }
  }

  if ("description" in input) {
    const description = asOptionalTrimmed(input.description);
    if (!description) issues.push({ field: "description", reason: "must be non-empty string" });
    else if (description.length > 5000) issues.push({ field: "description", reason: "length must be <= 5000" });
    else data.description = description;
  }

  if ("status" in input) {
    const status = asOptionalTrimmed(input.status);
    if (!status) issues.push({ field: "status", reason: "must be non-empty string" });
    else if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
      issues.push({ field: "status", reason: "must be 待处理|审核中|已审核|修复中|已修复|已忽略|已隐藏" });
    } else {
      data.status = status;
    }
  }

  if ("auditNote" in input) {
    if (input.auditNote !== null && typeof input.auditNote !== "string") {
      issues.push({ field: "auditNote", reason: "must be string|null" });
    } else {
      const auditNote = typeof input.auditNote === "string" ? input.auditNote.trim() : "";
      if (auditNote.length > 2000) {
        issues.push({ field: "auditNote", reason: "length must be <= 2000" });
      } else {
        data.auditNote = auditNote;
      }
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  if (Object.keys(data).length === 0) {
    return { ok: false, issues: [{ field: "body", reason: "no valid updatable field provided" }] };
  }

  return { ok: true, data };
}
