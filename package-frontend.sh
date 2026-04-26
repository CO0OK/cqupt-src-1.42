#!/bin/bash
# CQUPT-SRC 前端打包脚本 (Linux/Mac)
# 用途：自动化打包前端代码和文档
# 生成时间：2026-04-22

set -e  # 出错立即退出

echo ""
echo "================================"
echo "CQUPT-SRC 前端打包脚本"
echo "================================"
echo ""

# 检查必要的目录是否存在
if [ ! -d "src" ]; then
    echo "错误：src 目录不存在，请在项目根目录运行此脚本"
    exit 1
fi

# 创建临时目录
echo "[1/6] 创建临时打包目录..."
rm -rf frontend-package-temp
mkdir -p frontend-package-temp

# 复制前端源代码
echo "[2/6] 复制前端源代码..."
cp -r src frontend-package-temp/
cp -r public frontend-package-temp/
cp index.html frontend-package-temp/

# 复制前端配置文件
echo "[3/6] 复制前端配置文件..."
cp vite.config.ts frontend-package-temp/
cp tsconfig.json frontend-package-temp/
cp eslint.config.js frontend-package-temp/

# 创建清理后的 package.json (仅前端依赖)
echo "[4/6] 创建前端专用 package.json..."
cat > frontend-package-temp/package.json << 'EOF'
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
    "@eslint/js": "^10.0.1",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "typescript": "^5.x",
    "vite": "^6.2.0"
  }
}
EOF

# 复制文档
echo "[5/6] 复制文档和说明..."
cp FRONTEND_PACKAGING_GUIDE.md frontend-package-temp/
cp FRONTEND_CODE_CHECKLIST.md frontend-package-temp/
cp API_SPECIFICATION.md frontend-package-temp/
cp .env.example frontend-package-temp/

# 创建 README
echo "[6/6] 创建 README..."
cat > frontend-package-temp/README.md << 'EOF'
# CQUPT-SRC 前端代码

这是 CQUPT-SRC 项目的前端代码打包，可独立用于与新后端集成。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173 即可使用

### 3. 构建生产版本

```bash
npm run build
```

输出到 `dist/` 目录

## 文档

- **FRONTEND_PACKAGING_GUIDE.md** - 前端打包和交接指南
- **FRONTEND_CODE_CHECKLIST.md** - 前端代码清单和集成步骤
- **API_SPECIFICATION.md** - 完整的 API 接口规范 ⭐ 新后端必读
- **.env.example** - 环境变量模板

## 与新后端集成

1. 更新 `vite.config.ts` 中的 API 代理地址
2. 根据 API_SPECIFICATION.md 实现后端接口
3. 确保后端支持 CORS 和 HTTP Only Cookie
4. 测试所有认证和授权流程

## 技术栈

- React 19 + TypeScript 5
- Vite 6 (构建工具)
- Tailwind CSS 4 (样式)
- Lucide React (图标)
- Motion (动画)

详见 package.json

## 关键文件

- `src/types.ts` - 所有 TypeScript 类型定义 ⭐ 新后端参考
- `src/App.tsx` - 应用主入口，处理认证流程
- `src/views/Login.tsx` - 登录页面
- `src/views/Register.tsx` - 注册页面
- `src/components/SliderCaptcha.tsx` - 滑动验证码组件

## 需要新后端实现的功能

详见 API_SPECIFICATION.md，包括：

- 用户认证和授权
- 漏洞管理和审核
- 积分商城
- 学习中心
- 证书管理
- 等等...

维护时间：2026-04-22
EOF

# 创建压缩包
echo ""
echo "正在压缩文件..."

TIMESTAMP=$(date +"%Y%m%d")
ARCHIVE_NAME="cqupt-src-frontend-${TIMESTAMP}.tar.gz"

tar -czf "$ARCHIVE_NAME" frontend-package-temp/

# 清理临时目录
rm -rf frontend-package-temp

echo ""
echo "================================"
echo "✓ 打包完成！"
echo "================================"
echo ""
echo "输出文件："
echo "  - $ARCHIVE_NAME"
echo ""
echo "包含文件："
echo "  - 前端源代码 (src/)"
echo "  - 静态资源 (public/)"
echo "  - 配置文件 (vite.config.ts 等)"
echo "  - 文档说明 (README, GUIDE, 等)"
echo "  - API 规范 (API_SPECIFICATION.md)"
echo ""
echo "下一步："
echo "  1. tar -xzf $ARCHIVE_NAME"
echo "  2. npm install"
echo "  3. npm run dev"
echo ""
