@echo off
REM CQUPT SRC - 注册登录诊断脚本 (Windows)

setlocal enabledelayedexpansion

echo.
echo =========================================
echo CQUPT SRC 注册登录诊断工具
echo =========================================
echo.

REM 检查应用是否运行
echo [1] 检查应用是否运行...
curl -s http://localhost:3000/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
  echo √ 应用运行正常
) else (
  echo × 应用未运行或无法访问
  echo 请先运行: npm run dev
  exit /b 1
)
echo.

REM 检查数据库连接
echo [2] 检查数据库连接...
for /f "delims=" %%i in ('curl -s -X POST http://localhost:3000/api/login ^
  -H "Content-Type: application/json" ^
  -d "{\"authCode\":\"1234567\",\"password\":\"test\"}"') do set RESPONSE=%%i

if "!RESPONSE!"=="" (
  echo × 无法访问应用
  exit /b 1
)

if "!RESPONSE:success=!" neq "!RESPONSE!" (
  echo √ 数据库连接正常
) else if "!RESPONSE:INTERNAL_ERROR=!" neq "!RESPONSE!" (
  echo × 数据库连接失败
  echo 响应: !RESPONSE!
  exit /b 1
) else (
  echo √ 数据库可访问
)
echo.

REM 测试邮箱验证码获取
echo [3] 测试邮箱验证码获取...
for /f "delims=" %%i in ('curl -s -X POST http://localhost:3000/api/auth/email-code/register/send ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\"}"') do set REGISTER_SEND=%%i

if "!REGISTER_SEND:success=!" neq "!REGISTER_SEND!" (
  echo √ 邮箱验证码获取成功
  echo 响应: !REGISTER_SEND!
) else if "!REGISTER_SEND:code=!" neq "!REGISTER_SEND!" (
  echo √ 验证码已发送
) else (
  echo × 邮箱验证码获取失败
  echo 响应: !REGISTER_SEND!
)
echo.

REM 测试登录
echo [4] 测试登录接口...
for /f "delims=" %%i in ('curl -s -X POST http://localhost:3000/api/login ^
  -H "Content-Type: application/json" ^
  -d "{\"authCode\":\"1234567\",\"password\":\"wrongpass\"}"') do set LOGIN=%%i

if "!LOGIN:success=!" neq "!LOGIN!" (
  echo √ 登录接口响应正常
) else if "!LOGIN:UNAUTHORIZED=!" neq "!LOGIN!" (
  echo √ 登录接口正常
  echo 响应: !LOGIN!
) else (
  echo × 登录接口出错
  echo 响应: !LOGIN!
)
echo.

echo =========================================
echo 诊断完成
echo =========================================
echo.
echo 常见问题：
echo 1. 如果第 [1] 步失败：
echo    - 确认运行了 'npm run dev'
echo    - 等待 30 秒让编译完成
echo.
echo 2. 如果第 [2] 步失败：
echo    - 检查 DATABASE_URL 环境变量
echo    - 检查 PostgreSQL 是否运行
echo.
echo 3. 如果第 [3] 步失败：
echo    - 检查 SMTP 配置
echo    - 验证码可能在控制台打印
echo.
