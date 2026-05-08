#!/bin/bash
# ================================================================
# CQUPT SRC - SSL 证书初始化脚本
# 功能：首次部署时申请 Let's Encrypt 证书
# 用法：bash init-ssl.sh your@email.com
# ================================================================

set -e

DOMAIN="cquptsrc.asia"
EMAIL="${1:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$EMAIL" ]; then
    echo -e "${RED}错误：请提供邮箱地址${NC}"
    echo "用法: bash init-ssl.sh your@email.com"
    exit 1
fi

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  CQUPT SRC - SSL 证书初始化${NC}"
echo -e "${BLUE}  域名: ${DOMAIN}${NC}"
echo -e "${BLUE}  邮箱: ${EMAIL}${NC}"
echo -e "${BLUE}================================================${NC}"

# 检查 Docker 和 docker compose
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误：Docker 未安装${NC}"
    exit 1
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo -e "${RED}错误：.env 文件不存在，请先配置${NC}"
    exit 1
fi

# Step 1: 创建 certbot webroot 目录（docker volume 将自动创建，先确保本地辅助目录存在）
echo -e "${BLUE}[1/5] 准备目录...${NC}"
mkdir -p ./certbot-webroot-tmp

# Step 2: 启动 postgres、redis、app（不启动 nginx）
echo -e "${BLUE}[2/5] 启动数据库和应用服务...${NC}"
docker compose up -d postgres redis app
echo -e "${YELLOW}等待应用启动（15秒）...${NC}"
sleep 15

# Step 3: 以 HTTP-only 配置启动 nginx（用于 ACME challenge）
echo -e "${BLUE}[3/5] 以 HTTP 模式启动 nginx 用于域名验证...${NC}"
# 动态获取 docker compose 创建的网络名
COMPOSE_NETWORK=$(docker network ls --filter "name=cqupt-network" --format "{{.Name}}" | head -1)
if [ -z "$COMPOSE_NETWORK" ]; then
    echo -e "${RED}错误：找不到 cqupt-network 网络，请确认 docker compose up 已成功启动${NC}"
    exit 1
fi
echo -e "${YELLOW}使用网络: ${COMPOSE_NETWORK}${NC}"

docker run --rm -d \
    --name cqupt-src-nginx-init \
    --network "${COMPOSE_NETWORK}" \
    -p 80:80 \
    -v "$(pwd)/nginx-init.conf:/etc/nginx/nginx.conf:ro" \
    -v "$(docker volume ls --filter name=certbot_webroot --format '{{.Name}}' | head -1):/var/www/certbot" \
    nginx:alpine

echo -e "${YELLOW}等待 nginx 初始化...${NC}"
sleep 3

# Step 4: 申请 Let's Encrypt 证书（webroot 模式）
echo -e "${BLUE}[4/5] 申请 Let's Encrypt 证书...${NC}"
LE_VOL=$(docker volume ls --filter name=letsencrypt --format '{{.Name}}' | head -1)
CW_VOL=$(docker volume ls --filter name=certbot_webroot --format '{{.Name}}' | head -1)
docker run --rm \
    -v "${LE_VOL}:/etc/letsencrypt" \
    -v "${CW_VOL}:/var/www/certbot" \
    certbot/certbot:latest certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}"

# Step 5: 停止临时 nginx，启动完整服务栈
echo -e "${BLUE}[5/5] 启动完整生产服务栈...${NC}"
docker stop cqupt-src-nginx-init 2>/dev/null || true

# 执行数据库迁移
echo -e "${YELLOW}执行数据库迁移...${NC}"
docker compose exec -T app npx prisma migrate deploy --config prisma.config.ts

# 启动所有服务（包含带 HTTPS 配置的 nginx）
docker compose up -d

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  SSL 证书申请成功！${NC}"
echo -e "${GREEN}  访问: https://${DOMAIN}${NC}"
echo -e "${GREEN}  证书将每 12 小时自动检查续期${NC}"
echo -e "${GREEN}================================================${NC}"
