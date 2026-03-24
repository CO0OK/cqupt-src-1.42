# CQUPT-SRC 校园漏洞响应平台

CQUPT-SRC 是一个面向校园安全场景的漏洞响应与产教融合平台，提供以下核心能力：

- 漏洞提交、审核、状态流转与附件安全预览/下载
- 公告管理、学习中心、积分商城、证书管理
- 用户管理、排行榜、个人中心、操作审计日志

## 技术栈

- 前端：React 19 + TypeScript + Vite
- 后端：Node.js + Express + TypeScript
- 数据库：PostgreSQL
- ORM：Prisma 7

## 本地启动

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
cp .env.example .env
```

至少需要配置：

- `DATABASE_URL`
- `JWT_SECRET`

可选生产化配置：

- `REDIS_URL`（邮箱验证码存储）
- `SMTP_HOST/SMTP_PORT/SMTP_SECURE/SMTP_USER/SMTP_PASS/SMTP_FROM`（真实邮件发送）

3. 生成 Prisma Client

```bash
npm run db:generate
```

4. 初始化数据库

```bash
npm run db:migrate
npm run db:seed
```

5. 启动开发服务

```bash
npm run dev
```

## 质量检查

```bash
npx tsc --noEmit
npm run smoke:api
npm run preflight:release
```

## 关键文档

- `docs/project-plan.md`：项目计划与交接
- `docs/backend-design.md`：后端设计说明
- `docs/release-checklist.md`：发布检查清单
