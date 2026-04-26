# 注册登录问题排查指南

## 🔍 快速诊断

### Linux/Mac
```bash
chmod +x diagnose-auth.sh
./diagnose-auth.sh
```

### Windows
```cmd
diagnose-auth.bat
```

---

## 📋 常见问题和解决方案

### 问题 1：点击登录/注册没有反应

**可能原因：**
1. 应用未运行
2. API 端点无响应
3. 浏览器网络问题

**解决步骤：**

```bash
# 1. 检查应用是否运行
curl http://localhost:3000

# 2. 检查 npm run dev 是否启动成功
# 在 npm run dev 的终端中查看是否有错误信息

# 3. 检查是否有 TypeScript 编译错误
# 查看 npm run dev 的输出中是否有 red color 的错误

# 4. 强制刷新浏览器
# Ctrl + Shift + R (Chrome/Firefox)
# Cmd + Shift + R (Mac)
```

---

### 问题 2：注册时提示"请先获取邮箱验证码"

**原因：** 注册需要邮箱验证码，这是安全设计

**解决步骤：**

1. **在注册表单中找到"获取验证码"按钮**
   - 输入你的邮箱
   - 点击"获取验证码"

2. **检查验证码发送情况**
   - 如果配置了 SMTP，会发送邮件
   - 如果没有配置 SMTP，验证码会在服务器 **控制台打印**

3. **查看服务器日志获取验证码**

   **如果用 `npm run dev`：**
   ```
   在运行 npm run dev 的终端中查找类似信息：
   [EMAIL] 邮箱验证码: 123456
   或
   Email code for test@example.com: 123456
   ```

   **如果用 Docker Compose：**
   ```bash
   docker-compose logs app | grep -i "code\|email\|verify"
   ```

---

### 问题 3：注册时提示"用户名/邮箱已存在"

**原因：** 数据库中已有相同的用户名或邮箱

**解决步骤：**

1. **使用不同的用户名和邮箱**
   ```
   用户名：testuser_123
   邮箱：test123@example.com
   ```

2. **或者清除数据库重新开始**

   **如果用 Docker Compose：**
   ```bash
   docker-compose down -v
   docker-compose up -d
   docker-compose exec -T app npx prisma migrate deploy
   docker-compose exec -T app npx prisma db seed
   ```

   **如果用 npm run dev：**
   ```bash
   # 先检查你的数据库连接字符串
   echo $DATABASE_URL
   
   # 使用 psql 删除所有表
   psql your_database_url -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   
   # 重新迁移
   npx prisma migrate deploy
   npx prisma db seed
   ```

---

### 问题 4：邮件无法发送（SMTP 错误）

**检查步骤：**

1. **查看是否配置了 SMTP**
   ```bash
   cat .env | grep SMTP
   ```

2. **如果没有配置 SMTP：**
   - 验证码会在控制台打印而不是发送邮件
   - 这对本地开发是正常的

3. **如果配置了 SMTP 但邮件无法发送：**

   **Gmail：**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-digit-app-password  # 需要使用"应用密码"而非账户密码
   ```
   
   **QQ 邮箱：**
   ```env
   SMTP_HOST=smtp.qq.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-qq-email@qq.com
   SMTP_PASS=your-auth-code  # 需要在 QQ 邮箱设置中生成授权码
   ```

   **检查凭证是否正确：**
   ```bash
   # 尝试用 telnet 或 openssl 验证
   openssl s_client -connect smtp.gmail.com:587 -starttls smtp
   ```

---

### 问题 5：登录成功但页面没有跳转

**可能原因：**
1. 前端 React 状态更新问题
2. 浏览器 Cookie 配置问题
3. CORS 问题

**解决步骤：**

```bash
# 1. 打开浏览器开发者工具 (F12)
# 2. 切换到 Console 选项卡
# 3. 看是否有红色错误

# 4. 检查 Network 选项卡
# 5. 寻找 POST /api/login 请求
# 6. 检查响应状态是否为 200
# 7. 查看响应内容中是否有 "success": true

# 8. 检查 Cookies
# 右键 → 检查 → Application/Storage → Cookies
# 查找名为 cqupt_src_token 的 Cookie
# 如果不存在，登录可能失败
```

---

### 问题 6：数据库迁移失败

**症状：** 
```
error: relation "User" does not exist
```

**解决步骤：**

```bash
# 1. 检查数据库连接
echo $DATABASE_URL

# 2. 检查 Prisma 配置
cat prisma/schema.prisma

# 3. 重新运行迁移
npx prisma migrate deploy

# 4. 如果还是失败，清空数据库重试
npx prisma migrate reset
# 这会删除所有数据，谨慎使用！
```

---

## 🧪 手动测试 API

### 测试注册流程

**第 1 步：获取邮箱验证码**
```bash
curl -X POST http://localhost:3000/api/auth/email-code/register/send \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'

# 响应应该包含
# {
#   "success": true,
#   "code": "123456"  # 或在控制台打印
# }
```

**第 2 步：使用验证码注册**
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "authCode": "1234567",
    "password": "Test@123456",
    "email": "test@example.com",
    "emailCode": "123456"
  }'

# 响应应该是
# {
#   "success": true,
#   "user": {
#     "id": "...",
#     "username": "testuser",
#     "role": "user",
#     "email": "test@example.com",
#     "points": 0
#   }
# }
```

### 测试登录流程

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "authCode": "1234567",
    "password": "Test@123456"
  }' \
  -v

# 响应应该是
# {
#   "success": true,
#   "user": {
#     "id": "...",
#     "username": "testuser",
#     "role": "user",
#     "email": "test@example.com",
#     "points": 0
#   }
# }

# 同时检查响应头中的 Set-Cookie
# 应该包含 cqupt_src_token=...
```

---

## 🔐 密码政策

注册时密码必须符合以下要求：

- **最少 8 个字符**
- **至少包含：**
  - 1 个大写字母 (A-Z)
  - 1 个小写字母 (a-z)
  - 1 个数字 (0-9)
  - 1 个特殊字符 (!@#$%^&*)

**有效的密码示例：**
- Test@123456
- MyPass!2024
- Secure#Pwd01

**无效的密码示例：**
- 12345678 (只有数字)
- password (没有大写、数字、特殊字符)
- Test123 (没有特殊字符)

---

## 📱 浏览器控制台调试

在浏览器中打开开发者工具 (F12)，切换到 Console 选项卡：

```javascript
// 检查当前用户
console.log(localStorage.getItem('user'))

// 测试 API 调用
fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    authCode: '1234567',
    password: 'Test@123456'
  })
}).then(r => r.json()).then(console.log)

// 检查 Cookie
console.log(document.cookie)
```

---

## 🆘 还是不行？

**收集调试信息：**

```bash
# 1. 应用日志
npm run dev 2>&1 | tee app.log

# 或
docker-compose logs app > app.log

# 2. 数据库日志
docker-compose logs postgres > db.log

# 3. 浏览器网络请求
# F12 → Network → 登录 → 右键请求 → Copy as cURL

# 4. 数据库表结构
psql your_database_url -c "\dt"
psql your_database_url -c "SELECT * FROM \"User\" LIMIT 1;"
```

**提交问题时包含：**
- 启动方式（npm run dev 还是 docker-compose）
- 完整的错误日志
- 使用的浏览器和版本
- 操作系统
- 网络请求的 cURL 命令和响应

---

## 💡 开发模式小技巧

### 跳过邮箱验证码

在本地开发时，可以直接使用任意验证码（开发用）：

修改 `server.ts` 中的邮箱验证逻辑：

```typescript
// 在开发模式中跳过验证码验证
if (process.env.NODE_ENV !== 'production') {
  // 开发模式：任何验证码都接受
  // 跳过 emailCodesService.verify()
} else {
  // 生产模式：严格验证
  await emailCodesService.verify(...)
}
```

**但不建议这样做**，还是建议：
- 保持邮箱验证流程完整
- 在控制台查看验证码
- 使用测试邮箱服务（如 Mailtrap）

---

**需要更多帮助？检查 QUICK_REFERENCE.md 或 DOCKER_DEPLOYMENT.md**
