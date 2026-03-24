import express from "express";
import { getRequestAuthUser } from "../../middlewares/auth.ts";
import { sendError } from "../../shared/errors.ts";
import { AnnouncementsService } from "./announcements.service.ts";

export function createAnnouncementsController(service: AnnouncementsService) {
  const listAnnouncements: express.RequestHandler = async (_req, res) => {
    try {
      const announcements = await service.listAnnouncements();
      return res.json(announcements);
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "获取公告失败");
    }
  };

  const createAnnouncement: express.RequestHandler = async (req, res) => {
    try {
      const { title, content, type, isPinned, author } = req.body as Record<string, unknown>;
      const authorName = typeof author === "string" ? author : getRequestAuthUser(req)?.username ?? "";

      const announcement = await service.createAnnouncement({
        title: typeof title === "string" ? title : undefined,
        content: typeof content === "string" ? content : undefined,
        type: typeof type === "string" ? type : undefined,
        isPinned,
        authorName,
      });

      return res.json({ success: true, announcement });
    } catch (error) {
      const err = error as Error;
      if (err.message === "AUTHOR_NOT_FOUND") {
        return sendError(res, 404, "NOT_FOUND", "发布者不存在");
      }
      return sendError(res, 500, "INTERNAL_ERROR", "公告发布失败");
    }
  };

  const deleteAnnouncement: express.RequestHandler = async (req, res) => {
    try {
      await service.archiveAnnouncement(req.params.id);
      return res.json({ success: true });
    } catch {
      return sendError(res, 404, "NOT_FOUND", "公告不存在");
    }
  };

  const updateAnnouncement: express.RequestHandler = async (req, res) => {
    try {
      const { title, content, type, isPinned } = req.body as Record<string, unknown>;
      const announcement = await service.updateAnnouncement(req.params.id, { title, content, type, isPinned });
      return res.json({ success: true, announcement });
    } catch {
      return sendError(res, 404, "NOT_FOUND", "公告不存在");
    }
  };

  return {
    listAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
    updateAnnouncement,
  };
}
