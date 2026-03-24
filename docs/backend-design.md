# CQUPT-SRC 后端设计（V1）

## 1. 目标与范围

本设计用于把当前单文件 `server.ts` 演进为可维护、可测试、可扩展的后端结构，优先覆盖：

1. 认证与权限
2. 漏洞提交流转
3. 商城兑换事务
4. 学习中心管理
5. 审计日志与统一错误处理

当前不改业务语义，先完成结构化与字段级参数校验。

## 2. 分层架构

建议采用 `Route -> Controller -> Service -> Repository(Prisma)` 四层：

- `routes`: 只定义 URL 与中间件链。
- `controllers`: 解析请求、调用 validator、组织响应 DTO。
- `services`: 业务规则、状态流转、事务边界。
- `repositories`: 只做 Prisma 读写与查询组合。
- `middlewares`: 认证、鉴权、错误处理、请求体保护。
- `validators`: 字段级校验，返回统一错误详情。

建议目录结构：

```txt
src/server/
  app.ts
  index.ts
  config/
    env.ts
    prisma.ts
  middlewares/
    auth.ts
    role.ts
    error.ts
    jsonBody.ts
  modules/
    auth/
      auth.routes.ts
      auth.controller.ts
      auth.service.ts
      auth.validator.ts
    vulnerabilities/
    mall/
    learning/
    announcements/
    certificates/
    logs/
  shared/
    errors.ts
    response.ts
    validators.ts
    codes.ts
```

## 3. 接口与错误规范

成功响应：

```json
{ "success": true, "data": {} }
```

失败响应：

```json
{
  "success": false,
  "code": "BAD_REQUEST",
  "message": "参数校验失败",
  "details": [
    { "field": "pointsCost", "reason": "must be positive integer" }
  ]
}
```

统一错误码：

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `BAD_REQUEST`
- `CONFLICT`
- `INTERNAL_ERROR`

## 4. 关键业务约束

### 4.1 漏洞状态流转

合法状态：

- `pending -> reviewing -> approved -> fixing -> fixed`
- 任意审核态可转 `rejected` / `hidden`
- `reopen` 只能转回 `pending`

要求：

1. 每次状态变更必须写 `vulnerability_audits`。
2. 审核动作写 `actor_id` 与审计日志。
3. 前端展示状态与数据库状态分离，映射在 controller 层处理。

### 4.2 商城兑换事务

兑换必须单事务完成（`prisma.$transaction`）：

1. 校验用户积分、商品库存、商品状态
2. 扣减库存
3. 扣减用户积分
4. 创建 `redemptions`
5. 创建 `user_point_logs`
6. 写 `activity_logs`

并发要求：

- 库存更新使用条件更新（`stock >= quantity`）防止超卖。

### 4.3 参数校验（优先）

优先补强商城接口：

- `POST /api/products`
- `PATCH /api/products/:id`
- `POST /api/redemptions`

字段规则示例：

- `name`: 1-120 字符
- `category`: 1-50 字符
- `pointsCost`: 正整数，`1..999999`
- `stock`: 非负整数，`0..999999`
- `status`: `active | inactive | out_of_stock`
- `imageUrl`: 可选，URL 或 base64 图片

校验失败返回字段级 `details`，不使用纯文本 `alert` 风格错误。

## 5. 鉴权与权限矩阵

- `user`: 提交漏洞、查看个人相关数据、发起兑换
- `auditor`: 漏洞审核、日志查看、学习中心管理
- `admin`: 全量管理（用户、商城、公告、证书、日志）

接口层必须遵守：先 `requireAuth`，再 `requireRoles(...)`。

## 6. 数据一致性与审计

必须落审计日志的动作：

1. 漏洞提交/审核/状态变更
2. 商城商品增改删
3. 积分手工调整
4. 兑换发放
5. 证书发放/撤销

日志字段最小集合：

- `actor_id`
- `action`
- `target_type`
- `target_id`
- `details(jsonb)`
- `created_at`

## 7. 实施路线（建议）

### Phase 1（本周）

1. 提炼 `shared/errors.ts` 与统一错误响应
2. 提炼 `middlewares/auth.ts`、`middlewares/role.ts`
3. 完成商城字段级校验并落地 `details[]`

### Phase 2（下周）

1. 拆出 `modules/mall`、`modules/vulnerabilities`
2. 引入 service 层，集中事务与状态机
3. 新增核心用例冒烟脚本（商城 + 漏洞）

### Phase 3

1. 完成其余模块拆分
2. 将 `preflight:release` 接入 CI
3. 为关键 service 增加单元测试

## 8. 完成标准（DoD）

满足以下条件即认为后端设计落地：

1. `server.ts` 不再承载主要业务实现（只做装配）
2. 商城与漏洞模块完成分层拆分
3. 字段级参数校验可稳定返回 `BAD_REQUEST.details`
4. `npm run preflight:release` 可通过
5. 关键回归链路可复现（smoke + 手工最小回归）
