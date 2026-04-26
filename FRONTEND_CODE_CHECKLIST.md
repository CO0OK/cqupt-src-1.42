# 前端代码打包清单

**生成时间**：2026-04-22  
**用途**：完整列出前端所有文件和依赖，便于提取和迁移

---

## 📦 前端文件结构清单

### 前端核心源代码

```
src/
├── components/
│   ├── ConfirmModal.tsx           # 确认对话框
│   ├── Navbar.tsx                 # 导航栏
│   ├── ProfileModal.tsx            # 用户信息模态框
│   └── SliderCaptcha.tsx           # 滑动验证码组件 ⭐ 关键
│
├── views/
│   ├── AnnouncementManage.tsx      # 公告管理页面 (admin only)
│   ├── CertificateManage.tsx       # 证书管理页面 (admin only)
│   ├── CertificateSearch.tsx       # 证书查询页面
│   ├── Dashboard.tsx               # 仪表盘/主页面 ⭐ 主要
│   ├── Home.tsx                    # 首页
│   ├── Leaderboard.tsx             # 排行榜页面
│   ├── LearningCenter.tsx          # 学习中心页面
│   ├── LearningManage.tsx          # 学习资源管理 (auditor/admin only)
│   ├── Login.tsx                   # 登录页面 ⭐ 核心
│   ├── Logs.tsx                    # 活动日志页面 (admin/auditor only)
│   ├── Mall.tsx                    # 积分商城页面
│   ├── MallManage.tsx              # 商品管理页面 (admin only)
│   ├── MyVulnerabilities.tsx       # 我的漏洞页面
│   ├── ProfileCenter.tsx           # 个人中心页面
│   ├── Register.tsx                # 注册页面 ⭐ 核心
│   ├── UserManage.tsx              # 用户管理页面 (admin only)
│   ├── UserNotices.tsx             # 用户通知/公告页面
│   ├── VulnAudit.tsx               # 漏洞审核页面 (auditor/admin only)
│   ├── VulnManage.tsx              # 漏洞管理页面 (admin only)
│   ├── VulnSubmit.tsx              # 漏洞提交页面
│   └── VulnSubmit.tsx              # 漏洞查看页面
│
├── utils/
│   ├── apiError.ts                 # API 错误处理工具
│   └── passwordPolicy.ts           # 密码策略验证工具
│
├── App.tsx                         # 应用主组件 ⭐ 核心
├── main.tsx                        # 应用入口文件
├── types.ts                        # TypeScript 类型定义 ⭐ 重要
├── constants.ts                    # 常量定义
└── index.css                       # 全局样式

public/
├── vite.svg                        # Vite logo
└── [其他静态资源]

index.html                          # HTML 模板文件
```

### 前端配置文件

```
root/
├── vite.config.ts                  # ⭐ Vite 构建配置 (重要)
├── tsconfig.json                   # TypeScript 配置
├── tailwind.config.js              # Tailwind CSS 配置
├── eslint.config.js                # ESLint 配置
├── package.json                    # ⭐ NPM 依赖清单 (重要)
├── package-lock.json               # 锁定版本文件
└── .env.example                    # 环境变量模板
```

---

## 📋 npm 依赖详单

### package.json 完整内容

```json
{
  "name": "cqupt-src",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint ."
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "vite": "^6.2.0",
    "@vitejs/plugin-react": "^5.0.4",
    "@tailwindcss/vite": "^4.1.14",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.x",
    "@eslint/js": "^10.0.1",
    "eslint": "^10.0.3",
    "autoprefixer": "^10.4.21",
    "tailwindcss": "^3.4.1"
  }
}
```

### 前端依赖说明

| 包名 | 版本 | 用途 | 是否必须 |
|------|------|------|---------|
| `react` | ^19.0.0 | UI 框架 | ✅ |
| `react-dom` | ^19.0.0 | React DOM 渲染 | ✅ |
| `vite` | ^6.2.0 | 构建工具 | ✅ |
| `@vitejs/plugin-react` | ^5.0.4 | Vite React 支持 | ✅ |
| `@tailwindcss/vite` | ^4.1.14 | Tailwind CSS (Vite 集成) | ✅ |
| `tailwindcss` | ^3.4.1 | 样式框架 | ✅ |
| `lucide-react` | ^0.546.0 | 图标库 | ✅ |
| `motion` | ^12.23.24 | 动画库 | ✅ |
| `typescript` | ^5.x | 类型检查 | ✅ |
| `@types/react` | ^19.0.0 | React TypeScript 类型 | ✅ |
| `@types/react-dom` | ^19.0.0 | React DOM TypeScript 类型 | ✅ |
| `eslint` | ^10.0.3 | 代码检查 | ❌ (可选) |
| `autoprefixer` | ^10.4.21 | CSS 前缀补齐 | ✅ |

### 后端包 (前端不需要)

以下包属于后端，不应包含在前端打包中：
- `express`
- `@prisma/client`
- `jsonwebtoken`
- `bcryptjs`
- `nodemailer`
- `pg`
- `pdfkit`
- `redis`
- `@google/genai`

---

## 🎯 关键文件说明

### 1. `src/types.ts` - 类型定义 ⭐⭐⭐ 重要

包含所有 TypeScript 接口定义，新后端需要参考这些类型来设计 API 响应格式。

**核心类型**：
- `User` - 用户对象
- `Vulnerability` - 漏洞对象
- `Product` - 商品对象
- `Redemption` - 兑换记录
- `Material` - 学习资源
- `Certificate` - 证书
- `Discussion` - 讨论
- `NavItem` - 导航项
- `Lab` - 实验室

### 2. `src/App.tsx` - 应用主入口 ⭐⭐ 重要

**关键逻辑**：
- 用户登录状态管理
- 路由切换 (登录/注册/仪表盘)
- LocalStorage 持久化
- `/api/auth/me` 自动恢复会话
- Dark mode 切换

### 3. `src/views/Login.tsx` - 登录页面 ⭐⭐ 重要

**关键功能**：
- 邮箱和密码输入
- `POST /api/login` 调用
- 滑动验证码集成
- 错误处理和显示
- 注册页面切换

### 4. `src/views/Register.tsx` - 注册页面 ⭐⭐ 重要

**关键流程**：
1. 用户输入邮箱 → `POST /api/auth/email-code/register/send`
2. 发送邮箱验证码 (在服务器日志中显示)
3. 用户输入验证码、用户名、密码
4. `POST /api/register` 注册
5. 返回登录页面

### 5. `src/components/SliderCaptcha.tsx` - 滑动验证码 ⭐ 重要

**功能**：
- 实现客户端验证码逻辑
- 返回 `captchaToken`
- 用于登录/注册时的机器人防护

### 6. `src/utils/apiError.ts` - API 错误处理

```typescript
// 统一处理 API 错误响应
interface ErrorResponse {
  success: false
  code: string
  message: string
  details?: Array<{
    field: string
    reason: string
  }>
}
```

### 7. `src/utils/passwordPolicy.ts` - 密码策略验证

```typescript
// 验证密码是否符合策略
// 要求：8-128 字符，包含大小写、数字、特殊字符
function validatePassword(password: string): boolean
```

---

## 🔧 构建和部署配置

### `vite.config.ts` 关键配置

```typescript
export default defineConfig({
  plugins: [react(), twind()],
  
  // API 代理配置 (开发环境)
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5173',  // 后端地址
        changeOrigin: true,
        // 不重写路径
      }
    }
  },
  
  // 构建输出配置
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  }
})
```

### `tsconfig.json` 关键配置

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "strict": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### `tailwind.config.js` 关键配置

```javascript
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // 自定义颜色
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    // 其他插件
  ]
}
```

---

## 📱 前端路由详表

| 路由 | 组件 | 权限 | 说明 |
|------|------|------|------|
| `/` | Login | 无 | 登录/注册入口 |
| `/login` | Login | 无 | 登录页面 |
| `/register` | Register | 无 | 注册页面 |
| `/dashboard` | Dashboard | ✅ | 主应用容器 |
| `/dashboard/home` | Home | ✅ | 首页/仪表盘 |
| `/dashboard/vulnerabilities` | MyVulnerabilities | ✅ | 我的漏洞 |
| `/dashboard/vulnerabilities/submit` | VulnSubmit | ✅ | 提交漏洞 |
| `/dashboard/vulnerabilities/:id` | [Detail] | ✅ | 漏洞详情 |
| `/dashboard/vulnerabilities/audit` | VulnAudit | auditor | 审核漏洞 |
| `/dashboard/vulnerabilities/manage` | VulnManage | admin | 漏洞管理 |
| `/dashboard/learning` | LearningCenter | ✅ | 学习中心 |
| `/dashboard/learning/manage` | LearningManage | auditor | 资源管理 |
| `/dashboard/mall` | Mall | ✅ | 积分商城 |
| `/dashboard/mall/manage` | MallManage | admin | 商品管理 |
| `/dashboard/leaderboard` | Leaderboard | ✅ | 排行榜 |
| `/dashboard/certificates` | CertificateSearch | ✅ | 证书查询 |
| `/dashboard/certificates/manage` | CertificateManage | admin | 证书管理 |
| `/dashboard/announcements` | UserNotices | ✅ | 公告中心 |
| `/dashboard/announcements/manage` | AnnouncementManage | admin | 公告管理 |
| `/dashboard/users` | UserManage | admin | 用户管理 |
| `/dashboard/logs` | Logs | admin | 日志查看 |
| `/dashboard/profile` | ProfileCenter | ✅ | 个人中心 |

---

## 🔌 API 集成点

### 前端调用的 API 端点列表

```javascript
// 认证相关
POST   /api/login
POST   /api/register
GET    /api/auth/me
POST   /api/logout
POST   /api/auth/email-code/register/send
POST   /api/auth/email-code/password/send
POST   /api/auth/email-code/forgot/send
POST   /api/auth/password/forgot/reset

// 漏洞相关
GET    /api/vulnerabilities
POST   /api/vulnerabilities
GET    /api/vulnerabilities/:id
PATCH  /api/vulnerabilities/:id
POST   /api/vulnerabilities/:id/audit
GET    /api/vulnerabilities/:id/file

// 用户相关
GET    /api/users
GET    /api/users/:id
PATCH  /api/users/:id
GET    /api/users/search
PATCH  /api/users/:id/points

// 商城相关
GET    /api/products
POST   /api/products
PATCH  /api/products/:id
DELETE /api/products/:id
POST   /api/redemptions
GET    /api/redemptions
PATCH  /api/redemptions/:id

// 学习中心
GET    /api/learning
POST   /api/learning
PATCH  /api/learning/:id
DELETE /api/learning/:id
POST   /api/learning/:id/complete

// 公告
GET    /api/announcements
POST   /api/announcements
PATCH  /api/announcements/:id
DELETE /api/announcements/:id

// 证书
GET    /api/certificates
POST   /api/certificates
GET    /api/certificates/:id/pdf
DELETE /api/certificates/:id

// 日志
GET    /api/logs
```

---

## 📦 打包步骤

### 步骤 1：准备前端源代码

```bash
# 复制以下目录和文件
src/                          # 前端源代码
public/                       # 静态资源
index.html                    # HTML 模板
vite.config.ts               # Vite 配置
tsconfig.json                # TypeScript 配置
tailwind.config.js           # Tailwind 配置
eslint.config.js             # ESLint 配置
package.json                 # 依赖清单 (仅包含前端依赖)
```

### 步骤 2：清理不必要的文件

删除以下文件和目录：
```
server.ts                     # 后端代码
src/server/                   # 后端代码
dist/                         # 构建输出
node_modules/                 # 依赖包（重新 npm install）
.env                          # 环境变量（使用 .env.example）
.git/                         # Git 仓库（可选）
```

### 步骤 3：创建 package.json (前端版)

仅保留前端相关依赖：

```json
{
  "name": "cqupt-src-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint ."
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.0.4",
    "@tailwindcss/vite": "^4.1.14",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.21",
    "eslint": "^10.0.3",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.x",
    "vite": "^6.2.0"
  }
}
```

### 步骤 4：修改 vite.config.ts

更新 API 代理地址指向新后端：

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',  // 改为新后端地址
        changeOrigin: true,
      }
    }
  }
})
```

### 步骤 5：打包成压缩包

```bash
# 使用 7zip 或 zip
zip -r cqupt-src-frontend.zip \
  src/ \
  public/ \
  index.html \
  vite.config.ts \
  tsconfig.json \
  tailwind.config.js \
  eslint.config.js \
  package.json \
  README-FRONTEND.md \
  FRONTEND_PACKAGING_GUIDE.md \
  API_SPECIFICATION.md
```

---

## 📐 前端开发环境快速启动

```bash
# 1. 解压前端代码
unzip cqupt-src-frontend.zip

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
# 访问 http://localhost:5173

# 4. 构建生产版本
npm run build
# 输出到 dist/ 目录
```

---

## ✅ 交接检查清单

前端打包时需要确认：

- [ ] `src/types.ts` 包含所有类型定义
- [ ] `src/App.tsx` 正确处理认证流程
- [ ] 所有页面组件正常显示
- [ ] API 调用端点正确（无拼写错误）
- [ ] 环境变量模板准备完整
- [ ] package.json 依赖版本合理
- [ ] 删除了所有后端代码
- [ ] 删除了生产密钥和敏感信息
- [ ] README 或文档清晰说明如何运行
- [ ] 密码策略验证逻辑清楚

---

## 🔄 迁移到新后端时的修改点

如果新后端使用不同的地址或格式，需要修改：

1. **Vite 代理配置** (`vite.config.ts`)
   ```javascript
   proxy: {
     '/api': {
       target: 'http://new-backend.com',  // 改这里
     }
   }
   ```

2. **API 响应适配** (如格式不同)
   ```typescript
   // 在 src/utils/apiError.ts 中调整解析逻辑
   ```

3. **类型定义** (如字段名不同)
   ```typescript
   // 在 src/types.ts 中更新接口定义
   ```

4. **环保变量** (.env)
   ```
   VITE_API_URL=http://new-backend.com
   ```

---

**文档版本**：1.0  
**最后更新**：2026-04-22  
**维护人**：GitHub Copilot
