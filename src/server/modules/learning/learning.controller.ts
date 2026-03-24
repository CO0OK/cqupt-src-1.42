import express from "express";
import { getRequestAuthUser } from "../../middlewares/auth.ts";
import { sendError } from "../../shared/errors.ts";
import { LearningService } from "./learning.service.ts";

export function createLearningController(service: LearningService) {
  const listLabs: express.RequestHandler = async (_req, res) => {
    try {
      const labs = await service.listLabs();
      return res.json(labs);
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "获取靶场数据失败");
    }
  };

  const listMaterials: express.RequestHandler = async (_req, res) => {
    try {
      const materials = await service.listMaterials();
      return res.json(materials);
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "获取学习资料失败");
    }
  };

  const listDiscussions: express.RequestHandler = async (_req, res) => {
    try {
      const discussions = await service.listDiscussions();
      return res.json(discussions);
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "获取讨论数据失败");
    }
  };

  const createLab: express.RequestHandler = async (req, res) => {
    try {
      const { title, description, difficulty, category, points, url, image } = req.body as Record<string, unknown>;
      const lab = await service.createLab({ title, description, difficulty, category, points, url, image });
      return res.status(201).json({ success: true, lab });
    } catch {
      return sendError(res, 400, "BAD_REQUEST", "创建靶场失败");
    }
  };

  const updateLab: express.RequestHandler = async (req, res) => {
    try {
      const { title, description, difficulty, category, points, url, image } = req.body as Record<string, unknown>;
      const lab = await service.updateLab(req.params.id, { title, description, difficulty, category, points, url, image });
      return res.json({ success: true, lab });
    } catch {
      return sendError(res, 404, "NOT_FOUND", "靶场不存在或更新失败");
    }
  };

  const deleteLab: express.RequestHandler = async (req, res) => {
    try {
      await service.archiveLab(req.params.id);
      return res.json({ success: true });
    } catch {
      return sendError(res, 404, "NOT_FOUND", "靶场不存在");
    }
  };

  const createMaterial: express.RequestHandler = async (req, res) => {
    try {
      const { title, author, type, url, image, description } = req.body as Record<string, unknown>;
      const material = await service.createMaterial({ title, author, type, url, image, description });
      return res.status(201).json({ success: true, material });
    } catch {
      return sendError(res, 400, "BAD_REQUEST", "创建学习资料失败");
    }
  };

  const updateMaterial: express.RequestHandler = async (req, res) => {
    try {
      const { title, author, type, url, image, description } = req.body as Record<string, unknown>;
      const material = await service.updateMaterial(req.params.id, { title, author, type, url, image, description });
      return res.json({ success: true, material });
    } catch {
      return sendError(res, 404, "NOT_FOUND", "学习资料不存在或更新失败");
    }
  };

  const deleteMaterial: express.RequestHandler = async (req, res) => {
    try {
      await service.archiveMaterial(req.params.id);
      return res.json({ success: true });
    } catch {
      return sendError(res, 404, "NOT_FOUND", "学习资料不存在");
    }
  };

  const createDiscussion: express.RequestHandler = async (req, res) => {
    try {
      const authUser = getRequestAuthUser(req);
      if (!authUser) return sendError(res, 401, "UNAUTHORIZED", "未登录");

      const { title, category, content } = req.body as Record<string, unknown>;
      const discussion = await service.createDiscussion(authUser.id, { title, category, content });
      return res.status(201).json({ success: true, discussion });
    } catch {
      return sendError(res, 400, "BAD_REQUEST", "发布讨论失败");
    }
  };

  const deleteDiscussion: express.RequestHandler = async (req, res) => {
    try {
      await service.archiveDiscussion(req.params.id);
      return res.json({ success: true });
    } catch {
      return sendError(res, 404, "NOT_FOUND", "讨论不存在");
    }
  };

  return {
    listLabs,
    listMaterials,
    listDiscussions,
    createLab,
    updateLab,
    deleteLab,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    createDiscussion,
    deleteDiscussion,
  };
}
