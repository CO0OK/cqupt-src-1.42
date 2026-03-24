# 发布前检查（Preflight）

在本地启动服务后执行：

```bash
npm run preflight:release
```

该命令包含：
- `tsc --noEmit`（类型检查）
- `npm run smoke:api`（learning + mall + logs 关键链路回归）

说明：
- 若 `smoke:api` 报 `fetch failed` 或连接错误，请先确认 `npm run dev` 已启动。
- 如需指定服务地址，可设置 `SMOKE_BASE_URL`，例如：

```bash
SMOKE_BASE_URL=http://localhost:3000 npm run preflight:release
```
