# CQUPT-SRC 项目计划与交接（持续更新）

## 1. 项目概览
- 前端：React 19 + TypeScript + Vite
- 后端：Node.js + Express + TypeScript
- 数据库：PostgreSQL
- ORM：Prisma 7（`@prisma/client` + `@prisma/adapter-pg`）
- 目标：校园漏洞平台（漏洞提交/审核、学习中心、积分商城、公告、证书、日志、个人中心）

## 2. 当前快照（截至 2026-03-23）

### 2.1 已完成能力
- 核心数据模型已 Prisma 化并落库：`users / vulnerabilities / vulnerability_audits / user_point_logs / announcements / certificates / products / redemptions / learning_*`
- 模块化已完成：`mall / vulnerabilities / announcements / users / learning`（均为 `routes/controller/service`）
- 统一鉴权与错误：`middlewares/auth.ts` + `shared/errors.ts` + 前端 `apiError` 映射
- 前端 `src/views` 已去 `alert` 化，关键写操作已接入二次确认弹窗
- `logs` 角色策略已对齐：前后端统一为 `admin + auditor`
- 漏洞附件链路已上线：必传、白名单格式、大小限制、恶意内容规则拦截、安全预览/下载
- 个人中心已上线：资料编辑、头像上传、密码修改（弹框）
- 排行榜已动态化并做隐私最小化返回（不下发他人敏感字段）
- 注册/改密邮箱验证码闭环已接入（开发环境支持 `devCode`，生产不回显）
- 密码策略已统一：注册、个人改密、管理员重置均为同规则
  - 长度 8-64
  - 至少包含字母/数字/符号中的两类
  - 拦截常见弱口令（如 `123456`、`password123`）

### 2.2 当前未完成
- CI 未接入（仓库暂无 `.github/workflows`）
- README 与实际工程能力仍不完全一致
- 邮箱验证码当前为内存实现（单实例有效），生产需迁移到 Redis + SMTP
- `server.ts` 仍偏大（虽已模块化主要业务，但仍有部分内联接口与逻辑）

## 3. 回归与验收基线
- 类型检查：`npx tsc --noEmit`
- 冒烟：`npm run smoke:api`
- 发布前：`npm run preflight:release`
- 每次任务完成必须：
  1. 代码落盘
  2. 类型检查通过
  3. 关键链路回归（冒烟或最小手工）
  4. 同步更新本文件

## 4. 优先级待办

### P0（当前应优先推进）
- [x] 将邮箱验证码存储迁移到 Redis（替代内存 Map）
- [x] 接入真实 SMTP 发信（替代开发态 `devCode`）
- [x] 敏感操作补审计日志覆盖（账号、密码、权限、附件）

### P1（工程化）
- [ ] 接入 CI：至少 `npm ci + npx tsc --noEmit`
- [ ] 条件允许时将 `smoke:api` 纳入 CI
- [ ] 重写 README（启动、迁移、seed、冒烟、默认账号/权限说明）

### P2（质量与性能）
- [ ] 增加关键 service 测试（users/vulnerabilities/mall）
- [ ] 附件存储从数据库迁移到对象存储（OSS/S3）
- [ ] 密码强度可视化与交互增强（强度条、显示/隐藏密码）

## 5. 关键文件索引
- 后端入口：`server.ts`
- 鉴权中间件：`src/server/middlewares/auth.ts`
- 统一错误：`src/server/shared/errors.ts`
- 密码策略校验：`src/server/validators/password.ts`
- 邮箱验证码服务：`src/server/modules/email-codes/email-codes.service.ts`
- 用户模块：`src/server/modules/users/*`
- 漏洞模块：`src/server/modules/vulnerabilities/*`
- 学习模块：`src/server/modules/learning/*`
- 商城模块：`src/server/modules/mall/*`
- 公告模块：`src/server/modules/announcements/*`
- 注册页：`src/views/Register.tsx`
- 个人中心：`src/views/ProfileCenter.tsx`
- 用户管理：`src/views/UserManage.tsx`
- 漏洞提交：`src/views/VulnSubmit.tsx`
- 项目后端设计：`docs/backend-design.md`
- 发布检查文档：`docs/release-checklist.md`

## 6. 协作约定（强制）
- 后续每次开发操作都要同步更新本文件。
- 记录格式固定为：`结论 / 影响范围 / 下一步`。
- 若发现阻塞、风险、策略变更，先更新本文件再继续实现。

## 7. 近期变更日志（精简）

### 2026-03-20
- 结论：完成项目交接文件重建与执行口径统一。
- 影响范围：后续智能体可快速接手执行。
- 下一步：推进后端模块化与校验统一。

### 2026-03-23（后端架构）
- 结论：`mall / vulnerabilities / announcements / users / learning` 完成模块化拆分并接线。
- 影响范围：`server.ts` 复杂度下降，业务逻辑边界更清晰。
- 下一步：继续补工程化（CI、测试、README）。

### 2026-03-23（交互与策略）
- 结论：前端高频页面去 `alert` 化并补齐关键操作二次确认；`logs` 角色策略对齐为 `admin + auditor`。
- 影响范围：交互一致性、可用性与权限一致性提升。
- 下一步：补关键链路回归测试。

### 2026-03-23（漏洞附件安全）
- 结论：漏洞附件实现“必传 + 格式/大小校验 + 恶意内容规则拦截 + 安全预览下载”。
- 影响范围：附件提交安全基线提升。
- 下一步：生产引入 AV 引擎与对象存储。

### 2026-03-23（个人中心）
- 结论：个人中心页面化完成，支持资料修改、头像上传、弹框改密；修复 `/me/profile` 路由命中问题。
- 影响范围：用户资料链路可用性恢复并稳定。
- 下一步：补充该链路 API 回归用例。

### 2026-03-23（排行榜与数据）
- 结论：排行榜改为后端动态接口，仅统计 `role=user` 且做隐私最小化；已补充 20 个随机白帽用户样本。
- 影响范围：排行榜可用于真实验收，且符合隐私约束。
- 下一步：可补分页与缓存策略。

### 2026-03-23（邮箱验证码）
- 结论：注册与改密接入邮箱验证码，接口已上线并强制校验。
- 影响范围：账号关键操作安全性提升。
- 下一步：迁移 Redis + SMTP，完成生产化。

### 2026-03-23（密码策略统一）
- 结论：注册、个人改密、管理员重置均使用同一密码规则；管理员重置密码改为必填，不再留空自动生成返回。
- 影响范围：密码策略一致性与安全性提升，前端已加规则提示与预校验。
- 下一步：可补密码强度可视化与策略单元测试。

### 2026-03-24（P0 生产化）
- 结论：邮箱验证码支持 `Redis` 存储（`REDIS_URL` 可用时启用）并接入 `SMTP` 发信（`SMTP_*` 完整配置时启用）；新增 `activity_logs` 审计表并覆盖账号/密码/权限/附件操作日志。
- 影响范围：验证码从单机内存升级为可横向扩展存储；可发送真实邮件；`/api/logs` 新增 `security` 来源可追溯敏感操作。
- 下一步：部署环境配置 Redis 与 SMTP 凭证，执行 Prisma 迁移并完成一次全链路冒烟。

### 2026-03-24（项目信息真实化）
- 结论：完成项目元信息去模板化，替换 `react-example / AI Studio` 默认文案为 `CQUPT-SRC` 真实项目信息；清理后端未使用的 Mock 数据段。
- 影响范围：`package.json/package-lock.json` 项目名、`README.md`、`index.html` 标题、`.env.example` 均与当前工程能力和部署变量对齐。
- 下一步：继续推进 P1（CI 接入）并补 README 中默认账号/权限与冒烟示例章节。

### 2026-03-24（默认账号真实化）
- 结论：种子普通用户由 `temp` 调整为 `cqupt_user`，并将冒烟脚本登录口径同步为 `cqupt_user / cqupt123`；随机白帽用户默认密码由 `temp12345` 调整为 `whitehat12345`。
- 影响范围：`prisma/seed.ts` 与 `scripts/smoke-api.mjs` 的默认凭据和文案与项目命名一致；旧库执行 seed 后会按 `id` 更新用户信息。
- 下一步：重跑 `npm run db:seed` 后执行 `npm run smoke:api` 做全链路校验。

### 2026-03-24（登录页忘记密码）
- 结论：登录页新增“忘记密码”流程，支持未登录态通过“认证码 + 邮箱 + 邮箱验证码”重置密码；后端新增找回验证码发送与密码重置接口。
- 影响范围：`server.ts` 新增 `/api/auth/email-code/forgot/send` 与 `/api/auth/password/forgot/reset`；`src/views/Login.tsx` 新增找回密码弹窗、验证码发送倒计时与密码策略校验；审计日志新增 `user.password.forgot_reset`。
- 下一步：可补充该流程的专项 smoke 用例（含验证码错误/过期分支）并加入发布前检查。

### 2026-03-24（商城规则优化）
- 结论：商城管理分类新增“其他”；兑换能力收敛为仅普通用户可发起，管理员/审核员不可兑换；兑换记录保持真实数据展示。
- 影响范围：`src/views/MallManage.tsx` 分类选项与筛选项补齐“其他”，分类统计改为动态；`src/server/modules/mall/mall.service.ts` 与 `mall.controller.ts` 增加兑换角色校验；`scripts/smoke-api.mjs` 已调整为“用户兑换 + 管理员发放”口径。
- 下一步：重启 dev 服务后执行 `npm run smoke:api`，确认新权限规则在运行环境生效。

### 2026-03-24（统一认证码 7 位化）
- 结论：登录改为仅支持“统一认证码 + 密码”；统一认证码格式统一为 7 位数字，并在登录、注册、找回密码、后台新增/编辑用户全链路校验。
- 影响范围：`server.ts` 登录口径从 `username/authCode` 改为仅 `authCode`；`src/server/modules/users/users.service.ts` 新增统一认证码格式校验；`src/views/Login.tsx`、`src/views/Register.tsx`、`src/views/UserManage.tsx` 前端输入限制为 7 位数字；`prisma/seed.ts` 在 seed 时会将历史数字认证码规范化到 7 位并更新默认种子账号认证码。
- 下一步：重启服务后使用统一认证码登录验证（示例：admin `0000001`，普通用户 `2024999`），再执行一次 smoke 回归。

### 2026-03-24（漏洞管理编辑限制）
- 结论：漏洞管理新增规则：未审核漏洞（`待处理/审核中`）不可编辑漏洞内容字段（标题、目标、类型、等级、描述），仅允许进行状态操作。
- 影响范围：`src/views/VulnManage.tsx` 编辑按钮在未审核状态下禁用并显示说明；`src/server/modules/vulnerabilities/vulnerabilities.service.ts` 增加后端兜底校验，防止绕过前端直接编辑；`vulnerabilities.controller.ts` 新增对应错误映射。
- 下一步：可补充该规则的 API 冒烟用例（未审核编辑应返回 403，状态流转仍可成功）。

### 2026-03-24（首页活跃白帽模块）
- 结论：首页“活跃白帽”指标从固定文案改为动态统计；管理员视角读取 `/api/users` 后按 `role=user && status=Active` 实时计算，普通用户视角回退使用排行榜接口统计。
- 影响范围：`src/views/Home.tsx` 新增统计数据获取逻辑与加载态展示，首页指标可反映真实数据。
- 下一步：可继续将首页其余统计卡片（总漏洞/已修复）也改为同口径后端动态数据。

### 2026-03-24（首页统计卡片动态化）
- 结论：首页“总漏洞数 / 已修复”已改为动态统计：从 `/api/vulnerabilities` 实时计算总数与已修复数。
- 影响范围：`src/views/Home.tsx` 三个核心指标（总漏洞、已修复、活跃白帽）均已脱离硬编码，加载阶段统一展示占位值。
- 下一步：可补首页聚合接口，减少多接口请求并统一统计口径。

### 2026-03-24（首页雷达角色化优化）
- 结论：首页雷达改为数据驱动并按角色区分：管理员/审核员展示“总体漏洞分析雷达”，普通用户展示“我的漏洞分析雷达”。
- 影响范围：`src/views/Home.tsx` 新增基于 `/api/vulnerabilities` 的六维雷达计算（漏洞覆盖、高危识别、修复闭环、类型广度、响应效率、报告完整），并输出动态结论文案。
- 下一步：可将雷达维度口径下沉到后端聚合接口，保证跨页面一致性。

### 2026-03-24（批量补充漏洞数据）
- 结论：已批量新增 80 条漏洞数据（含状态、等级、类型、提交人和审核记录），用于管理端与分析模块验收。
- 影响范围：新增脚本 `scripts/add-80-vulnerabilities.mjs` 执行落库；校验脚本 `scripts/check-vuln-count.mjs` 显示当前漏洞总数为 88（原有 8 + 新增 80）。
- 下一步：如需继续扩容样本，可按同脚本参数化生成指定数量并加入重复数据去重策略。

### 2026-03-24（学习中心靶场管理交互优化）
- 结论：学习中心靶场管理改为“列表 + 新增/编辑弹窗”模式，弹窗支持名称、介绍、难度、地址、图片上传/URL、积分编辑；新增难度联动默认积分规则（简单 50 / 中等 100 / 困难 300）。
- 影响范围：`src/views/LearningManage.tsx` 靶场操作体验与商品管理风格对齐；`src/views/LearningCenter.tsx` 同步强化用户端靶场卡片信息层级（难度/积分/入口动作）与展示密度。
- 下一步：重启前端后做学习中心链路手工回归（新增靶场、编辑靶场、难度切换积分默认值、用户端展示与进入链接）。

### 2026-03-24（学习中心移除讨论模块）
- 结论：学习中心管理页已移除“讨论”模块，仅保留“靶场 / 资料”两个管理维度。
- 影响范围：`src/views/LearningManage.tsx` 删除讨论 Tab、讨论发布表单、讨论列表、讨论接口请求与归档逻辑，页面交互与数据请求更聚焦。
- 下一步：重启前端后确认学习中心管理页无“讨论”入口，靶场与资料管理链路正常。

### 2026-03-24（学习中心资料模块与靶场模块统一）
- 结论：资料模块已改为与靶场模块一致的交互模型（列表页 + 新增/编辑弹窗），统一操作入口、表格结构与弹窗提交路径。
- 影响范围：`src/views/LearningManage.tsx` 资料管理新增 `openAdd/openEdit` 弹窗流程，移除原内联表单；资料类型改为下拉选择（兼容历史类型动态并入）；资料列表新增地址列与空态提示。
- 下一步：重启前端后按“新增资料/编辑资料/删除资料/搜索筛选”全链路回归，确认和靶场模块体验一致。

### 2026-03-24（学习中心地址与资料上传规则调整）
- 结论：靶场与资料默认地址占位从 `#` 改为空字符串；资料管理改为仅支持本地文件上传，不再要求填写外部 URL。
- 影响范围：`src/views/LearningManage.tsx` 资料弹窗移除 URL 文本输入，改为本地文件上传并以 data URL 提交后端；资料列表“地址”列改为“文件状态”；`src/views/LearningCenter.tsx` 资料下载按钮接入真实下载逻辑（data URL 触发下载，普通链接新窗口打开）；`src/server/modules/learning/learning.service.ts` 新增创建默认地址为空字符串。
- 下一步：重启服务后手工验证“新增资料上传本地文件 -> 用户端点击下载 -> 资料编辑保持文件状态”链路。

### 2026-03-24（资料来源改为 URL/本地二选一）
- 结论：资料录入支持“外部 URL”与“本地上传”二选一，满足不同资料来源场景。
- 影响范围：`src/views/LearningManage.tsx` 资料弹窗新增来源切换按钮，URL 模式显示地址输入，本地模式显示上传控件；提交校验改为“链接或文件至少一项”；资料列表资源列可区分“外部链接/本地文件/未设置”。
- 下一步：手工验证两条路径（URL 新增资料与本地文件新增资料）在管理端和用户端下载动作均可用。

### 2026-03-24（资料封面图上传与用户端展示）
- 结论：资料模块新增封面图上传能力，用户端资料卡支持优先展示资料封面图（无图时回退类型图标）。
- 影响范围：`prisma/schema.prisma` 与迁移 `20260324164000_add_learning_material_image` 为 `learning_materials` 增加 `image_url` 字段；`src/server/modules/learning/learning.service.ts` 与 `learning.controller.ts` 打通 `image` 字段读写；`src/views/LearningManage.tsx` 新增资料封面上传控件；`src/views/LearningCenter.tsx` 资料卡展示封面图；`prisma/seed.ts` 学习资料样本补充真实 URL 与封面图。
- 下一步：执行 `npm run db:migrate` 后重启服务，验证“新增资料上传封面 -> 用户端下载中心展示封面”全链路。

### 2026-03-24（证书 PDF 预览能力）
- 结论：证书模块新增 PDF 预览功能，支持在浏览器中直接查看证书内容。
- 影响范围：`server.ts` 的 `/api/certificates/:id/pdf` 新增 `mode=preview` 时返回 `inline`；`src/views/CertificateManage.tsx` 与 `src/views/CertificateSearch.tsx` 增加“预览”按钮并打开预览链接。
- 下一步：重启服务后手工验证管理端与查询端的“预览/下载”均可正常使用。

### 2026-03-24（证书预览按钮样式调整）
- 结论：证书预览入口由图标改为小按钮文案“预览”，提升可识别性。
- 影响范围：`src/views/CertificateManage.tsx` 与 `src/views/CertificateSearch.tsx` 的证书列表/卡片操作区均改为文字按钮样式。
- 下一步：重启前端后确认“预览”按钮文案与点击行为符合预期。

### 2026-03-24（证书编号规则升级）
- 结论：证书编号生成规则改为 `CQUPT` + 15 位随机不可预测字符，并在写入前后均做唯一性保障（查重 + 唯一约束冲突重试）。
- 影响范围：`server.ts` 证书签发逻辑移除 `CERT-年-序号` 规则，改为安全随机编号；`src/views/CertificateSearch.tsx` 查询输入示例更新为新格式；`prisma/seed.ts` 示例证书编号同步为 `CQUPT` 前缀格式。
- 下一步：重启服务后新增一张证书，验证编号前缀、长度、随机性和唯一性。

### 2026-03-24（证书编号长度调整为 12 位后缀）
- 结论：证书编号后缀长度从 15 位下调为 12 位，规则调整为 `CQUPT` + 12 位随机字符（总长 17）。
- 影响范围：`server.ts` 的 `CERT_CODE_SUFFIX_LENGTH` 已由 `15` 调整为 `12`，仍保留不可预测随机生成与唯一性冲突重试机制。
- 下一步：重启服务后签发新证书，确认编号长度与唯一性符合预期。

### 2026-03-24（证书编号前缀格式修正）
- 结论：证书编号前缀由 `CQUPT` 修正为 `CQUPT-`，最终格式为 `CQUPT-` + 12 位随机字符。
- 影响范围：`server.ts` 的 `CERT_CODE_PREFIX` 已更新；`src/views/CertificateSearch.tsx` 查询示例占位与 `prisma/seed.ts` 示例证书编号同步为连字符格式。
- 下一步：重启服务后新增证书并按新格式查询，确认前后端展示一致。

### 2026-03-24（管理员用户管理支持积分修改）
- 结论：管理员在用户管理编辑弹窗中可直接修改用户积分并保存。
- 影响范围：`src/views/UserManage.tsx` 编辑用户表单新增“积分”输入框；提交更新时 `PATCH /api/users/:id` 同步携带 `points` 字段（前端限制非负整数）。
- 下一步：重启前端后手工验证“编辑用户积分 -> 保存 -> 列表积分刷新”链路。

### 2026-03-24（排行榜头像显示修复）
- 结论：排行榜改为优先显示用户真实头像，未上传头像时回退默认头像图。
- 影响范围：`src/server/modules/users/users.service.ts` 的 `listLeaderboard` 返回新增 `avatar` 字段；`src/views/Leaderboard.tsx` 头像渲染优先使用接口返回的 `avatar`。
- 下一步：重启服务后验证“个人中心上传头像 -> 排行榜显示对应头像”链路。
