#!/bin/bash
# ================================================================
# CQUPT 安全组考核靶场 — 靶场环境初始化脚本
# 功能：构建镜像、创建模板数据库、初始化10个Slot、申请SSL证书
# 用法：bash init-range.sh <certbot邮箱>
# ================================================================

set -e

DOMAIN="cquptsrc.asia"
EMAIL="${1:-}"
COMPOSE_PROJECT=$(docker compose ls --format json 2>/dev/null | python3 -c "import json,sys; data=json.load(sys.stdin); print(next((p['Name'] for p in data if 'cqupt' in p.get('Name','')), 'cqupt-src-142'))" 2>/dev/null || echo "cqupt-src-142")

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log()  { echo -e "${BLUE}[$(date '+%H:%M:%S')] $1${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
err()  { echo -e "${RED}✗ $1${NC}"; exit 1; }

if [ -z "$EMAIL" ]; then
  err "用法: bash init-range.sh your@email.com"
fi

if [ ! -f ".env" ]; then
  err ".env 文件不存在，请先配置"
fi

source .env 2>/dev/null || true
DB_PASS="${DB_PASSWORD:-postgres123}"
DB_USR="${DB_USER:-postgres}"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  CQUPT 安全组考核靶场 - 初始化${NC}"
echo -e "${BLUE}  域名: ${DOMAIN} | 邮箱: ${EMAIL}${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# ── Step 1: 构建 App 镜像 ─────────────────────────────────────────────────────
log "[1/6] 构建 App 镜像..."
docker compose build app-1
ok "镜像构建完成"

# ── Step 2: 构建 Portal 镜像 ──────────────────────────────────────────────────
log "[2/6] 构建 Portal 镜像..."
docker compose build portal
ok "Portal 镜像构建完成"

# ── Step 3: 启动 Postgres & Redis ─────────────────────────────────────────────
log "[3/6] 启动数据库服务..."
docker compose up -d postgres redis
warn "等待 Postgres 就绪（15秒）..."
sleep 15

# ── Step 4: 创建模板数据库并完成迁移+Seed ─────────────────────────────────────
log "[4/6] 创建模板数据库 cqupt_template..."

# 创建模板数据库
docker compose exec postgres psql -U "${DB_USR}" -c "DROP DATABASE IF EXISTS cqupt_template" 2>/dev/null || true
docker compose exec postgres psql -U "${DB_USR}" -c \
  "CREATE DATABASE cqupt_template WITH ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0"

ok "模板数据库已创建"

# 在模板数据库上运行迁移
log "    执行数据库迁移..."
docker compose run --rm --no-deps \
  -e "DATABASE_URL=postgresql://${DB_USR}:${DB_PASS}@postgres:5432/cqupt_template" \
  app-1 \
  npx prisma migrate deploy --config prisma.config.ts
ok "迁移完成"

# 运行 Seed（管理员账号、漏洞数据等）
log "    执行数据库 Seed..."
docker compose run --rm --no-deps \
  -e "DATABASE_URL=postgresql://${DB_USR}:${DB_PASS}@postgres:5432/cqupt_template" \
  app-1 \
  npx tsx prisma/seed.ts
ok "Seed 完成"

# ── Step 5: 从模板创建 10 个 Slot 数据库 ─────────────────────────────────────
log "[5/6] 创建 10 个独立 Slot 数据库..."

# 将模板数据库设置为不允许新连接（防止克隆时有连接）
docker compose exec postgres psql -U "${DB_USR}" -c \
  "UPDATE pg_database SET datallowconn = false WHERE datname = 'cqupt_template'" 2>/dev/null || true

for i in $(seq 1 10); do
  SLOT_DB="cqupt_slot_${i}"
  # 删除已有的 slot db
  docker compose exec postgres psql -U "${DB_USR}" -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${SLOT_DB}'" 2>/dev/null || true
  docker compose exec postgres psql -U "${DB_USR}" -c \
    "DROP DATABASE IF EXISTS ${SLOT_DB}" 2>/dev/null || true
  # 从模板克隆
  docker compose exec postgres psql -U "${DB_USR}" -c \
    "CREATE DATABASE ${SLOT_DB} TEMPLATE cqupt_template"
  echo -e "    ${GREEN}✓${NC} cqupt_slot_${i}"
done

# 恢复模板数据库连接（Portal 用于克隆）
docker compose exec postgres psql -U "${DB_USR}" -c \
  "UPDATE pg_database SET datallowconn = true WHERE datname = 'cqupt_template'" 2>/dev/null || true

ok "10 个 Slot 数据库创建完成"

# ── Step 6: SSL 证书 + 启动全部服务 ──────────────────────────────────────────
log "[6/6] 申请 SSL 证书并启动全部服务..."

# 以 HTTP-only nginx 申请证书
COMPOSE_NET="${COMPOSE_PROJECT}_cqupt-network"
ACTUAL_NET=$(docker network ls --filter "name=cqupt-network" --format "{{.Name}}" | head -1)
if [ -z "$ACTUAL_NET" ]; then
  # 网络还不存在，先创建基础服务的网络
  docker compose up -d postgres redis portal
  sleep 5
  ACTUAL_NET=$(docker network ls --filter "name=cqupt-network" --format "{{.Name}}" | head -1)
fi

LE_VOL=$(docker volume ls --filter name=letsencrypt --format '{{.Name}}' | head -1)
CW_VOL=$(docker volume ls --filter name=certbot_webroot --format '{{.Name}}' | head -1)

# 检查证书是否已存在
CERT_EXISTS=false
if docker run --rm -v "${LE_VOL}:/etc/letsencrypt" alpine \
    test -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" 2>/dev/null; then
  CERT_EXISTS=true
  warn "SSL 证书已存在，跳过申请"
fi

if [ "$CERT_EXISTS" = false ]; then
  warn "启动临时 HTTP nginx 进行域名验证..."
  docker run --rm -d \
    --name cqupt-nginx-init-range \
    --network "${ACTUAL_NET}" \
    -p 80:80 \
    -v "$(pwd)/nginx-init.conf:/etc/nginx/nginx.conf:ro" \
    -v "${CW_VOL}:/var/www/certbot" \
    nginx:alpine
  sleep 3

  docker run --rm \
    -v "${LE_VOL}:/etc/letsencrypt" \
    -v "${CW_VOL}:/var/www/certbot" \
    certbot/certbot:latest certonly \
    --webroot --webroot-path=/var/www/certbot \
    --email "${EMAIL}" --agree-tos --no-eff-email \
    -d "${DOMAIN}" -d "www.${DOMAIN}"

  docker stop cqupt-nginx-init-range 2>/dev/null || true
  ok "SSL 证书申请成功"
fi

# 启动全部服务
log "启动全部服务（含 10 个 App Slot）..."
docker compose up -d
warn "等待所有服务就绪（30秒）..."
sleep 30

# ── 完成 ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  靶场初始化完成！${NC}"
echo -e "${GREEN}  访问: https://${DOMAIN}${NC}"
echo -e "${GREEN}  最大并发: 10 人${NC}"
echo -e "${GREEN}  会话超时: 30 分钟${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
docker compose ps
