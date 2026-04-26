@echo off
REM CQUPT-SRC 前端打包脚本 (Windows)
REM 用途：自动化打包前端代码和文档
REM 生成时间：2026-04-22

echo.
echo ================================
echo CQUPT-SRC 前端打包脚本
echo ================================
echo.

REM 检查目录是否存在
if not exist "src" (
    echo 错误：src 目录不存在，请在项目根目录运行此脚本
    pause
    exit /b 1
)

REM 创建临时目录
echo [1/5] 创建临时打包目录...
if exist "frontend-package-temp" rmdir /s /q "frontend-package-temp"
mkdir frontend-package-temp

REM 复制前端源代码
echo [2/5] 复制前端源代码...
xcopy src frontend-package-temp\src /e /y > nul
xcopy public frontend-package-temp\public /e /y > nul
copy index.html frontend-package-temp\ > nul

REM 复制前端配置文件
echo [3/5] 复制前端配置文件...
copy vite.config.ts frontend-package-temp\ > nul
copy tsconfig.json frontend-package-temp\ > nul
copy tailwind.config.js frontend-package-temp\ > nul
copy eslint.config.js frontend-package-temp\ > nul

REM 创建清理后的 package.json (仅前端依赖)
echo [4/5] 创建前端专用 package.json...
(
    echo {
    echo   "name": "cqupt-src-frontend",
    echo   "version": "1.0.0",
    echo   "private": true,
    echo   "type": "module",
    echo   "scripts": {
    echo     "dev": "vite",
    echo     "build": "vite build",
    echo     "preview": "vite preview",
    echo     "lint": "eslint ."
    echo   },
    echo   "dependencies": {
    echo     "react": "^19.0.0",
    echo     "react-dom": "^19.0.0"
    echo   },
    echo   "devDependencies": {
    echo     "@vitejs/plugin-react": "^5.0.4",
    echo     "@tailwindcss/vite": "^4.1.14",
    echo     "@types/react": "^19.0.0",
    echo     "@types/react-dom": "^19.0.0",
    echo     "autoprefixer": "^10.4.21",
    echo     "eslint": "^10.0.3",
    echo     "@eslint/js": "^10.0.1",
    echo     "lucide-react": "^0.546.0",
    echo     "motion": "^12.23.24",
    echo     "tailwindcss": "^3.4.1",
    echo     "typescript": "^5.x",
    echo     "vite": "^6.2.0"
    echo   }
    echo }
) > frontend-package-temp\package.json

REM 复制文档
echo [5/5] 复制文档和说明...
copy FRONTEND_PACKAGING_GUIDE.md frontend-package-temp\ > nul
copy FRONTEND_CODE_CHECKLIST.md frontend-package-temp\ > nul
copy API_SPECIFICATION.md frontend-package-temp\ > nul
copy .env.example frontend-package-temp\.env.example > nul

REM 创建 README
(
    echo # CQUPT-SRC 前端代码
    echo.
    echo 这是 CQUPT-SRC 项目的前端代码打包，可独立用于与新后端集成。
    echo.
    echo ## 快速开始
    echo.
    echo ### 1. 安装依赖
    echo.
    echo ```bash
    echo npm install
    echo ```
    echo.
    echo ### 2. 启动开发服务器
    echo.
    echo ```bash
    echo npm run dev
    echo ```
    echo.
    echo 访问 http://localhost:5173 即可使用
    echo.
    echo ### 3. 构建生产版本
    echo.
    echo ```bash
    echo npm run build
    echo ```
    echo.
    echo 输出到 `dist/` 目录
    echo.
    echo ## 文档
    echo.
    echo - **FRONTEND_PACKAGING_GUIDE.md** - 前端打包和交接指南
    echo - **FRONTEND_CODE_CHECKLIST.md** - 前端代码清单和集成步骤
    echo - **API_SPECIFICATION.md** - 完整的 API 接口规范 ⭐ 新后端必读
    echo - **.env.example** - 环境变量模板
    echo.
    echo ## 与新后端集成
    echo.
    echo 1. 更新 `vite.config.ts` 中的 API 代理地址
    echo 2. 根据 API_SPECIFICATION.md 实现后端接口
    echo 3. 确保后端支持 CORS 和 HTTP Only Cookie
    echo 4. 测试所有认证和授权流程
    echo.
    echo ## 技术栈
    echo.
    echo - React 19 + TypeScript 5
    echo - Vite 6 (构建工具)
    echo - Tailwind CSS 4 (样式)
    echo - Lucide React (图标)
    echo - Motion (动画)
    echo.
    echo 详见 package.json
    echo.
    echo ## 关键文件
    echo.
    echo - `src/types.ts` - 所有 TypeScript 类型定义 ⭐ 新后端参考
    echo - `src/App.tsx` - 应用主入口，处理认证流程
    echo - `src/views/Login.tsx` - 登录页面
    echo - `src/views/Register.tsx` - 注册页面
    echo - `src/components/SliderCaptcha.tsx` - 滑动验证码组件
    echo.
    echo ## 需要新后端实现的功能
    echo.
    echo 详见 API_SPECIFICATION.md，包括：
    echo.
    echo - 用户认证和授权
    echo - 漏洞管理和审核
    echo - 积分商城
    echo - 学习中心
    echo - 证书管理
    echo - 等等...
    echo.
    echo 维护时间：2026-04-22
) > frontend-package-temp\README.md

REM 创建压缩包
echo.
echo 正在压缩文件...

REM 检查是否安装了 7z，如果没有则使用 tar
where /q 7z
if errorlevel 1 (
    echo 使用 tar 进行压缩...
    tar -czf cqupt-src-frontend-%date:~0,4%%date:~5,2%%date:~8,2%.tar.gz frontend-package-temp\
) else (
    echo 使用 7z 进行压缩...
    7z a cqupt-src-frontend-%date:~0,4%%date:~5,2%%date:~8,2%.7z frontend-package-temp\
)

REM 清理临时目录
rmdir /s /q "frontend-package-temp"

echo.
echo ================================
echo ✓ 打包完成！
echo ================================
echo.
echo 输出文件：
echo   - cqupt-src-frontend-*.tar.gz (Linux/Mac)
echo   - cqupt-src-frontend-*.7z (Windows, 需要 7z)
echo.
echo 包含文件：
echo   - 前端源代码 (src/)
echo   - 静态资源 (public/)
echo   - 配置文件 (vite.config.ts 等)
echo   - 文档说明 (README, GUIDE, 等)
echo   - API 规范 (API_SPECIFICATION.md)
echo.
echo 下一步：
echo   1. 解压压缩包
echo   2. npm install
echo   3. npm run dev
echo.
pause
