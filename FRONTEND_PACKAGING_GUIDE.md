# CQUPT-SRC 前端打包与交接指南

**生成时间**：2026-04-22  
**用途**：将前端代码和关键业务信息打包，为新后端开发做准备

---

## 📋 打包清单总览

### 第一部分：前端源代码 (完整可复用)
```
frontend-package/
├── src/                           # 前端源代码
│   ├── components/               # React 组件库
│   ├── views/                    # 页面组件
│   ├── utils/                    # 工具函数
│   ├── App.tsx                   # 应用主组件
│   ├── main.tsx                  # 入口文件
│   ├── types.ts                  # TypeScript 类型定义 ⭐ 重要
│   └── constants.ts              # 常量定义
├── public/                        # 静态资源
├── index.html                     # HTML 模板
├── vite.config.ts                # Vite 构建配置
├── tsconfig.json                 # TypeScript 配置
├── tailwind.config.js            # Tailwind CSS 配置
├── eslint.config.js              # ESLint 配置
└── package.json                  # 依赖配置
```

### 第二部分：业务需求文档 (新后端参考)
```
business-docs/
├── API_SPECIFICATION.md          # ⭐⭐⭐ API 接口完整清单
├── DATA_MODELS.md                # ⭐⭐⭐ 数据库表结构与枚举
├── USER_FLOWS.md                 # 用户操作流程文档
├── BUSINESS_RULES.md             # ⭐⭐ 业务规则与约束
├── AUTHENTICATION.md             # ⭐⭐ 认证授权规范
└── ERROR_CODES.md                # ⭐ 错误码定义
```

### 第三部分：配置与部署文件
```
config-files/
├── nginx.conf                    # Nginx 反向代理配置
├── docker-compose.yml            # Docker 编排文件（供参考）
├── Dockerfile                    # Docker 构建文件（供参考）
├── .env.example                  # 环境变量模板
└── prisma/schema.prisma          # ⭐ Prisma 数据模型
```

---

## 🎯 核心交接物

### 1. 前端依赖清单
**技术栈**：
- **框架**：React 19 + TypeScript 5
- **构建**：Vite 6.2 + TailwindCSS 4.1
- **UI 库**：Lucide React (图标) + Motion (动画)
- **认证**：JWT (浏览器 Cookie 存储)
- **验证**：自定义滑动验证码

**关键 npm 依赖**：
```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "vite": "^6.2.0",
  "@vitejs/plugin-react": "^5.0.4",
  "@tailwindcss/vite": "^4.1.14",
  "lucide-react": "^0.546.0",
  "motion": "^12.23.24",
  "typescript": "^5.x"
}
```

### 2. API 接口清单 (新后端需实现)

#### 认证相关
| 端点 | 方法 | 说明 | 需登录 |
|------|------|------|---------|
| `/api/login` | POST | 用户登录 | ❌ |
| `/api/register` | POST | 用户注册 | ❌ |
| `/api/auth/me` | GET | 获取当前登录用户 | ✅ |
| `/api/logout` | POST | 用户登出 | ✅ |
| `/api/auth/email-code/register/send` | POST | 发送注册验证码 | ❌ |
| `/api/auth/email-code/password/send` | POST | 发送修改密码验证码 | ✅ |
| `/api/auth/email-code/forgot/send` | POST | 发送忘记密码验证码 | ❌ |
| `/api/auth/password/forgot/reset` | POST | 重置忘记的密码 | ❌ |

#### 漏洞管理
| 端点 | 方法 | 说明 | 权限 |
|------|------|------|------|
| `/api/vulnerabilities` | GET | 获取漏洞列表 | 需登录 |
| `/api/vulnerabilities` | POST | 提交漏洞 | user |
| `/api/vulnerabilities/:id` | GET | 获取漏洞详情 | 需登录 |
| `/api/vulnerabilities/:id` | PATCH | 更新漏洞 | 作者/admin |
| `/api/vulnerabilities/:id/audit` | POST | 漏洞审核 | auditor/admin |
| `/api/vulnerabilities/:id/file` | GET | 下载漏洞附件 | 需登录 |

#### 用户管理
| 端点 | 方法 | 说明 | 权限 |
|------|------|------|------|
| `/api/users` | GET | 获取用户列表 | admin |
| `/api/users/:id` | GET | 获取用户详情 | 自己/admin |
| `/api/users/:id` | PATCH | 更新用户信息 | 自己/admin |
| `/api/users/search` | GET | 搜索用户排行榜 | 需登录 |
| `/api/users/:id/points` | PATCH | 调整用户积分 | admin |

#### 商城系统
| 端点 | 方法 | 说明 | 权限 |
|------|------|------|------|
| `/api/products` | GET | 获取商品列表 | 需登录 |
| `/api/products` | POST | 创建商品 | admin |
| `/api/products/:id` | PATCH | 编辑商品 | admin |
| `/api/products/:id` | DELETE | 删除商品 | admin |
| `/api/redemptions` | POST | 兑换商品 | user |
| `/api/redemptions` | GET | 获取兑换记录 | 需登录 |
| `/api/redemptions/:id` | PATCH | 发放兑换商品 | admin |

#### 学习中心
| 端点 | 方法 | 说明 | 权限 |
|------|------|------|------|
| `/api/learning` | GET | 获取学习资源 | 需登录 |
| `/api/learning` | POST | 创建学习资源 | auditor/admin |
| `/api/learning/:id` | PATCH | 编辑学习资源 | auditor/admin |
| `/api/learning/:id` | DELETE | 删除学习资源 | auditor/admin |
| `/api/learning/:id/complete` | POST | 标记已完成 | user |

#### 公告管理
| 端点 | 方法 | 说明 | 权限 |
|------|------|------|------|
| `/api/announcements` | GET | 获取公告列表 | 需登录 |
| `/api/announcements` | POST | 创建公告 | admin |
| `/api/announcements/:id` | PATCH | 编辑公告 | admin |
| `/api/announcements/:id` | DELETE | 删除公告 | admin |

#### 日志审计
| 端点 | 方法 | 说明 | 权限 |
|------|------|------|------|
| `/api/logs` | GET | 获取活动日志 | auditor/admin |

#### 证书管理
| 端点 | 方法 | 说明 | 权限 |
|------|------|------|------|
| `/api/certificates` | GET | 获取证书 | 需登录 |
| `/api/certificates` | POST | 发放证书 | admin |
| `/api/certificates/:id/pdf` | GET | 下载证书PDF | 需登录 |
| `/api/certificates/:id` | DELETE | 撤销证书 | admin |

### 3. 核心数据模型

**用户相关**：
```typescript
// UserRole: 'admin' | 'auditor' | 'user'
// UserStatus: 'active' | 'banned' | 'pending'
User {
  id: uuid
  username: string (unique, 50 chars)
  authCode: string (unique)    // 用于登录的编号
  email: string (unique)
  passwordHash: string         // bcryptjs 加密
  role: UserRole
  points: int
  avatar?: string
  registrationDate: date
  status: UserStatus
  hasSignedAgreement: boolean
}
```

**漏洞相关**：
```typescript
// VulnerabilitySeverity: 'critical' | 'high' | 'medium' | 'low' | 'info'
// VulnerabilityStatus: 'pending' | 'reviewing' | 'approved' | 'fixing' | 'fixed' | 'rejected' | 'hidden'
// VulnerabilityAuditAction: 'submit' | 'claim' | 'approve' | 'reject' | 'fixing' | 'fixed' | 'hide' | 'reopen'

Vulnerability {
  id: uuid
  title: string
  url: string
  type: string
  severity: VulnerabilitySeverity
  status: VulnerabilityStatus
  authorId: uuid (FK User)
  description: string
  attachment?: string (file path/URL)
  attachmentType?: string (pdf|zip|image)
  rewardPoints?: int
  submittedAt: date
  updatedAt: date
}

VulnerabilityAudit {
  id: uuid
  vulnerabilityId: uuid (FK)
  actorId: uuid (FK User)
  action: VulnerabilityAuditAction
  auditNote?: string
  createdAt: date
}
```

**商城相关**：
```typescript
// ProductStatus: 'active' | 'inactive' | 'out_of_stock'
// RedemptionStatus: 'pending' | 'issued' | 'cancelled'

Product {
  id: uuid
  name: string
  description?: string
  imageUrl?: string
  category: string
  pointsCost: int
  stock: int
  status: ProductStatus
  createdAt: date
  updatedAt: date
}

Redemption {
  id: uuid
  userId: uuid (FK User)
  productId: uuid (FK Product)
  quantity: int
  pointsSpent: int
  status: RedemptionStatus
  redeemedAt: date
  issuedAt?: date
}

UserPointLog {
  id: uuid
  userId: uuid (FK User)
  changeType: PointChangeType  // 'vuln_reward' | 'mall_redeem' | 'manual_adjust' | 'certificate_bonus'
  points: int                   // 可以是负数
  reason?: string
  createdAt: date
}
```

**学习中心**：
```typescript
LearningMaterial {
  id: uuid
  title: string
  description?: string
  type: 'PDF' | 'Video' | 'Link' | 'Zip'
  contentUrl: string
  imageUrl?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  category: string
  points?: int (完成该资源可获得的积分)
  createdAt: date
  updatedAt: date
}

UserLearningProgress {
  id: uuid
  userId: uuid (FK User)
  materialId: uuid (FK LearningMaterial)
  completedAt?: date
  points_earned?: int
}
```

**其他**：
```typescript
// AnnouncementType: 'general' | 'security' | 'mall' | 'maintenance'
// AnnouncementStatus: 'draft' | 'published' | 'archived'
// CertificateType: 'honorary' | 'outstanding' | 'special'
// CertificateStatus: 'active' | 'revoked'

Announcement { ... }
Certificate { ... }
ActivityLog { ... }  // 审计日志
```

---

## 🔐 认证与授权体系

### JWT 令牌
```typescript
// 令牌载荷
{
  sub: userId,
  username: string,
  role: UserRole,
  iat: timestamp,
  exp: timestamp
}
```

**令牌存储方式**：
- 前端：HTTP Only Cookie (`cqupt_src_token`)
- 有效期：7 天
- 传递方式：自动包含在 Cookie 中

### 权限矩阵
```
┌─────────────┬────────┬─────────┬─────────┐
│ 功能        │ user   │ auditor │ admin   │
├─────────────┼────────┼─────────┼─────────┤
│ 提交漏洞    │ ✅     │ ✅      │ ✅      │
│ 漏洞审核    │ ❌     │ ✅      │ ✅      │
│ 查看所有日志│ ❌     │ ✅      │ ✅      │
│ 用户管理    │ ❌     │ ❌      │ ✅      │
│ 商城管理    │ ❌     │ ❌      │ ✅      │
│ 兑换商品    │ ✅     │ ✅      │ ✅      │
│ 发放证书    │ ❌     │ ❌      │ ✅      │
└─────────────┴────────┴─────────┴─────────┘
```

---

## 📝 前端路由结构

```
/                      # 登录/注册页（未登录显示）
  /login               # 登录页
  /register            # 注册页

/dashboard             # 主应用（需登录）
  /home                # 首页/仪表板
  /vulnerabilities     # 漏洞中心
    /submit            # 提交漏洞
    /:id               # 漏洞详情
    /audit             # 漏洞审核 (auditor/admin only)
  /learning            # 学习中心
    /manage            # 学习资源管理 (auditor/admin only)
  /mall                # 积分商城
    /manage            # 商品管理 (admin only)
  /leaderboard         # 用户排行榜
  /certificates        # 证书管理
    /manage            # 证书管理 (admin only)
  /announcements       # 公告中心
    /manage            # 公告管理 (admin only)
  /user-manage         # 用户管理 (admin only)
  /logs                # 活动日志 (auditor/admin only)
  /profile             # 个人中心
```

---

## 🛡️ 业务规则与约束

### 密码策略
- 长度：8-128 字符
- 必须包含：大写字母 + 小写字母 + 数字 + 特殊字符
- 特殊字符：`!@#$%^&*-_+=[]{}|;:'",.<>?/\`

### 漏洞状态流转
```
pending → reviewing → approved → fixing → fixed
                 ↘ rejected (any state)
                 ↘ hidden (any state)
                 ← reopen (回到 pending)
```

### 商城兑换事务
必须单事务完成：
1. 验证用户积分 ≥ 商品价格
2. 验证商品库存 > 0
3. 验证商品状态为 'active'
4. 扣减库存（使用条件更新防止超卖）
5. 扣减用户积分
6. 创建兑换记录
7. 记录积分日志
8. 写入审计日志

### 邮箱验证码
- 有效期：10 分钟
- 尝试次数：最多 5 次
- 存储方式：Redis (生产) 或内存 (开发)
- 使用场景：注册、修改密码、忘记密码

---

## 🚀 新后端开发清单

### 必须实现的功能
- [ ] 完整的 API 接口（见上表）
- [ ] JWT 认证与 HTTP Only Cookie
- [ ] 所有权限校验和角色控制
- [ ] 数据库迁移和种子数据
- [ ] 邮箱验证码逻辑
- [ ] 密码加密与验证 (bcryptjs)
- [ ] 商城事务处理（防止超卖）
- [ ] 漏洞状态流转与审计
- [ ] PDF 证书生成与下载
- [ ] 文件上传与预览（漏洞附件）
- [ ] 活动日志记录
- [ ] 错误处理与统一响应格式

### 建议使用的技术栈
- **语言**：TypeScript（与前端保持一致）
- **框架**：Express / Nest.js / Fastify
- **数据库**：PostgreSQL（已确定）
- **ORM**：Prisma / TypeORM / Sequelize
- **认证**：JWT + bcryptjs
- **邮件**：Nodemailer / SendGrid
- **缓存**：Redis（可选，用于验证码和会话）
- **文件存储**：本地存储 / AWS S3 / OSS

---

## 📦 打包方式

### 推荐的打包结构
```bash
# 1. 前端代码打包
frontend-package/
├── src/
├── public/
├── vite.config.ts
├── tsconfig.json
├── package.json
├── tailwind.config.js
├── eslint.config.js
└── README-FRONTEND.md

# 2. 业务文档
business-docs/
├── API_SPECIFICATION.md
├── DATA_MODELS.md
├── BUSINESS_RULES.md
├── AUTHENTICATION.md
└── ERROR_CODES.md

# 3. 配置参考
config-reference/
├── prisma.schema.example
├── nginx.conf
├── docker-compose.example.yml
└── .env.example
```

### 快速打包命令
```bash
# 打包前端
zip -r frontend-package.zip src/ public/ vite.config.ts tsconfig.json package.json *.config.js

# 打包文档
zip -r business-docs.zip docs/CLOUD_DEPLOYMENT.md FRONTEND_PACKAGING_GUIDE.md docs/backend-design.md

# 合并
zip -r cqupt-src-frontend-delivery.zip frontend-package.zip business-docs.zip config-reference/
```

---

## ✅ 验收标准

新后端完成后需验证：

- [ ] 所有 API 端点正常响应
- [ ] JWT 认证/授权生效
- [ ] 密码符合策略
- [ ] 商城事务不会超卖
- [ ] 漏洞状态流转正确
- [ ] 邮箱验证码可用
- [ ] 文件上传下载正常
- [ ] 权限控制有效
- [ ] 错误响应格式统一
- [ ] 审计日志完整记录
- [ ] 前端所有页面能正常使用

---

## 📞 常见问题

### Q：前端如何与新后端集成？
**A：** 主要修改：
1. 更新 `vite.config.ts` 中的 API 代理地址
2. 如果 API 响应格式不同，需要在 API 调用处适配
3. 确保新后端支持 CORS 和 HTTP Only Cookie

### Q：是否需要修改前端代码？
**A：** 一般不需要，除非：
- 新后端的 API 路径或响应格式不同
- 需要添加新功能
- 需要调整权限逻辑

### Q：数据库迁移？
**A：** 前后端分离，新后端可以：
- 使用相同的数据库（直接迁移）
- 使用新数据库（需要数据迁移脚本）

### Q：如何处理依赖版本？
**A：** 建议：
- `package.json` 中的版本号仅供参考
- 新后端可以根据实际情况调整（确保兼容性）
- 定期更新依赖以获得安全补丁

---

**文档完成日期**：2026-04-22  
**维护人**：GitHub Copilot  
**版本**：1.0
