import "dotenv/config";

import express from "express";
import { existsSync } from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import PDFDocument from "pdfkit";

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

type AuthRole = "admin" | "auditor" | "user";

type AuthPayload = {
  userId: string;
  role: AuthRole;
};

type AuthUser = {
  id: string;
  username: string;
  role: AuthRole;
  email: string;
  authCode: string;
  points: number;
  hasSignedAgreement: boolean;
};

function normalizeStatus(status?: string): "active" | "banned" | "pending" {
  const normalized = status?.toLowerCase();
  if (normalized === "banned") return "banned";
  if (normalized === "pending") return "pending";
  return "active";
}

function normalizeRole(role?: string): "admin" | "auditor" | "user" {
  const normalized = role?.toLowerCase();
  if (normalized === "admin") return "admin";
  if (normalized === "auditor") return "auditor";
  return "user";
}

function toDisplayStatus(status: "active" | "banned" | "pending"): string {
  if (status === "banned") return "Banned";
  if (status === "pending") return "Pending";
  return "Active";
}

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

function announcementTypeToCn(type: "general" | "security" | "mall" | "maintenance"): string {
  if (type === "security") return "安全通知";
  if (type === "mall") return "商城动态";
  if (type === "maintenance") return "维护公告";
  return "常规";
}

function cnToAnnouncementType(type?: string): "general" | "security" | "mall" | "maintenance" {
  if (type === "安全通知") return "security";
  if (type === "商城动态") return "mall";
  if (type === "维护公告") return "maintenance";
  return "general";
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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

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

function buildAuthUser(user: {
  id: string;
  username: string;
  role: AuthRole;
  email: string;
  authCode: string;
  points: number;
  hasSignedAgreement: boolean;
}) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email,
    authCode: user.authCode,
    points: user.points,
    hasSignedAgreement: user.hasSignedAgreement,
  };
}

function getRequestAuthUser(req: express.Request): AuthUser | undefined {
  return (req as express.Request & { authUser?: AuthUser }).authUser;
}

function setRequestAuthUser(req: express.Request, user: AuthUser): void {
  (req as express.Request & { authUser?: AuthUser }).authUser = user;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const requireAuth: express.RequestHandler = async (req, res, next) => {
    try {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies[AUTH_COOKIE_NAME];

      if (!token) {
        return res.status(401).json({ success: false, message: "未登录或会话已失效" });
      }

      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user || user.status !== "active") {
        return res.status(401).json({ success: false, message: "用户状态异常，请重新登录" });
      }

      setRequestAuthUser(req, buildAuthUser(user));
      return next();
    } catch {
      return res.status(401).json({ success: false, message: "登录状态无效，请重新登录" });
    }
  };

  const requireRoles = (...roles: AuthRole[]): express.RequestHandler => {
    return (req, res, next) => {
      const authUser = getRequestAuthUser(req);
      if (!authUser) {
        return res.status(401).json({ success: false, message: "未登录" });
      }
      if (!roles.includes(authUser.role)) {
        return res.status(403).json({ success: false, message: "权限不足" });
      }
      return next();
    };
  };

  // Mock Database
  const vulnerabilities = [
    { id: "VU-2024-001", title: "核心教务系统SQL注入漏洞", url: "jwzx.cqupt.edu.cn", type: "SQL注入", level: "严重", status: "修复中", author: "temp", date: "2024-03-24", description: "存在明显的SQL注入风险...", auditNote: "" },
    { id: "VU-2024-002", title: "图书管理系统未授权访问", url: "lib.cqupt.edu.cn", type: "权限绕过", level: "高危", status: "已审核", author: "temp", date: "2024-03-22", description: "未授权即可访问敏感数据...", auditNote: "" },
    { id: "VU-2024-003", title: "宿舍网络中心反射型XSS", url: "net.cqupt.edu.cn", type: "XSS跨站脚本", level: "中危", status: "已修复", author: "temp", date: "2024-03-20", description: "输入框未过滤导致脚本执行...", auditNote: "" },
    { id: "VU-2024-004", title: "研究生院信息门户逻辑漏洞", url: "yjs.cqupt.edu.cn", type: "逻辑漏洞", level: "高危", status: "待处理", author: "temp", date: "2024-03-25", description: "通过修改参数可以越权查看其他学生成绩...", auditNote: "" },
    { id: "VU-2024-005", title: "校园卡充值平台信息泄露", url: "ecard.cqupt.edu.cn", type: "信息泄露", level: "中危", status: "待处理", author: "temp", date: "2024-03-26", description: "接口返回了过多的用户隐私字段...", auditNote: "" },
  ];

  const labs = [
    { id: "LAB-001", title: "基础SQL注入实战", description: "通过本靶场，您将学习如何识别和利用最基础的UNION型SQL注入漏洞，获取数据库敏感信息。", difficulty: "简单", category: "Web安全", points: 100, url: "https://lab.cqupt.edu.cn/sql-1", image: "https://picsum.photos/seed/sql/800/450" },
    { id: "LAB-002", title: "XSS跨站脚本攻击进阶", description: "深入理解反射型与存储型XSS的区别，学习如何绕过常见的WAF过滤规则。", difficulty: "中等", category: "Web安全", points: 200, url: "https://lab.cqupt.edu.cn/xss-2", image: "https://picsum.photos/seed/xss/800/450" },
    { id: "LAB-003", title: "Linux权限提升技巧", description: "探索Linux系统中的SUID权限、内核漏洞及配置不当导致的提权路径。", difficulty: "困难", category: "系统安全", points: 500, url: "https://lab.cqupt.edu.cn/privesc-1", image: "https://picsum.photos/seed/linux/800/450" },
    { id: "LAB-004", title: "JWT身份验证绕过", description: "学习JWT的结构，以及由于密钥过弱或算法配置不当导致的身份伪造攻击。", difficulty: "中等", category: "逻辑漏洞", points: 300, url: "https://lab.cqupt.edu.cn/jwt-1", image: "https://picsum.photos/seed/jwt/800/450" },
    { id: "LAB-005", title: "CTF入门杂项练习", description: "包含编码转换、隐写术基础等多种CTF入门必备知识点。", difficulty: "简单", category: "其他", points: 150, url: "https://lab.cqupt.edu.cn/misc-1", image: "https://picsum.photos/seed/misc/800/450" },
  ];

  const materials = [
    { id: "MAT-001", title: "OWASP Top 10 2024 深度解析", author: "admin", date: "2024-03-01", type: "技术文档", url: "#", description: "详细解读最新版OWASP十大安全风险。" },
    { id: "MAT-002", title: "Burp Suite 零基础实战教程", author: "WhiteHat_Zero", date: "2024-02-15", type: "视频教程", url: "#", description: "从安装到高级插件使用的全过程演示。" },
    { id: "MAT-003", title: "常用渗透测试工具集锦", author: "admin", date: "2024-01-20", type: "工具插件", url: "#", description: "整理了Web渗透、内网渗透常用的各类工具。" },
    { id: "MAT-004", title: "某大型企业内网渗透案例分享", author: "Security_Bob", date: "2024-03-10", type: "实战案例", url: "#", description: "通过真实案例学习内网渗透的思路与技巧。" },
    { id: "MAT-005", title: "SRC平台通用规则说明", author: "admin", date: "2024-03-20", type: "其他", url: "#", description: "关于平台漏洞提交、审核及奖励的详细规则。" },
  ];

  const discussions = [
    { id: "DIS-001", title: "关于最新教务系统漏洞的修复建议", author: "temp", date: "2024-03-25", replies: 12, category: "技术交流" },
    { id: "DIS-002", title: "新手如何快速入门CTF？", author: "Security_Bob", date: "2024-03-22", replies: 45, category: "经验分享" },
    { id: "DIS-003", title: "求推荐好用的内网穿透工具", author: "WhiteHat_Zero", date: "2024-03-20", replies: 8, category: "求助咨询" },
  ];

  const products = [
    { id: 'P001', name: 'CQUPT 极客卫衣', price: 5000, stock: 45, category: '服饰', image: 'https://picsum.photos/seed/hoodie/200', status: 'In Stock' },
    { id: 'P002', name: '机械键盘 (定制版)', price: 12000, stock: 12, category: '数码', image: 'https://picsum.photos/seed/keyboard/200', status: 'In Stock' },
    { id: 'P003', name: 'SRC 专属徽章', price: 500, stock: 200, category: '周边', image: 'https://picsum.photos/seed/badge/200', status: 'In Stock' },
    { id: 'P004', name: '京东卡 100元', price: 10000, stock: 0, category: '礼品卡', image: 'https://picsum.photos/seed/card/200', status: 'Out of Stock' },
  ];

  const redemptions = [
    { id: 'R001', userId: 'temp', username: 'temp', productId: 'P003', productName: 'SRC 专属徽章', productImage: 'https://picsum.photos/seed/badge/200', points: 500, date: '2024-03-10', status: 'Issued' }
  ];

  // Auth Endpoints
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ username }, { authCode: username }],
        },
      });

      if (!user) {
        return res.status(401).json({ success: false, message: "账号或密码错误" });
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
        return res.status(401).json({ success: false, message: "账号或密码错误" });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role } satisfies AuthPayload,
        JWT_SECRET,
        { expiresIn: "7d" },
      );

      res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: AUTH_COOKIE_MAX_AGE_MS,
        path: "/",
      });

      return res.json({
        success: true,
        user: buildAuthUser(user),
      });
    } catch {
      return res.status(500).json({ success: false, message: "登录失败" });
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const { username, authCode, password, email } = req.body;

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ username }, { authCode }, { email }],
        },
      });

      if (existingUser) {
        return res.status(400).json({ success: false, message: "用户名、认证码或邮箱已存在" });
      }

      const newUser = await prisma.user.create({
        data: {
          username,
          authCode,
          email,
          passwordHash: await bcrypt.hash(password, 10),
          role: "user",
          points: 0,
          status: "active",
          hasSignedAgreement: false,
        },
      });

      const token = jwt.sign(
        { userId: newUser.id, role: newUser.role } satisfies AuthPayload,
        JWT_SECRET,
        { expiresIn: "7d" },
      );
      res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: AUTH_COOKIE_MAX_AGE_MS,
        path: "/",
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
          hasSignedAgreement: newUser.hasSignedAgreement,
        },
      });
    } catch {
      return res.status(500).json({ success: false, message: "注册失败" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    return res.json({ success: true, user: getRequestAuthUser(req) });
  });

  app.post("/api/logout", (req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return res.json({ success: true });
  });

  // Vuln Endpoints
  app.get("/api/vulnerabilities", async (req, res) => {
    try {
      const dbVulns = await prisma.vulnerability.findMany({
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

      return res.json(
        dbVulns.map((v) => ({
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
        })),
      );
    } catch {
      return res.status(500).json({ success: false, message: "获取漏洞列表失败" });
    }
  });

  app.post("/api/vulnerabilities", requireAuth, async (req, res) => {
    try {
      const { title, url, type, level, description } = req.body as Record<string, string>;
      const submitter = getRequestAuthUser(req);
      if (!submitter) return res.status(401).json({ success: false, message: "未登录" });

      const year = new Date().getFullYear();
      const existingCodes = await prisma.vulnerability.findMany({
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

      const created = await prisma.vulnerability.create({
        data: {
          vulnCode,
          title,
          targetUrl: url,
          vulnType: type,
          severity: cnToSeverity(level),
          status: "pending",
          description,
          submitterId: submitter.id,
          submittedAt: new Date(),
        },
        include: {
          submitter: { select: { username: true } },
        },
      });

      await prisma.vulnerabilityAudit.create({
        data: {
          vulnerabilityId: created.id,
          auditorId: created.submitterId,
          action: "submit",
          toStatus: "pending",
          note: "漏洞已提交，待审核。",
        },
      });

      return res.json({
        success: true,
        vuln: {
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
        },
      });
    } catch {
      return res.status(500).json({ success: false, message: "漏洞提交失败" });
    }
  });

  app.patch("/api/vulnerabilities/:id", requireAuth, requireRoles("admin", "auditor"), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body as Record<string, unknown>;

      const existing = await prisma.vulnerability.findUnique({
        where: { vulnCode: id },
      });
      if (!existing) {
        return res.status(404).json({ success: false, message: "漏洞不存在" });
      }

      const data: Record<string, unknown> = {};
      if (typeof updates.title === "string") data.title = updates.title;
      if (typeof updates.url === "string") data.targetUrl = updates.url;
      if (typeof updates.type === "string") data.vulnType = updates.type;
      if (typeof updates.level === "string") data.severity = cnToSeverity(updates.level);
      if (typeof updates.description === "string") data.description = updates.description;
      if (typeof updates.status === "string") data.status = cnToStatus(updates.status);

      const updated = await prisma.vulnerability.update({
        where: { vulnCode: id },
        data,
      });

      if (typeof updates.status === "string" || typeof updates.auditNote === "string") {
        await prisma.vulnerabilityAudit.create({
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

      return res.json({ success: true });
    } catch {
      return res.status(500).json({ success: false, message: "漏洞更新失败" });
    }
  });

  // Announcement Endpoints
  app.get("/api/announcements", async (req, res) => {
    try {
      const rows = await prisma.announcement.findMany({
        include: {
          author: { select: { username: true } },
        },
        where: { status: { not: "archived" } },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      });

      return res.json(
        rows.map((a) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          date: toDateString(a.publishedAt ?? a.createdAt),
          author: a.author.username,
          type: announcementTypeToCn(a.type),
          isPinned: a.isPinned,
        })),
      );
    } catch {
      return res.status(500).json({ success: false, message: "获取公告失败" });
    }
  });

  app.post("/api/announcements", requireAuth, requireRoles("admin", "auditor"), async (req, res) => {
    try {
      const { title, content, type, isPinned, author } = req.body as Record<string, unknown>;
      const authorName = typeof author === "string" ? author : getRequestAuthUser(req)?.username ?? "";
      const dbAuthor = await prisma.user.findUnique({ where: { username: authorName } });

      if (!dbAuthor) {
        return res.status(404).json({ success: false, message: "发布者不存在" });
      }

      const created = await prisma.announcement.create({
        data: {
          title: String(title ?? ""),
          content: String(content ?? ""),
          type: cnToAnnouncementType(typeof type === "string" ? type : undefined),
          isPinned: Boolean(isPinned),
          authorId: dbAuthor.id,
          status: "published",
          publishedAt: new Date(),
        },
        include: {
          author: { select: { username: true } },
        },
      });

      return res.json({
        success: true,
        announcement: {
          id: created.id,
          title: created.title,
          content: created.content,
          date: toDateString(created.publishedAt ?? created.createdAt),
          author: created.author.username,
          type: announcementTypeToCn(created.type),
          isPinned: created.isPinned,
        },
      });
    } catch {
      return res.status(500).json({ success: false, message: "公告发布失败" });
    }
  });

  app.delete("/api/announcements/:id", requireAuth, requireRoles("admin", "auditor"), async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.announcement.update({
        where: { id },
        data: { status: "archived" },
      });
      return res.json({ success: true });
    } catch {
      return res.status(404).json({ success: false, message: "公告不存在" });
    }
  });

  app.put("/api/announcements/:id", requireAuth, requireRoles("admin", "auditor"), async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, type, isPinned } = req.body as Record<string, unknown>;

      const updated = await prisma.announcement.update({
        where: { id },
        data: {
          title: typeof title === "string" ? title : undefined,
          content: typeof content === "string" ? content : undefined,
          type: typeof type === "string" ? cnToAnnouncementType(type) : undefined,
          isPinned: typeof isPinned === "boolean" ? isPinned : undefined,
        },
        include: {
          author: { select: { username: true } },
        },
      });

      return res.json({
        success: true,
        announcement: {
          id: updated.id,
          title: updated.title,
          content: updated.content,
          date: toDateString(updated.publishedAt ?? updated.createdAt),
          author: updated.author.username,
          type: announcementTypeToCn(updated.type),
          isPinned: updated.isPinned,
        },
      });
    } catch {
      return res.status(404).json({ success: false, message: "公告不存在" });
    }
  });

  // User Endpoints
  app.get("/api/users", requireAuth, requireRoles("admin"), async (req, res) => {
    try {
      const dbUsers = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
      });

      return res.json(
        dbUsers.map((u) => ({
          id: u.id,
          username: u.username,
          role: u.role,
          email: u.email,
          authCode: u.authCode,
          points: u.points,
          registrationDate: toDateString(u.createdAt),
          status: toDisplayStatus(u.status),
          hasSignedAgreement: u.hasSignedAgreement,
        })),
      );
    } catch {
      return res.status(500).json({ success: false, message: "获取用户失败" });
    }
  });

  app.post("/api/users", requireAuth, requireRoles("admin"), async (req, res) => {
    try {
      const { username, email, role, authCode, points, status } = req.body;

      const createdUser = await prisma.user.create({
        data: {
          username,
          email,
          authCode,
          role: normalizeRole(role),
          points: Number(points) || 0,
          status: normalizeStatus(status),
          passwordHash: await bcrypt.hash("password123", 10),
          hasSignedAgreement: false,
        },
      });

      return res.status(201).json({
        success: true,
        user: {
          id: createdUser.id,
          username: createdUser.username,
          email: createdUser.email,
          role: createdUser.role,
          authCode: createdUser.authCode,
          points: createdUser.points,
          registrationDate: toDateString(createdUser.createdAt),
          status: toDisplayStatus(createdUser.status),
          hasSignedAgreement: createdUser.hasSignedAgreement,
        },
      });
    } catch {
      return res.status(400).json({ success: false, message: "用户创建失败（可能存在重复字段）" });
    }
  });

  app.patch("/api/users/:id", requireAuth, requireRoles("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body as Record<string, unknown>;

      const data: Record<string, unknown> = {};
      if (typeof updates.username === "string") data.username = updates.username;
      if (typeof updates.email === "string") data.email = updates.email;
      if (typeof updates.authCode === "string") data.authCode = updates.authCode;
      if (typeof updates.role === "string") data.role = normalizeRole(updates.role);
      if (typeof updates.status === "string") data.status = normalizeStatus(updates.status);
      if (updates.points !== undefined) data.points = Number(updates.points);
      if (typeof updates.hasSignedAgreement === "boolean") {
        data.hasSignedAgreement = updates.hasSignedAgreement;
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data,
      });

      return res.json({
        success: true,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          authCode: updatedUser.authCode,
          points: updatedUser.points,
          registrationDate: toDateString(updatedUser.createdAt),
          status: toDisplayStatus(updatedUser.status),
          hasSignedAgreement: updatedUser.hasSignedAgreement,
        },
      });
    } catch {
      return res.status(404).json({ success: false, message: "用户不存在或更新失败" });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRoles("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.user.delete({ where: { id } });
      return res.json({ success: true });
    } catch {
      return res.status(404).json({ success: false, message: "用户不存在" });
    }
  });

  app.post("/api/users/:id/reset-password", requireAuth, requireRoles("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      await prisma.user.update({
        where: { id },
        data: { passwordHash: await bcrypt.hash(newPassword || "123456", 10) },
      });

      return res.json({ success: true, message: "密码重置成功" });
    } catch {
      return res.status(404).json({ success: false, message: "用户不存在" });
    }
  });

  app.post("/api/users/:id/sign-agreement", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const authUser = getRequestAuthUser(req);
      if (!authUser) {
        return res.status(401).json({ success: false, message: "未登录" });
      }
      if (authUser.role !== "admin" && authUser.id !== id) {
        return res.status(403).json({ success: false, message: "权限不足" });
      }
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          hasSignedAgreement: true,
          agreementSignedAt: new Date(),
        },
      });

      return res.json({
        success: true,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          authCode: updatedUser.authCode,
          points: updatedUser.points,
          registrationDate: toDateString(updatedUser.createdAt),
          status: toDisplayStatus(updatedUser.status),
          hasSignedAgreement: updatedUser.hasSignedAgreement,
        },
      });
    } catch {
      return res.status(404).json({ success: false, message: "用户不存在" });
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
      return res.status(500).json({ success: false, message: "获取证书失败" });
    }
  });

  app.post("/api/certificates", requireAuth, requireRoles("admin", "auditor"), async (req, res) => {
    try {
      const { vulnId, username, title, type } = req.body as Record<string, string>;

      const certOwner = await prisma.user.findUnique({ where: { username } });
      if (!certOwner) {
        return res.status(404).json({ success: false, message: "证书用户不存在" });
      }

      const vulnerability = await prisma.vulnerability.findUnique({
        where: { vulnCode: vulnId },
      });
      if (!vulnerability) {
        return res.status(404).json({ success: false, message: "关联漏洞不存在" });
      }

      const issuer =
        (await prisma.user.findFirst({ where: { role: "admin" }, select: { id: true } })) ??
        { id: certOwner.id };

      const year = new Date().getFullYear();
      const existingCodes = await prisma.certificate.findMany({
        where: { certCode: { startsWith: `CERT-${year}-` } },
        select: { certCode: true },
      });
      const maxSerial = existingCodes.reduce((max, item) => {
        const serial = Number(item.certCode.split("-")[2]);
        if (Number.isNaN(serial)) return max;
        return Math.max(max, serial);
      }, 0);
      const nextSerial = String(maxSerial + 1).padStart(3, "0");
      const certCode = `CERT-${year}-${nextSerial}`;

      const created = await prisma.certificate.create({
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
      return res.status(400).json({ success: false, message: "证书发放失败（可能已存在关联证书）" });
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
        return res.status(404).json({ message: "Certificate not found" });
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
      return res.status(500).json({ message: "Certificate search failed" });
    }
  });

  app.get("/api/certificates/:id/pdf", async (req, res) => {
    try {
      const { id } = req.params;
      const cert = await prisma.certificate.findUnique({
        where: { certCode: id },
        include: {
          user: { select: { username: true } },
          vulnerability: { select: { vulnCode: true, title: true } },
          issuedBy: { select: { username: true } },
        },
      });

      if (!cert) {
        return res.status(404).json({ success: false, message: "Certificate not found" });
      }

      const fontPath = getCertificateFontPath();
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const filename = `certificate-${cert.certCode}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
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
      return res.status(500).json({ success: false, message: "Certificate PDF generation failed" });
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
      return res.status(404).json({ message: "Certificate not found" });
    }
  });

  // Learning Center Endpoints
  app.get("/api/learning/labs", (req, res) => {
    res.json(labs);
  });

  app.get("/api/learning/materials", (req, res) => {
    res.json(materials);
  });

  app.get("/api/learning/discussions", (req, res) => {
    res.json(discussions);
  });

  // Mall Endpoints
  app.get("/api/mall/products", (req, res) => {
    res.json(products);
  });

  app.post("/api/mall/products", requireAuth, requireRoles("admin"), (req, res) => {
    const product = { ...req.body, id: `P00${products.length + 1}` };
    products.push(product);
    res.json({ success: true, product });
  });

  app.get("/api/mall/redemptions", requireAuth, (req, res) => {
    const authUser = getRequestAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, message: "未登录" });
    }
    const { userId } = req.query;
    if (authUser.role === "user") {
      return res.json(redemptions.filter((r) => r.userId === authUser.id));
    }
    if (userId) {
      return res.json(redemptions.filter((r) => r.userId === userId));
    }
    return res.json(redemptions);
  });

  app.post("/api/mall/redemptions", requireAuth, async (req, res) => {
    try {
      const authUser = getRequestAuthUser(req);
      if (!authUser) {
        return res.status(401).json({ success: false, message: "未登录" });
      }
      const { userId, productId } = req.body;
      if (authUser.role === "user" && authUser.id !== userId) {
        return res.status(403).json({ success: false, message: "仅可为本人发起兑换" });
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const product = products.find((p) => p.id === productId);

      if (!user || !product) {
        return res.status(404).json({ success: false, message: "用户或商品不存在" });
      }

      if (user.points < product.price) {
        return res.status(400).json({ success: false, message: "积分不足" });
      }

      if (product.stock <= 0) {
        return res.status(400).json({ success: false, message: "库存不足" });
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { points: user.points - product.price },
      });

      product.stock -= 1;
      if (product.stock === 0) product.status = "Out of Stock";

      const redemption = {
        id: `R00${redemptions.length + 1}`,
        userId: user.id,
        username: user.username,
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        points: product.price,
        date: new Date().toISOString().split("T")[0],
        status: "Pending",
      };

      redemptions.push(redemption);
      return res.json({ success: true, redemption, userPoints: updatedUser.points });
    } catch {
      return res.status(500).json({ success: false, message: "兑换失败" });
    }
  });

  app.patch("/api/mall/redemptions/:id", requireAuth, requireRoles("admin"), (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const index = redemptions.findIndex(r => r.id === id);
    if (index !== -1) {
      redemptions[index].status = status;
      res.json({ success: true, redemption: redemptions[index] });
    } else {
      res.status(404).json({ success: false, message: "兑换记录不存在" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
