# CQUPT-SRC 漏洞靶场 · 教师指导手册

> **注意**：本文档仅供教师/出题人查阅，请勿分发给学生。

本系统已改造为面向网络安全专业学生的实战漏洞靶场，外观和功能与真实业务系统一致，但在代码层故意埋入了 **8 个真实世界中常见的安全漏洞**，覆盖 OWASP Top 10 核心类型。

---

## 漏洞清单

### 漏洞 1：水平越权 / IDOR
**位置**：`GET /api/users/:id`  
**影响**：任意已登录用户可通过用户 UUID 或用户名查看其他用户的完整信息（邮箱、统一认证码、积分、角色）  
**修改文件**：`src/server/modules/users/users.routes.ts`（新增了无 admin 限制的路由）  
**验证方式**：登录普通账号，然后访问 `GET /api/users/<其他用户ID>` 可获取该用户完整信息  
**对应 OWASP**：A01 - Broken Access Control

---

### 漏洞 2：Mass Assignment（垂直越权 / 自我提权）
**位置**：`PATCH /api/users/me/profile`  
**影响**：普通用户可在修改个人资料时携带 `role` 字段，将自己的角色提升为 `admin`  
**修改文件**：`src/server/modules/users/users.service.ts`（`updateSelfProfile` 接受 `role` 参数）  
**验证方式**：
```bash
curl -X PATCH /api/users/me/profile \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}' \
  --cookie "cqupt_src_token=<自己的token>"
```
**对应 OWASP**：A01 - Broken Access Control

---

### 漏洞 3：SQL 注入
**位置**：`GET /api/search?q=<keyword>`  
**影响**：搜索参数直接拼接到原始 SQL 语句，可实现 SQL 注入攻击  
**修改文件**：`server.ts`（使用 `$queryRawUnsafe` 拼接字符串）  
**验证方式**：
```
GET /api/search?q=' OR '1'='1
GET /api/search?q=' UNION SELECT id,username,email,points FROM "User" LIMIT 20--
```
**注意**：需要登录后才能访问此接口（带 Cookie）  
**对应 OWASP**：A03 - Injection

---

### 漏洞 4：业务逻辑漏洞（负数 quantity 积分刷取）
**位置**：`POST /api/mall/redemptions`  
**影响**：兑换接口允许传入负数 `quantity`，导致用户积分不减反增，商品库存也增加  
**修改文件**：`src/server/validators/mall.ts`（量验证从 `< 1` 改为允许负数）  
**验证方式**：
```json
POST /api/mall/redemptions
{
  "userId": "<自己的ID>",
  "productId": "<任意商品ID>",
  "quantity": -10
}
```
积分将增加 `商品单价 × 10`  
**对应 OWASP**：A04 - Insecure Design

---

### 漏洞 5：未授权调试接口（敏感信息泄露）
**位置**：`GET /api/system/status`（无需认证）  
**影响**：接口公开暴露 JWT 密钥、数据库连接字符串等核心机密配置  
**修改文件**：`server.ts`（添加了无鉴权的 debug 接口）  
**验证方式**：
```bash
curl http://localhost:3000/api/system/status
```
响应中包含 `config.jwtSecret` 和 `config.database`  
**对应 OWASP**：A05 - Security Misconfiguration

---

### 漏洞 6：弱 JWT 密钥 / JWT 伪造（与漏洞 5 联动）
**位置**：`server.ts` 中 `JWT_SECRET` 默认值  
**影响**：默认 JWT 密钥为已知字符串 `"dev-only-please-change-jwt-secret"`，配合漏洞 5 泄露的密钥，可伪造任意用户（含 admin）的 JWT Token  
**验证方式**：
1. 通过漏洞 5 获取 `jwtSecret`
2. 用 JWT 工具（如 jwt.io）伪造 payload：`{"userId": "<admin的UUID>", "role": "admin"}`
3. 用获取的密钥签名，替换 Cookie 即可以管理员身份访问  
**对应 OWASP**：A07 - Identification and Authentication Failures

---

### 漏洞 7：存储型 XSS（公告内容未过滤）
**位置**：`src/views/UserNotices.tsx` - 公告详情弹窗  
**影响**：管理员（或通过漏洞 2/6 提权的攻击者）发布含 `<script>` 的公告后，所有查看该公告的用户均会触发 XSS  
**修改文件**：公告内容使用 `dangerouslySetInnerHTML` 渲染  
**验证方式**：以 admin 身份创建公告，内容为：
```html
<img src=x onerror="alert('XSS by '+document.cookie)">
```
普通用户打开公告详情时触发  
**对应 OWASP**：A03 - Injection (XSS)

---

### 漏洞 8：未授权附件访问（IDOR + 无需认证）
**位置**：`GET /api/vulnerabilities/:id/attachment`  
**影响**：已去除认证检查，任何人（包括未登录访客）可直接下载任意漏洞报告的附件文件  
**修改文件**：`src/server/modules/vulnerabilities/vulnerabilities.routes.ts`（移除了 `requireAuth`）  
**验证方式**：
```bash
# 无需 Cookie
curl http://localhost:3000/api/vulnerabilities/VU-2026-0001/attachment -o attachment.pdf
```
**对应 OWASP**：A01 - Broken Access Control

---

## 漏洞难度分级

| 漏洞 | 难度 | 类型 |
|------|------|------|
| 漏洞 8：附件未授权访问 | ⭐ 入门 | 信息收集 |
| 漏洞 5：调试接口泄露 | ⭐ 入门 | 信息泄露 |
| 漏洞 1：水平越权 IDOR | ⭐⭐ 初级 | 访问控制 |
| 漏洞 7：存储型 XSS | ⭐⭐ 初级 | 注入 |
| 漏洞 4：业务逻辑漏洞 | ⭐⭐ 初级 | 逻辑缺陷 |
| 漏洞 2：Mass Assignment | ⭐⭐⭐ 中级 | 访问控制 |
| 漏洞 3：SQL 注入 | ⭐⭐⭐ 中级 | 注入 |
| 漏洞 6：JWT 伪造（联动） | ⭐⭐⭐⭐ 高级 | 认证绕过 |

---

## 推荐考核路线

**线性推进（适合初学者）**：
漏洞 8 → 漏洞 5 → 漏洞 1 → 漏洞 7 → 漏洞 4 → 漏洞 2

**链式利用（最完整攻击链）**：
漏洞 5（获取 JWT 密钥）→ 漏洞 6（伪造 admin Token）→ 漏洞 7（XSS 窃取 Cookie）→ 漏洞 3（SQL 注入获取所有用户数据）

---

## 部署注意事项

1. **仅在隔离网络环境中部署**，不要暴露到互联网
2. 数据库中预置若干测试用户和漏洞记录，增加真实感
3. 建议每次考核后重置数据库（`npm run db:migrate && npm run db:seed`）
4. 如需添加更多"诱饵数据"（如假的敏感文档作为附件），在 `prisma/seed.ts` 中添加

## 已知安全功能（故意保留，不是漏洞）

- 登录密码使用 bcrypt 哈希（不可爆破）
- 滑动验证码防自动化登录
- Cookie 设为 httpOnly（JS 无法直接读取，但 XSS 仍可通过 onerror 等方式利用）
- 密码策略：8位以上，包含大小写数字特殊字符
