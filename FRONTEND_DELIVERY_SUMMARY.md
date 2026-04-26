# CQUPT-SRC 前端交接总结

**生成时间**：2026-04-22  
**项目阶段**：前后端分离，准备交接前端  
**目的**：为新后端开发提供完整的前端代码和接口规范

---

## 📌 核心信息速览

| 项目 | 说明 |
|------|------|
| **项目名** | CQUPT-SRC (校园安全响应平台) |
| **前端框架** | React 19 + TypeScript 5 |
| **UI 框架** | Tailwind CSS 4 |
| **构建工具** | Vite 6 |
| **状态管理** | React Hooks + LocalStorage |
| **认证方式** | JWT (HTTP Only Cookie) |
| **API 风格** | RESTful |
| **数据库** | PostgreSQL (新后端自己搭建) |

---

## 📦 已生成的交接文档

### 1. **FRONTEND_PACKAGING_GUIDE.md** ⭐⭐⭐ 必读
- 前端打包完整指南
- 打包清单和结构说明
- 前端依赖详细列表
- API 接口完整表格
- 核心数据模型说明
- 认证和授权体系
- 业务规则和约束
- 新后端开发清单

### 2. **API_SPECIFICATION.md** ⭐⭐⭐ 新后端必读
- 8 大类 API 接口（认证、漏洞、用户、商城、学习、公告、证书、日志）
- 每个接口的完整请求和响应格式
- 参数验证规则
- 错误处理规范
- CORS 和安全头配置
- 共计 40+ 个接口端点

### 3. **FRONTEND_CODE_CHECKLIST.md** ⭐⭐ 参考
- 前端源代码文件结构
- npm 依赖详细说明
- 关键文件代码解析
- 前端路由详表
- API 集成点列表
- 打包步骤和检查清单

### 4. **package-frontend.bat** (Windows) & **package-frontend.sh** (Linux/Mac)
- 自动化前端打包脚本
- 一键生成前端代码包

---

## 🚀 快速开始 (新后端开发者)

### 步骤 1：获取前端代码

**方式 A：使用打包脚本**
```bash
# Windows
package-frontend.bat

# Linux/Mac
bash package-frontend.sh
```

生成的压缩包名格式：`cqupt-src-frontend-20260422.tar.gz`

**方式 B：手动复制**
```
复制以下目录和文件：
src/
public/
vite.config.ts
tsconfig.json
tailwind.config.js
eslint.config.js
package.json
index.html
.env.example
```

### 步骤 2：启动前端开发

```bash
# 解压（如果使用脚本）
tar -xzf cqupt-src-frontend-20260422.tar.gz
cd cqupt-src-frontend-*

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

### 步骤 3：根据 API_SPECIFICATION.md 开发后端

**优先级顺序**（建议按此顺序开发）：
1. ⭐⭐⭐ **认证系统** - 登录/注册/认证检查
2. ⭐⭐ **用户管理** - 用户相关 API
3. ⭐⭐ **漏洞系统** - 漏洞提交/审核
4. ⭐⭐ **商城系统** - 商品和兑换
5. ⭐ **其他功能** - 学习、公告、证书、日志

### 步骤 4：集成与测试

```bash
# 修改 vite.config.ts 中的 API 地址
# 指向你的后端服务器

# 前端测试
npm run build  # 构建生产版本
npm run preview # 预览生产构建
```

---

## 📋 API 接口总览

### 认证相关 (8 个接口)
| 功能 | 端点 | 方法 | 优先级 |
|------|------|------|--------|
| 用户登录 | `/api/login` | POST | ⭐⭐⭐ |
| 用户注册 | `/api/register` | POST | ⭐⭐⭐ |
| 获取当前用户 | `/api/auth/me` | GET | ⭐⭐⭐ |
| 用户登出 | `/api/logout` | POST | ⭐⭐ |
| 发送注册验证码 | `/api/auth/email-code/register/send` | POST | ⭐⭐⭐ |
| 发送密码修改验证码 | `/api/auth/email-code/password/send` | POST | ⭐⭐ |
| 发送忘记密码验证码 | `/api/auth/email-code/forgot/send` | POST | ⭐⭐ |
| 重置忘记的密码 | `/api/auth/password/forgot/reset` | POST | ⭐⭐ |

### 漏洞管理 (6 个接口)
| 功能 | 端点 | 方法 | 权限 | 优先级 |
|------|------|------|------|--------|
| 获取漏洞列表 | `/api/vulnerabilities` | GET | 需登录 | ⭐⭐⭐ |
| 获取漏洞详情 | `/api/vulnerabilities/:id` | GET | 需登录 | ⭐⭐⭐ |
| 提交漏洞 | `/api/vulnerabilities` | POST | user | ⭐⭐⭐ |
| 更新漏洞 | `/api/vulnerabilities/:id` | PATCH | 作者/admin | ⭐⭐ |
| 审核漏洞 | `/api/vulnerabilities/:id/audit` | POST | auditor/admin | ⭐⭐ |
| 下载附件 | `/api/vulnerabilities/:id/file` | GET | 需登录 | ⭐⭐ |

### 其他接口 (26+ 个)
见 `API_SPECIFICATION.md`

---

## 🔑 关键业务规则

### 密码策略
```
长度：8-128 字符
必须包含：
  ✓ 大写字母 (A-Z)
  ✓ 小写字母 (a-z)
  ✓ 数字 (0-9)
  ✓ 特殊字符 (!@#$%^&*-_+=[]{}|;:'",.<>?/\)
```

### 漏洞状态流转
```
pending ─→ reviewing ─→ approved ─→ fixing ─→ fixed
          ├→ rejected (任意阶段)
          └→ hidden (任意阶段)
                      ← reopen (回到 pending)
```

### 商城兑换规则
```
1. 验证用户积分 ≥ 商品价格 × 数量
2. 验证商品库存 > 数量
3. 验证商品状态 = active
4. 原子事务执行：
   a. 扣减库存 (防止超卖)
   b. 扣减积分
   c. 创建兑换记录
   d. 记录积分日志
   e. 写入审计日志
```

### 用户角色和权限
```
┌──────┬─────────┬──────────┬──────┐
│ 功能 │ user    │ auditor  │ admin│
├──────┼─────────┼──────────┼──────┤
│提交漏洞 │ ✅    │ ✅      │ ✅  │
│审核漏洞 │ ❌    │ ✅      │ ✅  │
│查看日志 │ ❌    │ ✅      │ ✅  │
│用户管理 │ ❌    │ ❌      │ ✅  │
│商城管理 │ ❌    │ ❌      │ ✅  │
│兑换商品 │ ✅    │ ✅      │ ✅  │
│发放证书 │ ❌    │ ❌      │ ✅  │
└──────┴─────────┴──────────┴──────┘
```

---

## 🛠 前端代码架构

### 目录结构
```
src/
├── components/        # 可复用组件 (4 个)
│   ├── ConfirmModal.tsx
│   ├── Navbar.tsx
│   ├── ProfileModal.tsx
│   └── SliderCaptcha.tsx ⭐ 验证码
│
├── views/            # 页面组件 (17 个)
│   ├── Login.tsx              ⭐ 核心
│   ├── Register.tsx           ⭐ 核心
│   ├── Dashboard.tsx          ⭐ 主页面
│   ├── Home.tsx
│   ├── MyVulnerabilities.tsx
│   ├── VulnSubmit.tsx
│   ├── VulnAudit.tsx          (auditor)
│   ├── VulnManage.tsx         (admin)
│   ├── Mall.tsx
│   ├── MallManage.tsx         (admin)
│   ├── LearningCenter.tsx
│   ├── LearningManage.tsx     (auditor)
│   ├── Leaderboard.tsx
│   ├── Announcements.tsx
│   ├── AnnouncementManage.tsx (admin)
│   ├── Certificates.tsx
│   ├── CertificateManage.tsx  (admin)
│   ├── UserManage.tsx         (admin)
│   ├── Logs.tsx               (admin)
│   └── ProfileCenter.tsx
│
├── utils/             # 工具函数 (2 个)
│   ├── apiError.ts    # API 错误处理
│   └── passwordPolicy.ts # 密码验证
│
├── types.ts           # ⭐⭐⭐ 类型定义 (核心)
├── constants.ts       # 常量定义
├── App.tsx            # ⭐ 应用主入口
├── main.tsx           # 入口文件
└── index.css          # 全局样式
```

### 关键流程图

**登录流程**：
```
登录页面
  ↓
输入 authCode + 密码 + 滑动验证
  ↓
POST /api/login
  ↓
成功 → 保存 JWT Cookie + 用户信息
  ↓
GET /api/auth/me (验证令牌)
  ↓
导航到 Dashboard
```

**注册流程**：
```
注册页面
  ↓
输入邮箱 → POST /api/auth/email-code/register/send
  ↓
收到邮箱验证码（服务器日志打印）
  ↓
输入验证码 + 用户名 + 密码 → POST /api/register
  ↓
成功 → 返回登录页面
```

---

## 📊 技术债和已知限制

### 前端
- 无全局状态管理（使用 React Hooks + localStorage）
- 无离线支持
- 无 PWA 功能
- 无 SEO 优化（SPA 应用）

### 后端需要实现
- ✅ 完整的 API 接口 (40+ 个)
- ✅ 数据库设计 (参考 prisma/schema.prisma)
- ✅ JWT 认证和授权
- ✅ 邮件服务集成
- ✅ 文件上传和存储
- ✅ 事务处理 (商城兑换防止超卖)
- ✅ 审计日志记录
- ✅ 错误处理和验证
- ✅ CORS 配置
- ⚠️ 缓存策略 (可选，Redis)
- ⚠️ 消息队列 (可选，邮件异步处理)
- ⚠️ 单元测试
- ⚠️ API 文档 (可用 Swagger/OpenAPI)

---

## 🔍 前后端集成检查清单

### 前端准备
- [x] 代码打包完成
- [x] 文档编写完整
- [x] API 接口规范清晰
- [x] 类型定义准备就绪

### 后端开发（按优先级）
1. **认证系统** (必须先做)
   - [ ] `/api/login` - 登录
   - [ ] `/api/register` - 注册
   - [ ] `/api/auth/me` - 获取当前用户
   - [ ] `/api/logout` - 登出
   - [ ] 邮箱验证码相关接口

2. **用户管理**
   - [ ] `/api/users` - 用户列表
   - [ ] `/api/users/:id` - 用户详情
   - [ ] `/api/users/search` - 排行榜

3. **漏洞系统**
   - [ ] `/api/vulnerabilities` - 漏洞列表
   - [ ] `/api/vulnerabilities/:id` - 漏洞详情
   - [ ] 漏洞提交、审核、状态流转

4. **商城系统**
   - [ ] `/api/products` - 商品管理
   - [ ] `/api/redemptions` - 兑换管理
   - [ ] 防止超卖的事务处理

5. **其他功能**
   - [ ] 学习中心
   - [ ] 公告管理
   - [ ] 证书管理
   - [ ] 日志审计

### 集成测试
- [ ] 前端能正常启动
- [ ] 能成功登录
- [ ] 所有权限校验生效
- [ ] 所有业务流程可运行
- [ ] 错误消息正确显示
- [ ] 数据提交和查询正常

### 性能和安全
- [ ] HTTPS 配置
- [ ] CORS 正确配置
- [ ] SQL 注入防护
- [ ] XSS 防护
- [ ] CSRF 令牌（如需要）
- [ ] 速率限制
- [ ] 输入验证

---

## 📞 常见问题

### Q1：如何与现有的 PostgreSQL 数据库集成？
**A：** 新后端可以：
- 使用相同的 `DATABASE_URL` 和 Prisma schema
- 或者创建新数据库并编写迁移脚本
- 建议使用 Prisma 或 TypeORM 作为 ORM

### Q2：如何处理文件上传（漏洞附件）？
**A：** 有几种选择：
- 本地存储：`./uploads/` 目录
- 对象存储：AWS S3、阿里云 OSS 等
- 数据库：Base64 编码存储（不推荐大文件）

### Q3：邮件发送怎么实现？
**A：** 
- **开发环境**：在服务器日志中打印验证码
- **生产环境**：集成 SMTP 服务或第三方邮件服务
  - Nodemailer + SMTP
  - SendGrid / Mailgun / SES

### Q4：密码加密使用什么方案？
**A：** 建议使用 `bcryptjs`：
```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash(password, 10);
const match = await bcrypt.compare(password, hash);
```

### Q5：JWT 令牌过期如何处理？
**A：** 
- 短期 token (15 分钟) + refresh token (7 天)
- 或者设置较长的有效期 (7 天)
- 前端自动处理过期后的重新登录

### Q6：如何防止商城超卖？
**A：** 在数据库层使用条件更新：
```sql
UPDATE products 
SET stock = stock - ?
WHERE id = ? AND stock >= ?
```
配合事务确保原子性。

---

## 📁 打包后的交接物清单

```
cqupt-src-frontend-20260422.tar.gz
│
├── src/                              # 前端源代码
│   ├── components/
│   ├── views/
│   ├── utils/
│   ├── App.tsx
│   ├── main.tsx
│   ├── types.ts           ⭐⭐⭐
│   ├── constants.ts
│   └── index.css
│
├── public/                           # 静态资源
├── index.html                        # HTML 模板
│
├── 配置文件/
│   ├── vite.config.ts     ⭐⭐
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── eslint.config.js
│   └── package.json       ⭐⭐
│
├── 文档/ (⭐⭐⭐ 必读)
│   ├── README.md
│   ├── FRONTEND_PACKAGING_GUIDE.md    ⭐⭐⭐ 必读
│   ├── FRONTEND_CODE_CHECKLIST.md     ⭐⭐ 参考
│   ├── API_SPECIFICATION.md           ⭐⭐⭐ 新后端必读
│   └── .env.example
│
└── 脚本/
    ├── package-frontend.bat           (Windows)
    └── package-frontend.sh            (Linux/Mac)
```

---

## ✅ 验收标准

前端交接完成的标准：

1. **代码质量**
   - [x] TypeScript 无错误
   - [x] ESLint 无警告
   - [x] 所有类型定义完整
   - [x] 代码注释清晰

2. **文档完整性**
   - [x] API 规范详细
   - [x] 代码清单完整
   - [x] 打包指南清晰
   - [x] README 易理解

3. **打包质量**
   - [x] 无后端代码混入
   - [x] 无敏感信息
   - [x] 依赖清单准确
   - [x] 可独立运行

4. **新后端验收**
   - [ ] 能正常启动前端
   - [ ] 实现所有 API 接口
   - [ ] 通过功能测试
   - [ ] 满足性能需求

---

## 🚀 后续步骤

1. **立即处理**
   ```bash
   bash package-frontend.sh  # 生成打包文件
   ```

2. **交接给新后端团队**
   - 发送压缩包
   - 发送本文档
   - 发送 API_SPECIFICATION.md

3. **新后端开发**
   - 按优先级开发 API 接口
   - 参考 src/types.ts 设计响应格式
   - 定期与前端同步进度

4. **集成和测试**
   - 修改前端 vite.config.ts API 地址
   - 运行前端开发服务器
   - 手工测试所有功能流程
   - 运行冒烟测试

5. **上线前**
   - 前端构建生产版本：`npm run build`
   - 部署到 CDN 或 Web 服务器
   - 配置 HTTPS 和 CORS
   - 最终集成测试

---

## 📞 联系方式

如有问题，请参考：
- **API 问题** → `API_SPECIFICATION.md`
- **前端问题** → `FRONTEND_CODE_CHECKLIST.md`
- **打包问题** → `FRONTEND_PACKAGING_GUIDE.md`
- **整体问题** → 本文档

---

**文档版本**：1.0  
**生成时间**：2026-04-22  
**维护人**：GitHub Copilot  
**下一个版本**：根据新后端实现进度更新

---

## 📊 项目时间轴

| 日期 | 里程碑 | 状态 |
|------|--------|------|
| 2026-04-22 | 前端打包准备完成 | ✅ |
| TBD | 新后端认证系统完成 | ⏳ |
| TBD | 新后端全部 API 完成 | ⏳ |
| TBD | 集成测试通过 | ⏳ |
| TBD | 上线部署 | ⏳ |

---

祝新后端开发顺利！🚀
