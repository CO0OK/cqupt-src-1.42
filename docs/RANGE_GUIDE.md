# CQUPT-SRC 漏洞靶场 · 教师指导手册

> **注意**：本文档仅供教师/出题人查阅，请勿分发给学生。

本系统已改造为面向网络安全专业学生的实战漏洞靶场，外观和功能与真实业务系统一致，但在代码层故意埋入了 **11 个真实世界中常见的安全漏洞**，覆盖 OWASP Top 10 核心类型。

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
**影响**：`/api/system/status` 泄露的 `jwtSecret` 字段返回 `"dev-only-please-change-jwt-secret"`（演示用弱密钥），可配合 jwt.io 等工具伪造任意用户（含 admin）的 JWT Token  

> ⚠️ **教师注意**：实际运行环境使用随机强密钥，调试接口返回的是**固定演示弱密钥字符串**用于教学演示，与真实运行密钥无关，不存在实际安全风险。

**验证方式**：
1. 通过漏洞 5 获取响应中的 `jwtSecret` 字段（固定返回 `"dev-only-please-change-jwt-secret"`）
2. 用 JWT 工具（如 [jwt.io](https://jwt.io)）伪造 payload：`{"userId": "<admin的UUID>", "role": "admin"}`
3. 用上述密钥签名，将生成的 Token 替换浏览器 Cookie `cqupt_src_token` 即可以管理员身份访问  
**对应 OWASP**：A07 - Identification and Authentication Failures

---

### 漏洞 7：存储型 XSS（公告内容未过滤）
**位置**：`src/views/UserNotices.tsx` - 公告详情弹窗  
**影响**：管理员（或通过漏洞 2/6 提权的攻击者）发布含 `<script>` 的公告后，所有查看该公告的用户均会触发 XSS  
**修改文件**：公告内容使用 `dangerouslySetInnerHTML` 渲染  

> ⚠️ **前置条件**：触发此漏洞需要先拥有 admin 权限（通过漏洞 2 Mass Assignment 自我提权，或通过漏洞 6 JWT 伪造），再发布含恶意 payload 的公告。这是一条**链式利用路径**，不可单独触发。

**验证方式**：
1. 先通过漏洞 2 或漏洞 6 获取 admin 权限
2. 进入「公告管理」创建新公告，内容填写：
```html
<img src=x onerror="alert('XSS by '+document.cookie)">
```
3. 以普通用户账号打开「系统公告」查看该公告，弹窗触发  
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

### 漏洞 9：路径穿越文件读取
**位置**：`GET /api/files/preview?path=<path>`  
**影响**：文件预览接口直接将用户传入的 `path` 拼接到上传目录，未限制最终路径必须位于上传目录内，可读取服务器上的任意可读文件  
**修改文件**：`server.ts`（新增无鉴权文件预览接口，使用 `path.join(uploadRoot, rawPath)` 后直接读取）  
**验证方式**：
```bash
curl "http://localhost:3000/api/files/preview?path=../.env"
curl "http://localhost:3000/api/files/preview?path=../../../../etc/hostname"
```
**对应 OWASP**：A01 - Broken Access Control / A05 - Security Misconfiguration

---

### 漏洞 10：用户枚举
**位置**：`POST /api/login`  
**影响**：登录接口对“账号不存在”和“密码错误”返回不同错误信息，攻击者可枚举有效统一认证码  
**修改文件**：`server.ts`（登录失败分支返回不同提示）  
**验证方式**：
```json
// 不存在的统一认证码
{"authCode":"9999999","password":"WrongPass123!"}
```
返回 `账号不存在`

```json
// 存在的统一认证码，但密码错误
{"authCode":"<已存在的7位统一认证码>","password":"WrongPass123!"}
```
返回 `密码错误`  
**对应 OWASP**：A07 - Identification and Authentication Failures

---

### 漏洞 11：导出接口越权
**位置**：`GET /api/users/export`  
**影响**：用户数据导出接口只要求登录，不校验管理员权限，普通用户可导出全量用户 CSV，包含邮箱、统一认证码、角色、积分等信息  
**修改文件**：`src/server/modules/users/users.routes.ts`、`src/server/modules/users/users.controller.ts`  
**验证方式**：
```bash
curl "http://localhost:3000/api/users/export" \
  --cookie "cqupt_src_token=<普通用户token>" \
  -o users_export.csv
```
**对应 OWASP**：A01 - Broken Access Control

---

## 漏洞难度分级

| 漏洞 | 难度 | 类型 |
|------|------|------|
| 漏洞 8：附件未授权访问 | ⭐ 入门 | 信息收集 |
| 漏洞 5：调试接口泄露 | ⭐ 入门 | 信息泄露 |
| 漏洞 10：用户枚举 | ⭐ 入门 | 认证缺陷 |
| 漏洞 1：水平越权 IDOR | ⭐⭐ 初级 | 访问控制 |
| 漏洞 7：存储型 XSS | ⭐⭐ 初级 | 注入 |
| 漏洞 4：业务逻辑漏洞 | ⭐⭐ 初级 | 逻辑缺陷 |
| 漏洞 9：路径穿越文件读取 | ⭐⭐ 初级 | 文件读取 |
| 漏洞 11：导出接口越权 | ⭐⭐ 初级 | 访问控制 |
| 漏洞 2：Mass Assignment | ⭐⭐⭐ 中级 | 访问控制 |
| 漏洞 3：SQL 注入 | ⭐⭐⭐ 中级 | 注入 |
| 漏洞 6：JWT 伪造（联动） | ⭐⭐⭐⭐ 高级 | 认证绕过 |

---

## 推荐考核路线

**线性推进（适合初学者）**：
漏洞 10 → 漏洞 8 → 漏洞 5 → 漏洞 9 → 漏洞 11 → 漏洞 1 → 漏洞 7 → 漏洞 4 → 漏洞 2

**链式利用（最完整攻击链）**：
漏洞 5（获取 JWT 密钥）→ 漏洞 6（伪造 admin Token）→ 漏洞 7（XSS 窃取 Cookie）→ 漏洞 3（SQL 注入获取所有用户数据）

---

## 靶场运作机制（教师必读）

### 学生进入流程
1. 学生打开 `https://cquptsrc.asia` 进入 Portal 入口页
2. 点击「进入靶场」，系统自动分配一个独立 Slot（最多 10 人同时在线）
3. **系统自动重置该 Slot 的数据库**（从模板库 clone，每次全新），然后重启对应容器
4. 容器就绪后自动跳转至 `/`，学生即可开始考核
5. **会话时长 30 分钟**，超时或关闭浏览器后 Slot 自动释放，下一位学生进入时数据重新重置

### 监考提示
- 页面右上角水印显示学生的**访客编号**（如"第 3 位"），可用于截图取证
- 当前在线人数实时显示在水印中（如"在线 5/10"）
- 心跳检测：学生浏览器每 20 秒发送一次心跳，45 秒无心跳视为离线并释放 Slot

### 教师后台操作

**管理员登录**：
- 访问 `https://cquptsrc.asia`，进入靶场后使用以下账号登录（任意 Slot 均可）
- 账号：`admin` | 密码：`Cqupt@2026!`

**漏洞审核流程**：
1. 登录后进入「漏洞审核」模块，可查看所有学生提交的漏洞报告
2. 点击每条记录可查看详情（标题、描述、复现步骤、附件）
3. 在审核页面设置状态（通过/拒绝）及打分（积分）
4. 分数自动计入该学生的积分账户

**积分排行**：
- 「排行榜」模块实时显示所有用户积分排名
- 考核结束后在此截图存档

> **注意**：每个 Slot 的数据库相互独立，学生 A 提交的漏洞只在其所在 Slot 中可见。教师需要在考核期间**及时审核**，或提前告知学生：系统会话结束后数据会被重置。

---

## 部署注意事项

1. **考核期间开放，考核结束后建议关闭 80/443 端口**（通过云控制台安全组操作），防止非考核时段访问
2. 数据库中预置 33 个测试用户和 50 条漏洞记录，增加真实感；每位学生进入时自动获得全新副本，无需手动重置
3. 如需更新预置数据（诱饵数据、公告内容等），在 `cqupt_template` 数据库中修改，下一位学生进入时即生效
4. 如需添加更多"诱饵数据"（如假的敏感文档作为附件），在 `prisma/seed.ts` 中添加后重新执行 `init-range.sh`

## 已知安全功能（故意保留，不是漏洞）

- 登录密码使用 bcrypt 哈希（不可爆破）
- 滑动验证码防自动化登录
- Cookie 设为 httpOnly（JS 无法直接读取，但 XSS 仍可通过 onerror 等方式利用）
- 密码策略：8位以上，包含大小写数字特殊字符
