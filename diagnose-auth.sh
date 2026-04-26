#!/bin/bash

# CQUPT SRC - 注册登录诊断脚本

echo "========================================="
echo "CQUPT SRC 注册登录诊断工具"
echo "========================================="
echo ""

# 检查应用是否运行
echo "[1] 检查应用是否运行..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✓ 应用运行正常"
else
  echo "✗ 应用未运行或无法访问"
  echo "请先运行: npm run dev"
  exit 1
fi
echo ""

# 检查数据库连接
echo "[2] 检查数据库连接..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"authCode":"1234567","password":"test"}')

if echo "$RESPONSE" | grep -q '"success"'; then
  echo "✓ 数据库连接正常"
elif echo "$RESPONSE" | grep -q 'INTERNAL_ERROR'; then
  echo "✗ 数据库连接失败"
  echo "响应: $RESPONSE"
  exit 1
else
  echo "✓ 数据库可访问"
fi
echo ""

# 测试注册流程
echo "[3] 测试邮箱验证码获取..."
REGISTER_SEND=$(curl -s -X POST http://localhost:3000/api/auth/email-code/register/send \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}')

if echo "$REGISTER_SEND" | grep -q '"success"'; then
  echo "✓ 邮箱验证码获取成功"
  echo "响应: $REGISTER_SEND"
elif echo "$REGISTER_SEND" | grep -q '"code"'; then
  CODE=$(echo "$REGISTER_SEND" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
  echo "✓ 验证码已发送: $CODE"
else
  echo "✗ 邮箱验证码获取失败"
  echo "响应: $REGISTER_SEND"
fi
echo ""

# 测试注册
echo "[4] 测试注册流程..."
echo "（需要先完成第 [3] 步获取验证码）"
echo ""

# 测试登录
echo "[5] 测试登录..."
LOGIN=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"authCode":"1234567","password":"wrongpass"}')

if echo "$LOGIN" | grep -q '"success"'; then
  echo "✓ 登录接口响应正常"
elif echo "$LOGIN" | grep -q 'UNAUTHORIZED\|BAD_REQUEST'; then
  echo "✓ 登录接口正常（用户不存在或密码错误为预期）"
  echo "响应: $LOGIN"
else
  echo "✗ 登录接口出错"
  echo "响应: $LOGIN"
fi
echo ""

echo "========================================="
echo "诊断完成"
echo "========================================="
echo ""
echo "常见问题："
echo "1. 如果第 [1] 步失败："
echo "   - 确认运行了 'npm run dev'"
echo "   - 等待 30 秒让 Vite 完成热编译"
echo ""
echo "2. 如果第 [2] 步失败："
echo "   - 检查 DATABASE_URL 环境变量是否设置"
echo "   - 检查 PostgreSQL 是否运行"
echo ""
echo "3. 如果第 [3] 步失败："
echo "   - 检查 SMTP 配置是否正确"
echo "   - 可能在控制台打印验证码而不是发送邮件"
echo ""
