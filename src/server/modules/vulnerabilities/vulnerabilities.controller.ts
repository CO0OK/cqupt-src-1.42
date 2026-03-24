import express from "express";
import { PrismaClient } from "@prisma/client";
import { getRequestAuthUser } from "../../middlewares/auth.ts";
import { buildRequestLogMeta, writeActivityLog } from "../../shared/activity-log.ts";
import { sendError } from "../../shared/errors.ts";
import {
  validateCreateVulnerabilityPayload,
  validateUpdateVulnerabilityPayload,
} from "../../validators/vulnerabilities.ts";
import { VulnerabilitiesService } from "./vulnerabilities.service.ts";

export function createVulnerabilitiesController(service: VulnerabilitiesService, prisma: PrismaClient) {
  const listVulnerabilities: express.RequestHandler = async (_req, res) => {
    try {
      const vulnerabilities = await service.listVulnerabilities();
      return res.json(vulnerabilities);
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "获取漏洞列表失败");
    }
  };

  const createVulnerability: express.RequestHandler = async (req, res) => {
    try {
      const submitter = getRequestAuthUser(req);
      if (!submitter) return sendError(res, 401, "UNAUTHORIZED", "未登录");

      const validated = validateCreateVulnerabilityPayload(req.body);
      if (validated.ok === false) {
        return sendError(res, 400, "BAD_REQUEST", "漏洞参数校验失败", validated.issues);
      }

      const vuln = await service.createVulnerability({
        payload: validated.data,
        submitterId: submitter.id,
      });

      const meta = buildRequestLogMeta(req);
      await writeActivityLog(prisma, {
        actorId: submitter.id,
        action: "vulnerability.attachment.uploaded",
        targetType: "vulnerability",
        targetId: vuln.id,
        detail: `上传附件 ${validated.data.attachmentName}`,
        status: "info",
        ...meta,
      });

      return res.json({ success: true, vuln });
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "漏洞提交失败");
    }
  };

  const updateVulnerability: express.RequestHandler = async (req, res) => {
    try {
      const validated = validateUpdateVulnerabilityPayload(req.body);
      if (validated.ok === false) {
        return sendError(res, 400, "BAD_REQUEST", "漏洞参数校验失败", validated.issues);
      }

      await service.updateVulnerability(req.params.id, validated.data);
      return res.json({ success: true });
    } catch (error) {
      const err = error as Error;
      if (err.message === "NOT_FOUND") {
        return sendError(res, 404, "NOT_FOUND", "漏洞不存在");
      }
      if (err.message === "EDIT_BEFORE_AUDIT_FORBIDDEN") {
        return sendError(res, 403, "FORBIDDEN", "未审核漏洞不允许编辑内容");
      }
      return sendError(res, 500, "INTERNAL_ERROR", "漏洞更新失败");
    }
  };

  const getVulnerabilityAttachment: express.RequestHandler = async (req, res) => {
    try {
      const authUser = getRequestAuthUser(req);
      const mode = req.query.mode === "preview" ? "preview" : "download";
      const attachment = await service.getVulnerabilityAttachment(req.params.id);

      if (mode === "preview" && !attachment.canPreview) {
        return sendError(res, 400, "BAD_REQUEST", "该附件类型不支持在线预览，请下载后查看");
      }

      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", attachment.mimeType);
      res.setHeader(
        "Content-Disposition",
        `${mode === "preview" ? "inline" : "attachment"}; filename="${encodeURIComponent(attachment.fileName)}"`,
      );

      if (authUser) {
        const meta = buildRequestLogMeta(req);
        await writeActivityLog(prisma, {
          actorId: authUser.id,
          action: mode === "preview" ? "vulnerability.attachment.previewed" : "vulnerability.attachment.downloaded",
          targetType: "vulnerability",
          targetId: req.params.id,
          detail: `${mode === "preview" ? "预览" : "下载"}附件 ${attachment.fileName}`,
          status: "info",
          ...meta,
        });
      }

      return res.send(attachment.content);
    } catch (error) {
      const err = error as Error;
      if (err.message === "NOT_FOUND") return sendError(res, 404, "NOT_FOUND", "漏洞不存在");
      if (err.message === "ATTACHMENT_NOT_FOUND") return sendError(res, 404, "NOT_FOUND", "附件不存在");
      if (err.message === "ATTACHMENT_CORRUPTED") {
        return sendError(res, 400, "BAD_REQUEST", "附件数据损坏或格式非法");
      }
      return sendError(res, 500, "INTERNAL_ERROR", "读取附件失败");
    }
  };

  return {
    listVulnerabilities,
    createVulnerability,
    updateVulnerability,
    getVulnerabilityAttachment,
  };
}
