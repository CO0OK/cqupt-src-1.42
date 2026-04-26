# 注册登录快速测试指南

## 🚀 最快的方式：使用测试用户直接登录

### 第 1 步：初始化测试用户

```bash
# 生成测试用户
npx ts-node prisma/seed-test-users.ts
```

**输出应该是：**
```
✓ 测试用户 1 创建成功
  统一认证码: 1234567
  密码: Test@123456
  邮箱: test@example.com

✓ 测试用户 2 (管理员) 创建成功
  统一认证码: 9999999
  密码: Admin@123456
  邮箱: admin@example.com

✓ 测试用户 3 创建成功
  统一认证码: 5555555
  密码: User@123456
  邮箱: user@example.com
```

### 第 2 步：使用测试账号登录

打开 http://localhost:3000，使用以下凭证登录：

**普通用户：**
```
统一认证码: 1234567
密码: Test@123456
```

**或者：**
```
统一认证码: 5555555
密码: User@123456
```

**管理员：**
```
统一认证码: 9999999
密码: Admin@123456
```

### 第 3 步：验证登录成功

登录成功后你应该看到：
- 主页面 (Dashboard)
- 导航栏显示用户名
- Cookie 中有 `cqupt_src_token`

---

## 📝 测试注册流程

如果想从头测试注册，按照以下步骤：

### 第 1 步：在登录页面点击"注册"

### 第 2 步：填写注册信息

```
用户名: newuser123
统一认证码: 8888888
密码: NewPass@123456
邮箱: newuser@example.com
```

### 第 3 步：获取邮箱验证码

1. 点击"获取验证码"按钮
2. **查看验证码的位置：**

   **如果用 `npm run dev`：**
   - 在运行 `npm run dev` 的终端中查看
   - 应该能看到类似信息：
     ```
     [EMAIL] Email code for newuser@example.com: 123456
     ```

   **如果用 Docker Compose：**
   ```bash
   docker-compose logs app | grep -i "code\|email"
   ```

3. 复制验证码填入表单

### 第 4 步：完成注册

1. 填入获取的验证码
2. 点击"注册"按钮
3. 应该自动跳转到首页并显示登录用户信息

---

## 🔧 本地开发环境检查清单

在开始测试前，确保以下项目都✓：

### 环境变量

```bash
# 检查 .env 文件是否存在
cat .env

# 应该包含至少这些配置
DATABASE_URL=postgresql://...  # 数据库连接
JWT_SECRET=...                  # JWT 密钥
```

### 应用运行

```bash
# 检查是否运行了 npm run dev
curl http://localhost:3000

# 应该返回 HTML 页面（不是 404 或连接拒绝）
```

### 数据库连接

```bash
# 测试数据库连接
npx prisma db execute --stdin <<< "SELECT NOW();"

# 或者使用 psql
psql $DATABASE_URL -c "SELECT 1"
```

### 数据库迁移

```bash
# 检查迁移是否完成
npx prisma migrate status

# 应该显示所有迁移都已应用
```

---

## 🐛 常见错误及解决

### 错误：`relation "User" does not exist`

**解决：**
```bash
npx prisma migrate deploy
```

### 错误：`Cannot find module 'prisma'`

**解决：**
```bash
npm install
npx prisma generate
```

### 错误：`DATABASE_URL is not set`

**解决：**
```bash
# 创建 .env 文件
cp .env.example .env

# 编辑 .env 文件并设置 DATABASE_URL
nano .env
```

### 登录页面显示"请先完成人机验证"

**解决：**
- 这是正常的，需要滑动验证码
- 滑动验证条完成验证
- 然后才能点击登录按钮

### 显示"邮箱验证码已过期"

**解决：**
- 验证码有时间限制（通常 5 分钟）
- 重新点击"获取验证码"获取新的验证码

---

## 🧪 快速测试脚本

### 直接用 curl 测试登录

```bash
# 测试登录 API
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "authCode": "1234567",
    "password": "Test@123456"
  }' \
  -v

# 如果成功，应该看到：
# HTTP/1.1 200 OK
# Set-Cookie: cqupt_src_token=...
# {
#   "success": true,
#   "user": {
#     "id": "...",
#     "username": "testuser",
#     ...
#   }
# }
```

### 测试获取当前用户信息

```bash
# 先获取 token（从上面的登录响应中）
TOKEN="<从登录响应复制>"

# 使用 token 获取用户信息
curl http://localhost:3000/api/auth/me \
  -H "Cookie: cqupt_src_token=$TOKEN"

# 应该返回当前用户信息
```

---

## 📱 在浏览器中手动测试

### 打开浏览器开发者工具 (F12)

**Console 选项卡中运行：**

```javascript
// 测试登录
fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    authCode: '1234567',
    password: 'Test@123456'
  })
}).then(r => {
  console.log('状态码:', r.status);
  console.log('响应头:', Object.fromEntries(r.headers));
  return r.json();
}).then(console.log)
  .catch(console.error);
```

**Network 选项卡中：**

1. 打开 Network 选项卡
2. 点击登录按钮
3. 观察 POST /api/login 请求
4. 检查：
   - Status 是否为 200
   - Response 中是否有 "success": true
   - Response Headers 中是否有 Set-Cookie

---

## ✅ 成功标志

你会看到以下页面和信息：

1. **登录成功后：**
   - 自动跳转到首页 (Dashboard)
   - 导航栏显示你的用户名
   - 可以看到用户菜单

2. **数据库中有你的数据：**
   ```bash
   psql $DATABASE_URL -c "SELECT id, username, authCode FROM \"User\" LIMIT 5;"
   ```

3. **浏览器 Cookie 中有 token：**
   - F12 → Application → Cookies
   - 看到 `cqupt_src_token` cookie

---

## 🆘 还是有问题？

1. **查看详细故障排查指南：** [AUTH_TROUBLESHOOTING.md](AUTH_TROUBLESHOOTING.md)

2. **收集调试信息：**
   ```bash
   # 保存应用日志
   npm run dev 2>&1 | tee debug.log
   
   # 打开浏览器 F12，Console 和 Network 选项卡截图
   ```

3. **检查常见问题：**
   - 是否在 npm run dev 终端中看到编译错误？
   - 是否在浏览器 Console 中看到 JavaScript 错误？
   - 是否在浏览器 Network 中看到 API 返回 500 错误？

---

## 💡 开发建议

1. **开发时保持运行：**
   ```bash
   npm run dev
   ```
   这会自动编译 TypeScript 和热更新前端

2. **监控数据库：**
   ```bash
   # 在新终端中打开数据库客户端
   psql $DATABASE_URL
   ```

3. **查看应用日志：**
   - 在 npm run dev 的终端中实时查看
   - 或用 `docker-compose logs -f app` (Docker 模式)

4. **使用 VS Code REST Client：**
   - 在项目中创建 `test.rest` 文件
   - 使用 REST Client 扩展测试 API

---

**准备好了？** 
1. `npx ts-node prisma/seed-test-users.ts` - 初始化测试用户
2. `npm run dev` - 启动应用
3. 打开 http://localhost:3000 - 访问应用
4. 使用 `1234567` / `Test@123456` 登录

**祝你测试顺利！** 🎉
