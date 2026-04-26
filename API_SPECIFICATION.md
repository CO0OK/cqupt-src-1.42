# API 接口完整规范

**生成时间**：2026-04-22  
**API 版本**：v1  
**基础路径**：`/api`

---

## 1. 认证接口

### 1.1 用户登录

**请求**：`POST /api/login`

```json
{
  "authCode": "string",      // 学号或工号
  "password": "string",      // 密码（明文，通过 HTTPS 传输）
  "captchaToken": "string"   // 滑动验证码令牌（前端实现）
}
```

**成功响应** (200)：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "authCode": "string",
      "role": "user|auditor|admin",
      "points": 0,
      "avatar": "string|null",
      "registrationDate": "2026-04-22",
      "status": "active|banned",
      "hasSignedAgreement": true
    },
    "token": "jwt_token_string",
    "expiresIn": 604800  // 秒数（7天）
  }
}
```

**错误响应** (400/401/422)：
```json
{
  "success": false,
  "code": "UNAUTHORIZED",
  "message": "认证失败",
  "details": [
    {
      "field": "password",
      "reason": "密码不正确"
    }
  ]
}
```

---

### 1.2 用户注册

**请求**：`POST /api/register`

```json
{
  "username": "string",          // 用户名，2-50 字符
  "authCode": "string",          // 学号/工号，唯一
  "email": "string",             // 邮箱，唯一
  "password": "string",          // 密码（需符合策略）
  "confirmPassword": "string",   // 确认密码
  "emailCode": "string",         // 邮箱验证码（6 位数字）
  "agreement": true              // 是否同意服务条款
}
```

**密码策略**：
- 长度：8-128 字符
- 必须包含：大写 + 小写 + 数字 + 特殊字符
- 特殊字符：`!@#$%^&*-_+=[]{}|;:'",.<>?/\`

**成功响应** (201)：
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "userId": "uuid",
    "username": "string"
  }
}
```

---

### 1.3 获取当前用户信息

**请求**：`GET /api/auth/me`  
**需要认证**：✅  
**需要权限**：无

**成功响应** (200)：
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "authCode": "string",
    "role": "user|auditor|admin",
    "points": 1000,
    "avatar": "string|null",
    "registrationDate": "2026-04-22",
    "status": "active|banned",
    "hasSignedAgreement": true
  }
}
```

---

### 1.4 用户登出

**请求**：`POST /api/logout`  
**需要认证**：✅

**成功响应** (200)：
```json
{
  "success": true,
  "message": "登出成功"
}
```

---

### 1.5 发送注册邮箱验证码

**请求**：`POST /api/auth/email-code/register/send`

```json
{
  "email": "user@example.com"
}
```

**成功响应** (200)：
```json
{
  "success": true,
  "message": "验证码已发送",
  "expiresIn": 600  // 秒数，通常 10 分钟
}
```

**注意**：
- 如果 SMTP 未配置，验证码会在服务器日志中打印
- 同一邮箱在有效期内的多次请求可能返回相同验证码

---

### 1.6 发送修改密码邮箱验证码

**请求**：`POST /api/auth/email-code/password/send`  
**需要认证**：✅

```json
{}
```

**说明**：
- 向用户注册邮箱发送验证码
- 用于修改密码流程

---

### 1.7 发送忘记密码邮箱验证码

**请求**：`POST /api/auth/email-code/forgot/send`

```json
{
  "email": "user@example.com"
}
```

---

### 1.8 重置忘记的密码

**请求**：`POST /api/auth/password/forgot/reset`

```json
{
  "email": "user@example.com",
  "emailCode": "123456",
  "newPassword": "NewPass123!",
  "confirmPassword": "NewPass123!"
}
```

---

## 2. 漏洞接口

### 2.1 获取漏洞列表

**请求**：`GET /api/vulnerabilities`  
**需要认证**：✅

**查询参数**：
```
status: string              // pending|reviewing|approved|fixing|fixed|rejected|hidden
severity: string            // critical|high|medium|low|info
authorId: uuid              // 筛选特定作者
sortBy: string              // createdAt|updatedAt|rewardPoints (默认: createdAt)
sortOrder: string           // asc|desc (默认: desc)
page: number                // 页码，默认 1
limit: number               // 每页数量，默认 10
```

**成功响应** (200)：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "SQL 注入漏洞",
        "url": "https://...",
        "type": "SQL Injection",
        "severity": "critical",
        "status": "reviewing",
        "author": "张三",
        "authorId": "uuid",
        "date": "2026-04-22",
        "submittedAt": "2026-04-22T10:00:00Z",
        "description": "用户登录模块存在 SQL 注入...",
        "rewardPoints": 100,
        "attachment": "file_path",
        "attachmentType": "pdf|image|zip"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  }
}
```

---

### 2.2 获取漏洞详情

**请求**：`GET /api/vulnerabilities/:id`  
**需要认证**：✅

**成功响应** (200)：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "SQL 注入漏洞",
    "url": "https://...",
    "type": "SQL Injection",
    "severity": "critical",
    "status": "reviewing",
    "author": "张三",
    "authorId": "uuid",
    "description": "详细描述",
    "rewardPoints": 100,
    "attachment": "file_path",
    "attachmentType": "pdf|image|zip",
    "submittedAt": "2026-04-22T10:00:00Z",
    "updatedAt": "2026-04-22T11:00:00Z",
    "audits": [
      {
        "id": "uuid",
        "action": "submit|claim|approve|reject|fixing|fixed|hide|reopen",
        "actorId": "uuid",
        "actorName": "审核员名字",
        "auditNote": "审核意见",
        "createdAt": "2026-04-22T10:00:00Z"
      }
    ]
  }
}
```

---

### 2.3 提交漏洞

**请求**：`POST /api/vulnerabilities`  
**需要认证**：✅  
**权限**：user|auditor|admin

```json
{
  "title": "string",              // 1-200 字符
  "url": "string",                // 漏洞所在 URL
  "type": "string",               // XSS|SQL Injection|CSRF|... 等
  "severity": "string",           // critical|high|medium|low|info
  "description": "string",        // 详细描述
  "attachment": "file|base64",    // 可选，漏洞附件（PDF/图片/ZIP）
  "attachmentType": "pdf|image|zip"
}
```

**成功响应** (201)：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "string",
    "status": "pending"
  }
}
```

---

### 2.4 更新漏洞

**请求**：`PATCH /api/vulnerabilities/:id`  
**需要认证**：✅  
**权限**：作者|admin

```json
{
  "title": "string",
  "url": "string",
  "type": "string",
  "severity": "string",
  "description": "string"
}
```

---

### 2.5 审核漏洞

**请求**：`POST /api/vulnerabilities/:id/audit`  
**需要认证**：✅  
**权限**：auditor|admin

```json
{
  "action": "approve|reject|fixing|fixed|hide|reopen",
  "auditNote": "审核意见（可选）"
}
```

**审核动作说明**：
| 动作 | 说明 | 目标状态 |
|------|------|---------|
| `approve` | 批准，可以修复 | approved |
| `reject` | 拒绝 | rejected |
| `claim` | 声称修复 | fixing |
| `fixing` | 正在修复 | fixing |
| `fixed` | 已修复 | fixed |
| `hide` | 隐藏 | hidden |
| `reopen` | 重新打开 | pending |

**成功响应** (200)：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "approved|rejected|fixing|fixed|hidden|pending"
  }
}
```

---

### 2.6 下载漏洞附件

**请求**：`GET /api/vulnerabilities/:id/file`  
**需要认证**：✅

**响应**：二进制文件流

---

## 3. 用户接口

### 3.1 获取用户列表

**请求**：`GET /api/users`  
**需要认证**：✅  
**权限**：admin

**查询参数**：
```
role: string              // admin|auditor|user
status: string            // active|banned|pending
search: string            // 搜索用户名/邮箱
sortBy: string            // username|registrationDate|points (默认: registrationDate)
sortOrder: string         // asc|desc (默认: desc)
page: number              // 默认 1
limit: number             // 默认 10
```

**成功响应** (200)：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "username": "string",
        "email": "string",
        "authCode": "string",
        "role": "user|auditor|admin",
        "points": 1000,
        "status": "active|banned|pending",
        "registrationDate": "2026-04-22",
        "lastLogin": "2026-04-22T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

---

### 3.2 获取用户排行榜

**请求**：`GET /api/users/search`  
**需要认证**：✅

**查询参数**：
```
sortBy: string            // points (默认) | vulnerabilitiesCount
period: string            // all|week|month (默认: all)
limit: number             // 默认 50
```

**成功响应** (200)：
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "id": "uuid",
      "username": "string",
      "avatar": "string|null",
      "points": 5000,
      "vulnerabilitiesCount": 25,
      "certificatesCount": 3
    }
  ]
}
```

---

### 3.3 获取用户详情

**请求**：`GET /api/users/:id`  
**需要认证**：✅  
**权限**：自己|admin

**成功响应** (200)：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "authCode": "string",
    "role": "user|auditor|admin",
    "points": 1000,
    "avatar": "string|null",
    "registrationDate": "2026-04-22",
    "status": "active|banned|pending",
    "hasSignedAgreement": true,
    "stats": {
      "vulnerabilitiesSubmitted": 10,
      "vulnerabilitiesFixed": 5,
      "certificatesEarned": 2,
      "redemptionsCount": 3
    }
  }
}
```

---

### 3.4 更新用户信息

**请求**：`PATCH /api/users/:id`  
**需要认证**：✅  
**权限**：自己|admin

```json
{
  "username": "string",      // 可选
  "email": "string",         // 可选
  "avatar": "string|base64", // 可选
  "password": "string",      // 可选（修改密码时）
  "newPassword": "string",   // 可选
  "emailCode": "string"      // 邮箱验证码（修改邮箱时）
}
```

---

### 3.5 调整用户积分

**请求**：`PATCH /api/users/:id/points`  
**需要认证**：✅  
**权限**：admin

```json
{
  "points": -100,            // 整数，可以是负数
  "reason": "违反规则"       // 可选，审计日志用
}
```

---

## 4. 商城接口

### 4.1 获取商品列表

**请求**：`GET /api/products`  
**需要认证**：✅

**查询参数**：
```
category: string          // 分类过滤
status: string            // active|inactive|out_of_stock (默认: active)
search: string            // 商品名搜索
sortBy: string            // name|pointsCost|stock (默认: createdAt)
sortOrder: string         // asc|desc (默认: asc)
page: number              // 默认 1
limit: number             // 默认 20
```

**成功响应** (200)：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "电子书一本",
        "description": "有关网络安全...",
        "imageUrl": "string|null",
        "category": "电子资源",
        "pointsCost": 100,
        "stock": 50,
        "status": "active|inactive|out_of_stock",
        "createdAt": "2026-04-22T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

### 4.2 创建商品

**请求**：`POST /api/products`  
**需要认证**：✅  
**权限**：admin

```json
{
  "name": "string",              // 1-120 字符
  "description": "string",       // 可选
  "category": "string",          // 1-50 字符
  "pointsCost": 100,             // 正整数
  "stock": 50,                   // 非负整数
  "imageUrl": "string|base64",   // 可选，URL 或 base64
  "status": "active"             // 可选，默认 active
}
```

**成功响应** (201)：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string"
  }
}
```

---

### 4.3 编辑商品

**请求**：`PATCH /api/products/:id`  
**需要认证**：✅  
**权限**：admin

```json
{
  "name": "string",
  "description": "string",
  "category": "string",
  "pointsCost": 100,
  "stock": 50,
  "imageUrl": "string|base64",
  "status": "active|inactive|out_of_stock"
}
```

---

### 4.4 删除商品

**请求**：`DELETE /api/products/:id`  
**需要认证**：✅  
**权限**：admin

**成功响应** (200)：
```json
{
  "success": true,
  "message": "商品已删除"
}
```

---

### 4.5 兑换商品

**请求**：`POST /api/redemptions`  
**需要认证**：✅  
**权限**：user|auditor|admin

```json
{
  "productId": "uuid",
  "quantity": 1              // 默认 1
}
```

**兑换规则**：
1. 用户积分必须 ≥ `商品价格 × 数量`
2. 商品库存必须 ≥ 数量
3. 商品状态必须为 `active`
4. 以上任何条件不满足返回 422

**成功响应** (201)：
```json
{
  "success": true,
  "data": {
    "redemptionId": "uuid",
    "productName": "string",
    "pointsSpent": 100,
    "status": "pending",
    "message": "兑换成功，请等待审核员发放"
  }
}
```

**失败响应** (422)：
```json
{
  "success": false,
  "code": "BAD_REQUEST",
  "message": "兑换失败",
  "details": [
    {
      "field": "points",
      "reason": "积分不足"
    },
    {
      "field": "stock",
      "reason": "商品库存不足"
    }
  ]
}
```

---

### 4.6 获取兑换记录

**请求**：`GET /api/redemptions`  
**需要认证**：✅  
**权限**：自己的记录|admin

**查询参数**：
```
status: string            // pending|issued|cancelled
userId: uuid              // admin 用于查看其他用户
sortBy: string            // redeemedAt (默认)
sortOrder: string         // desc (默认)
page: number              // 默认 1
limit: number             // 默认 10
```

**成功响应** (200)：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "userId": "uuid",
        "username": "string",
        "productId": "uuid",
        "productName": "string",
        "productImage": "string|null",
        "quantity": 1,
        "pointsSpent": 100,
        "status": "pending|issued|cancelled",
        "redeemedAt": "2026-04-22T10:00:00Z",
        "issuedAt": "2026-04-22T11:00:00Z|null"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

---

### 4.7 发放兑换商品

**请求**：`PATCH /api/redemptions/:id`  
**需要认证**：✅  
**权限**：admin

```json
{
  "action": "issue|cancel"   // issue 表示发放
}
```

**成功响应** (200)：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "issued|cancelled",
    "issuedAt": "2026-04-22T11:00:00Z|null"
  }
}
```

---

## 5. 学习中心接口

### 5.1 获取学习资源列表

**请求**：`GET /api/learning`  
**需要认证**：✅

**查询参数**：
```
type: string              // PDF|Video|Link|Zip
category: string          // 分类过滤
difficulty: string        // easy|medium|hard
search: string            // 标题搜索
sortBy: string            // createdAt|difficulty (默认: createdAt)
sortOrder: string         // desc (默认)
page: number              // 默认 1
limit: number             // 默认 10
```

**成功响应** (200)：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "Web 安全基础",
        "description": "Learn the fundamentals...",
        "type": "PDF|Video|Link|Zip",
        "contentUrl": "string",
        "imageUrl": "string|null",
        "difficulty": "easy|medium|hard",
        "category": "string",
        "points": 50,
        "createdAt": "2026-04-22T10:00:00Z",
        "completedByUser": false,
        "pointsEarned": 0
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  }
}
```

---

### 5.2 创建学习资源

**请求**：`POST /api/learning`  
**需要认证**：✅  
**权限**：auditor|admin

```json
{
  "title": "string",           // 1-200 字符
  "description": "string",     // 可选
  "type": "PDF|Video|Link|Zip",
  "contentUrl": "string",      // 可以是外部 URL 或文件路径
  "imageUrl": "string|base64", // 可选
  "difficulty": "easy|medium|hard",
  "category": "string",        // 1-50 字符
  "points": 50                 // 可选，完成该资源可获得的积分
}
```

---

### 5.3 编辑学习资源

**请求**：`PATCH /api/learning/:id`  
**需要认证**：✅  
**权限**：auditor|admin

```json
{
  "title": "string",
  "description": "string",
  "contentUrl": "string",
  "imageUrl": "string|base64",
  "difficulty": "string",
  "category": "string",
  "points": 50
}
```

---

### 5.4 删除学习资源

**请求**：`DELETE /api/learning/:id`  
**需要认证**：✅  
**权限**：auditor|admin

---

### 5.5 标记学习资源为已完成

**请求**：`POST /api/learning/:id/complete`  
**需要认证**：✅  
**权限**：user|auditor|admin

```json
{}
```

**规则**：
- 完成后，用户获得该资源对应的积分
- 重复标记不增加积分

---

## 6. 公告接口

### 6.1 获取公告列表

**请求**：`GET /api/announcements`  
**需要认证**：✅

**查询参数**：
```
type: string              // general|security|mall|maintenance
status: string            // published|draft|archived (仅 admin 可看 draft/archived)
search: string            // 标题搜索
sortBy: string            // createdAt|updatedAt (默认: createdAt)
sortOrder: string         // desc (默认)
page: number              // 默认 1
limit: number             // 默认 10
```

**成功响应** (200)：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "系统维护通知",
        "type": "maintenance",
        "content": "系统将于...",
        "status": "published",
        "author": "admin",
        "createdAt": "2026-04-22T10:00:00Z",
        "updatedAt": "2026-04-22T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 20,
      "totalPages": 2
    }
  }
}
```

---

### 6.2 创建公告

**请求**：`POST /api/announcements`  
**需要认证**：✅  
**权限**：admin

```json
{
  "title": "string",           // 1-200 字符
  "type": "general|security|mall|maintenance",
  "content": "string",         // 1-5000 字符
  "status": "draft|published"  // 可选，默认 draft
}
```

---

### 6.3 编辑公告

**请求**：`PATCH /api/announcements/:id`  
**需要认证**：✅  
**权限**：admin

```json
{
  "title": "string",
  "type": "string",
  "content": "string",
  "status": "draft|published|archived"
}
```

---

### 6.4 删除公告

**请求**：`DELETE /api/announcements/:id`  
**需要认证**：✅  
**权限**：admin

---

## 7. 证书接口

### 7.1 获取用户证书

**请求**：`GET /api/certificates`  
**需要认证**：✅

**查询参数**：
```
type: string              // honorary|outstanding|special
status: string            // active|revoked (默认: active)
userId: uuid              // admin 用于查看其他用户
sortBy: string            // issuedAt (默认)
sortOrder: string         // desc (默认)
page: number              // 默认 1
limit: number             // 默认 10
```

**成功响应** (200)：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "certificateCode": "CQUPT-ABC123DEF456",
        "userId": "uuid",
        "username": "string",
        "type": "honorary|outstanding|special",
        "title": "杰出贡献者",
        "reason": "提交修复 10 个重大安全漏洞",
        "status": "active|revoked",
        "issuedAt": "2026-04-22",
        "revokedAt": "2026-04-23|null"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

### 7.2 发放证书

**请求**：`POST /api/certificates`  
**需要认证**：✅  
**权限**：admin

```json
{
  "userId": "uuid",
  "type": "honorary|outstanding|special",
  "title": "string",         // 证书标题
  "reason": "string"         // 颁发原因
}
```

**成功响应** (201)：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "certificateCode": "CQUPT-ABC123DEF456",
    "message": "证书已发放"
  }
}
```

---

### 7.3 下载证书 PDF

**请求**：`GET /api/certificates/:id/pdf`  
**需要认证**：✅  
**权限**：证书拥有者|admin

**响应**：PDF 文件流

**说明**：
- PDF 包含证书号、颁发日期等信息
- 需要系统中存在中文字体（见后端设置）

---

### 7.4 撤销证书

**请求**：`DELETE /api/certificates/:id`  
**需要认证**：✅  
**权限**：admin

**成功响应** (200)：
```json
{
  "success": true,
  "message": "证书已撤销"
}
```

---

## 8. 日志接口

### 8.1 获取活动日志

**请求**：`GET /api/logs`  
**需要认证**：✅  
**权限**：auditor|admin

**查询参数**：
```
action: string            // 操作类型过滤（submit|approve|reject 等）
targetType: string        // 目标类型（vulnerability|user|product 等）
targetId: uuid            // 特定目标 ID
actorId: uuid             // 操作人 ID
startDate: string         // ISO 8601 格式
endDate: string           // ISO 8601 格式
sortBy: string            // createdAt (默认)
sortOrder: string         // desc (默认)
page: number              // 默认 1
limit: number             // 默认 20
```

**成功响应** (200)：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "actor": {
          "id": "uuid",
          "username": "string"
        },
        "action": "string",         // 如 "submit", "approve", "redeem" 等
        "targetType": "string",     // 如 "vulnerability", "user", "product"
        "targetId": "uuid",
        "targetName": "string",     // 如漏洞标题、产品名等
        "details": {},              // JSON 对象，包含额外信息
        "createdAt": "2026-04-22T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500,
      "totalPages": 25
    }
  }
}
```

---

## 9. 错误响应格式

所有错误响应均采用以下格式：

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "人类可读的错误信息",
  "details": [
    {
      "field": "fieldName",
      "reason": "具体原因"
    }
  ]
}
```

### 常见错误码

| 错误码 | HTTP | 说明 |
|--------|------|------|
| `BAD_REQUEST` | 400 | 请求参数不合法 |
| `UNAUTHORIZED` | 401 | 未认证或认证过期 |
| `FORBIDDEN` | 403 | 无权限进行该操作 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `CONFLICT` | 409 | 资源冲突（如邮箱已存在） |
| `INVALID_STATE` | 422 | 业务状态不合法 |
| `RATE_LIMIT` | 429 | 请求过于频繁 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 10. 认证方式

### Cookie 存储 (推荐)

前端自动包含 HTTP Only Cookie，无需在请求头中手动添加。

```
GET /api/auth/me HTTP/1.1
Host: example.com
Cookie: cqupt_src_token=eyJhbGc...
```

### Bearer Token (可选)

如果不使用 Cookie，也可以在请求头中包含 Bearer Token：

```
GET /api/auth/me HTTP/1.1
Host: example.com
Authorization: Bearer eyJhbGc...
```

---

## 11. CORS 与 安全头

### 推荐的 CORS 配置

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,  // 仅允许前端域名
  credentials: true,                  // 允许发送 Cookie
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400                       // 24 小时
}));
```

### 安全响应头

```javascript
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

---

**文档版本**：1.0  
**最后更新**：2026-04-22
