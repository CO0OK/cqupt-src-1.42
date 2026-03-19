# CQUPT-SRC 数据库设计

## 1. 设计目标

当前项目的核心业务包括：

- 用户注册、登录、权限管理
- 漏洞提交、审核、状态流转
- 积分发放与积分商城兑换
- 公告发布
- 荣誉证书发放
- 学习中心内容管理
- 平台操作日志与附件管理

建议正式环境使用 `PostgreSQL`，ORM 使用 `Prisma`。

## 2. 核心实体

### 用户与权限

- `users`
- `password_resets`
- `user_point_logs`

### 漏洞业务

- `vulnerabilities`
- `vulnerability_audits`
- `attachments`

### 平台内容

- `announcements`
- `learning_labs`
- `learning_materials`
- `discussions`

### 荣誉与商城

- `certificates`
- `products`
- `redemptions`

### 平台治理

- `activity_logs`

## 3. 表设计

### 3.1 users

用户主表。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | pk | 用户主键 |
| username | varchar(50) | unique, not null | 用户名 |
| auth_code | varchar(50) | unique, not null | 学号/工号/统一认证码 |
| email | varchar(120) | unique, not null | 邮箱 |
| password_hash | varchar(255) | not null | 加密密码 |
| role | varchar(20) | not null | `admin` / `auditor` / `user` |
| points | int | not null default 0 | 当前积分 |
| avatar_url | text | null | 头像地址 |
| status | varchar(20) | not null default 'active' | `active` / `banned` / `pending` |
| has_signed_agreement | boolean | not null default false | 是否签署责任承诺书 |
| agreement_signed_at | timestamptz | null | 签署时间 |
| created_at | timestamptz | not null | 创建时间 |
| updated_at | timestamptz | not null | 更新时间 |
| last_login_at | timestamptz | null | 最后登录时间 |

索引建议：

- `unique(username)`
- `unique(auth_code)`
- `unique(email)`
- `index(role)`
- `index(status)`

### 3.2 password_resets

密码重置或重置令牌记录表。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | pk | 主键 |
| user_id | uuid | fk -> users.id | 用户 |
| token | varchar(255) | unique, not null | 重置令牌摘要或一次性 token |
| expires_at | timestamptz | not null | 过期时间 |
| used_at | timestamptz | null | 使用时间 |
| created_at | timestamptz | not null | 创建时间 |

### 3.3 vulnerabilities

漏洞主表。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | pk | 主键 |
| vuln_code | varchar(50) | unique, not null | 业务编号，如 `VU-2026-0001` |
| title | varchar(255) | not null | 漏洞标题 |
| target_url | text | not null | 目标地址 |
| vuln_type | varchar(50) | not null | 漏洞类型 |
| severity | varchar(20) | not null | `critical` / `high` / `medium` / `low` / `info` |
| status | varchar(30) | not null | `pending` / `reviewing` / `approved` / `fixing` / `fixed` / `rejected` / `hidden` |
| description | text | not null | 漏洞描述 |
| reproduction_steps | text | null | 复现步骤 |
| impact_scope | text | null | 影响范围 |
| submitter_id | uuid | fk -> users.id | 提交人 |
| current_auditor_id | uuid | fk -> users.id, null | 当前审核人 |
| reward_points | int | not null default 0 | 最终奖励积分 |
| submitted_at | timestamptz | not null | 提交时间 |
| approved_at | timestamptz | null | 审核通过时间 |
| fixed_at | timestamptz | null | 修复完成时间 |
| created_at | timestamptz | not null | 创建时间 |
| updated_at | timestamptz | not null | 更新时间 |

索引建议：

- `unique(vuln_code)`
- `index(submitter_id)`
- `index(current_auditor_id)`
- `index(status)`
- `index(severity)`
- `index(submitted_at desc)`

### 3.4 vulnerability_audits

漏洞审核与流转记录表。不要把审核历史只存一份当前备注。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | pk | 主键 |
| vulnerability_id | uuid | fk -> vulnerabilities.id | 漏洞 |
| auditor_id | uuid | fk -> users.id | 审核人 |
| action | varchar(30) | not null | `submit` / `claim` / `approve` / `reject` / `fixing` / `fixed` / `hide` / `reopen` |
| from_status | varchar(30) | null | 原状态 |
| to_status | varchar(30) | null | 新状态 |
| note | text | null | 审核备注 |
| created_at | timestamptz | not null | 操作时间 |

索引建议：

- `index(vulnerability_id, created_at desc)`
- `index(auditor_id, created_at desc)`

### 3.5 attachments

附件表，既可挂漏洞，也可扩展到公告或证书。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | pk | 主键 |
| owner_type | varchar(30) | not null | `vulnerability` / `announcement` / `certificate` |
| owner_id | uuid | not null | 归属对象 id |
| file_name | varchar(255) | not null | 原文件名 |
| file_key | varchar(255) | not null | 存储键 |
| mime_type | varchar(100) | not null | 文件类型 |
| file_size | bigint | not null | 文件大小 |
| uploaded_by | uuid | fk -> users.id | 上传人 |
| created_at | timestamptz | not null | 上传时间 |

索引建议：

- `index(owner_type, owner_id)`
- `index(uploaded_by)`

### 3.6 user_point_logs

积分流水，正式环境必须有，不然无法对账。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | pk | 主键 |
| user_id | uuid | fk -> users.id | 用户 |
| change_type | varchar(30) | not null | `vuln_reward` / `mall_redeem` / `manual_adjust` / `certificate_bonus` |
| delta | int | not null | 变动值，正负都有 |
| balance_after | int | not null | 变动后余额 |
| reference_type | varchar(30) | null | 关联对象类型 |
| reference_id | uuid | null | 关联对象 id |
| note | text | null | 备注 |
| created_by | uuid | fk -> users.id, null | 操作人 |
| created_at | timestamptz | not null | 时间 |

索引建议：

- `index(user_id, created_at desc)`
- `index(reference_type, reference_id)`

### 3.7 announcements

公告表。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | pk | 主键 |
| title | varchar(255) | not null | 标题 |
| content | text | not null | 正文 |
| type | varchar(30) | not null | `general` / `security` / `mall` / `maintenance` |
| is_pinned | boolean | not null default false | 是否置顶 |
| status | varchar(20) | not null default 'published' | `draft` / `published` / `archived` |
| author_id | uuid | fk -> users.id | 发布人 |
| published_at | timestamptz | null | 发布时间 |
| created_at | timestamptz | not null | 创建时间 |
| updated_at | timestamptz | not null | 更新时间 |

### 3.8 certificates

证书表。正式环境建议支持撤销，不建议直接删。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | pk | 主键 |
| cert_code | varchar(50) | unique, not null | 证书编号 |
| user_id | uuid | fk -> users.id | 获证用户 |
| vulnerability_id | uuid | fk -> vulnerabilities.id, null | 关联漏洞 |
| title | varchar(255) | not null | 证书标题 |
| cert_type | varchar(30) | not null | `honorary` / `outstanding` / `special` |
| status | varchar(20) | not null default 'active' | `active` / `revoked` |
| issued_by | uuid | fk -> users.id | 发放人 |
| issued_at | timestamptz | not null | 发放时间 |
| revoked_at | timestamptz | null | 撤销时间 |
| revoke_reason | text | null | 撤销原因 |
| created_at | timestamptz | not null | 创建时间 |
| updated_at | timestamptz | not null | 更新时间 |

### 3.9 products

商城商品表。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | pk | 主键 |
| product_code | varchar(50) | unique, not null | 商品编号 |
| name | varchar(120) | not null | 名称 |
| category | varchar(50) | not null | 分类 |
| image_url | text | null | 图片 |
| points_cost | int | not null | 所需积分 |
| stock | int | not null | 库存 |
| status | varchar(20) | not null default 'active' | `active` / `inactive` / `out_of_stock` |
| description | text | null | 描述 |
| created_at | timestamptz | not null | 创建时间 |
| updated_at | timestamptz | not null | 更新时间 |

### 3.10 redemptions

兑换记录表。扣积分、减库存、生成记录必须放在一个事务里。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | pk | 主键 |
| redemption_code | varchar(50) | unique, not null | 兑换单号 |
| user_id | uuid | fk -> users.id | 兑换人 |
| product_id | uuid | fk -> products.id | 商品 |
| points_cost | int | not null | 消耗积分 |
| quantity | int | not null default 1 | 数量 |
| status | varchar(20) | not null | `pending` / `issued` / `cancelled` |
| issued_by | uuid | fk -> users.id, null | 发放人 |
| issued_at | timestamptz | null | 发放时间 |
| note | text | null | 备注 |
| created_at | timestamptz | not null | 创建时间 |
| updated_at | timestamptz | not null | 更新时间 |

索引建议：

- `index(user_id, created_at desc)`
- `index(product_id)`
- `index(status)`

### 3.11 learning_labs

学习靶场表。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | pk | 主键 |
| title | varchar(255) | not null | 标题 |
| description | text | not null | 描述 |
| difficulty | varchar(20) | not null | `easy` / `medium` / `hard` |
| category | varchar(50) | not null | 分类 |
| points_reward | int | not null default 0 | 练习奖励积分，可选 |
| url | text | not null | 跳转地址 |
| image_url | text | null | 封面 |
| status | varchar(20) | not null default 'published' | 状态 |
| created_at | timestamptz | not null | 创建时间 |
| updated_at | timestamptz | not null | 更新时间 |

### 3.12 learning_materials

学习资料表。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | pk | 主键 |
| title | varchar(255) | not null | 标题 |
| author_name | varchar(120) | not null | 作者 |
| material_type | varchar(30) | not null | `pdf` / `video` / `link` / `zip` / `article` |
| url | text | not null | 资源地址 |
| description | text | null | 描述 |
| status | varchar(20) | not null default 'published' | 状态 |
| created_at | timestamptz | not null | 创建时间 |
| updated_at | timestamptz | not null | 更新时间 |

### 3.13 discussions

如果后续要把学习中心论坛做真，需要单独讨论表。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | pk | 主键 |
| title | varchar(255) | not null | 主题 |
| author_id | uuid | fk -> users.id | 作者 |
| category | varchar(50) | not null | 分类 |
| content | text | null | 首帖内容 |
| reply_count | int | not null default 0 | 回复数 |
| status | varchar(20) | not null default 'published' | 状态 |
| created_at | timestamptz | not null | 创建时间 |
| updated_at | timestamptz | not null | 更新时间 |

### 3.14 activity_logs

后台审计日志。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | pk | 主键 |
| actor_id | uuid | fk -> users.id, null | 操作人 |
| action | varchar(100) | not null | 操作标识 |
| target_type | varchar(50) | null | 目标类型 |
| target_id | uuid | null | 目标 id |
| ip_address | varchar(64) | null | IP |
| user_agent | text | null | UA |
| details | jsonb | null | 额外信息 |
| created_at | timestamptz | not null | 时间 |

## 4. 主要关系

### 用户相关

- `users 1 - n vulnerabilities`
- `users 1 - n vulnerability_audits`
- `users 1 - n announcements`
- `users 1 - n certificates`
- `users 1 - n redemptions`
- `users 1 - n user_point_logs`
- `users 1 - n activity_logs`

### 漏洞相关

- `vulnerabilities 1 - n vulnerability_audits`
- `vulnerabilities 1 - n attachments`
- `vulnerabilities 1 - 0..1 certificates`

### 商城相关

- `products 1 - n redemptions`
- `redemptions 1 - 1 user_point_logs` 可通过 `reference_type/reference_id` 建立业务关联

### 内容相关

- `announcements 1 - n attachments` 可选
- `learning_labs`、`learning_materials` 初期可独立存在

## 5. 关系图

```text
users
├──< vulnerabilities.submitter_id
├──< vulnerabilities.current_auditor_id
├──< vulnerability_audits.auditor_id
├──< announcements.author_id
├──< certificates.user_id
├──< certificates.issued_by
├──< redemptions.user_id
├──< redemptions.issued_by
├──< user_point_logs.user_id
├──< user_point_logs.created_by
├──< attachments.uploaded_by
└──< activity_logs.actor_id

vulnerabilities
├──< vulnerability_audits.vulnerability_id
├──< attachments(owner_type='vulnerability', owner_id)
└─── certificates.vulnerability_id

products
└──< redemptions.product_id
```

## 6. 第一版最小落地范围

如果你要先把项目做成可用版，第一版建议只先落这 8 张表：

- `users`
- `vulnerabilities`
- `vulnerability_audits`
- `user_point_logs`
- `announcements`
- `certificates`
- `products`
- `redemptions`

这 8 张表就能先支撑：

- 登录注册
- 用户管理
- 漏洞提交/审核
- 积分发放
- 公告管理
- 证书管理
- 商城兑换

## 7. 下一步建议

下一步可以直接开始两件事之一：

1. 把这份设计转成 `Prisma schema`
2. 先继续细化“字段枚举、状态流转、约束规则”

如果你要我继续，我建议下一步直接做 `Prisma schema`，这样就能进入真实后端开发。 



记忆文件地址
能看到，本地就在你的用户目录下。

  主要位置：

  - 会话文件：/home/cocking/.codex/sessions/2026/03/19/
  - 当前这次会话很可能是：/home/cocking/.codex/sessions/2026/03/19/rollout-2026-03-19T14-40-45-019d04d3-3a8c-7a73-90e8-
    48039ba99afb.jsonl
  - 历史索引：/home/cocking/.codex/history.jsonl

  主要位置：

  - 会话文件：/home/cocking/.codex/sessions/2026/03/19/
  - 当前这次会话很可能是：/home/cocking/.codex/sessions/2026/03/19/rollout-2026-03-19T14-40-45-019d04d3-3a8c-7a73-90e8-
    48039ba99afb.jsonl
  - 历史索引：/home/cocking/.codex/history.jsonl

  - 会话文件：/home/cocking/.codex/sessions/2026/03/19/
  - 当前这次会话很可能是：/home/cocking/.codex/sessions/2026/03/19/rollout-2026-03-19T14-40-45-019d04d3-3a8c-7a73-90e8-
    48039ba99afb.jsonl
  - 历史索引：/home/cocking/.codex/history.jsonl

  如果你只是想导出，最直接就是复制对应的 jsonl 文件。
  如果想快速看内容，可以用：
  sed -n '1,120p' /home/cocking/.codex/sessions/2026/03/19/rollout-2026-03-19T14-40-45-019d04d3-3a8c-7a73-90e8-48039ba99afb.jsonl   
  export.jsonl
  如果你要，我也可以下一步直接帮你把这次会话整理成一份更好读的 markdown 导出。