# Docker 部署指南

## 📋 目录

1. [本地开发环境](#本地开发环境)
2. [云服务器部署](#云服务器部署)
3. [环境变量配置](#环境变量配置)
4. [常见问题](#常见问题)
5. [监控和维护](#监控和维护)

---

## 本地开发环境

### 前置要求

- Docker Desktop 4.0+
- Docker Compose 2.0+

### 快速启动

```bash
# 1. 复制环境配置
cp .env.example .env

# 2. 编辑 .env 文件（可选，使用默认值即可开发）
nano .env

# 3. 启动所有服务
docker-compose up -d

# 4. 执行数据库迁移和初始化
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma db seed

# 5. 检查服务状态
docker-compose ps
```

### 开发工作流

```bash
# 查看日志
docker-compose logs -f app

# 停止所有服务
docker-compose down

# 重建镜像（修改依赖后）
docker-compose down && docker-compose up -d --build

# 进入应用容器
docker-compose exec app sh

# 进入 PostgreSQL 容器
docker-compose exec postgres psql -U postgres -d cqupt_src
```

---

## 云服务器部署

### 1️⃣ 云服务器准备

#### 推荐配置

| 项目 | 要求 | 建议 |
|------|------|------|
| **CPU** | 2核+ | 4核+ |
| **内存** | 2GB+ | 4GB+ |
| **存储** | 20GB+ | 50GB+ (SSD) |
| **系统** | Linux | Ubuntu 22.04 / CentOS 8+ |
| **网络** | 公网IP | 1Mbps+ 上行带宽 |

#### 支持的云平台

- 🇨🇳 阿里云 (ECS)
- 🇨🇳 腾讯云 (CVM)
- 🇨🇳 华为云 (ECS)
- 🌐 AWS (EC2)
- 🌐 DigitalOcean
- 🌐 Linode
- 🌐 Heroku (容器部署)

### 2️⃣ Docker 和 Docker Compose 安装

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sudo sh

# 将当前用户添加到 docker 组（避免使用 sudo）
sudo usermod -aG docker $USER
newgrp docker

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

### 3️⃣ 项目部署

#### 方式 A：使用 Git 克隆（推荐）

```bash
# 创建应用目录
sudo mkdir -p /opt/cqupt-src
cd /opt/cqupt-src

# 克隆项目
sudo git clone https://your-repo-url.git .

# 设置权限
sudo chown -R $USER:$USER /opt/cqupt-src

# 复制并编辑环境变量
cp .env.example .env
nano .env  # 编辑关键配置
```

#### 方式 B：使用 SCP 上传

```bash
# 本地执行：压缩项目
zip -r cqupt-src.zip . -x "node_modules/*" ".git/*" "dist/*"

# 上传到服务器
scp cqupt-src.zip user@your-server:/tmp/

# 服务器执行：解压和部署
ssh user@your-server
sudo mkdir -p /opt/cqupt-src
sudo unzip /tmp/cqupt-src.zip -d /opt/cqupt-src
sudo chown -R $USER:$USER /opt/cqupt-src
cd /opt/cqupt-src
cp .env.example .env
nano .env
```

### 4️⃣ 启动和初始化

```bash
# 启动所有服务
docker-compose up -d

# 等待服务就绪（约 30 秒）
sleep 30

# 执行数据库初始化
docker-compose exec -T app npx prisma migrate deploy
docker-compose exec -T app npx prisma db seed

# 检查服务状态
docker-compose ps

# 验证应用是否运行
curl http://localhost:3000/health
```

### 5️⃣ 域名和 SSL 配置

#### 域名绑定

```bash
# 方式 1：使用云服务商的 DNS 管理
# 添加 A 记录：yourdomain.com -> 你的服务器IP

# 方式 2：修改 nginx.conf 中的 server_name
server_name yourdomain.com www.yourdomain.com;
```

#### SSL 证书（Let's Encrypt）

```bash
# 1. 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 2. 获取证书（需要已配置域名）
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# 3. 证书路径
# - 公钥：/etc/letsencrypt/live/yourdomain.com/fullchain.pem
# - 私钥：/etc/letsencrypt/live/yourdomain.com/privkey.pem

# 4. 更新 nginx.conf，取消注释 SSL 配置
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

# 5. 自动续期
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

#### 更新 Nginx 配置

```bash
# 编辑 nginx.conf，启用 HTTPS
nano nginx.conf

# 重启 nginx 容器
docker-compose restart nginx

# 验证 SSL
curl -I https://yourdomain.com
```

### 6️⃣ 生产环境优化

#### 更新 .env 关键参数

```bash
# 编辑 .env
nano .env

# 必须修改的项：
NODE_ENV=production
JWT_SECRET=generate-a-strong-random-string  # 使用 openssl rand -hex 32
DB_PASSWORD=set-a-strong-password           # 使用强密码
REDIS_PASSWORD=set-a-strong-password
SMTP_USER=your-actual-email
SMTP_PASS=your-actual-password
APP_URL=https://yourdomain.com
```

#### 重启应用以应用新配置

```bash
docker-compose restart app
```

---

## 环境变量配置

### 关键变量说明

| 变量 | 说明 | 示例 |
|-----|------|------|
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 应用端口 | `3000` |
| `DATABASE_URL` | PostgreSQL 连接 | `postgresql://user:pass@postgres:5432/db` |
| `JWT_SECRET` | JWT 密钥（**必须改**） | `openssl rand -hex 32` |
| `REDIS_URL` | Redis 连接（可选） | `redis://:password@redis:6379` |
| `SMTP_*` | 邮件配置 | 见下表 |
| `GEMINI_API_KEY` | 谷歌 AI（可选） | `sk-...` |

### SMTP 配置示例

#### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-digit-app-password  # 使用应用密码，非账户密码
SMTP_FROM=your-email@gmail.com
```

#### QQ 邮箱
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=你的QQ邮箱
SMTP_PASS=你的授权码  # 需在 QQ 邮箱设置中生成
SMTP_FROM=你的QQ邮箱
```

#### 阿里云邮件推送
```env
SMTP_HOST=smtpdm.aliyun.com
SMTP_PORT=25
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=你的授权码
SMTP_FROM=noreply@yourdomain.com
```

---

## 常见问题

### ❌ 容器无法启动

```bash
# 查看错误日志
docker-compose logs app

# 常见原因：
# 1. 数据库未就绪 → 等待数据库启动
# 2. 端口被占用 → 修改 .env 中的 PORT
# 3. 内存不足 → 增加云服务器内存
```

### ❌ 数据库连接失败

```bash
# 1. 检查 PostgreSQL 是否运行
docker-compose logs postgres

# 2. 验证数据库凭证
docker-compose exec postgres psql -U postgres -l

# 3. 重建数据库
docker-compose down -v  # 删除所有数据！
docker-compose up -d
docker-compose exec app npx prisma migrate deploy
```

### ❌ 邮件无法发送

```bash
# 1. 检查 SMTP 凭证是否正确
# 2. 验证防火墙允许 SMTP 出站流量
# 3. 查看应用日志
docker-compose logs app | grep -i mail

# 4. 测试 SMTP 连接
docker-compose exec app node -e "
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  transporter.verify((error, success) => {
    if (error) console.log('Error:', error);
    else console.log('Connection:', success);
  });
"
```

### ❌ 高流量时性能下降

```bash
# 增加 Redis 内存（缓存）
# 在 docker-compose.yml 中增加
redis:
  command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 512mb --maxmemory-policy allkeys-lru

# 增加 Nginx Worker 进程
# 在 nginx.conf 中修改
worker_processes 4;  # 根据 CPU 核心数调整

# 增加应用副本数（需使用 Kubernetes）
```

### 🔄 如何更新应用代码

```bash
# 1. 更新源代码
cd /opt/cqupt-src
git pull origin main

# 2. 重建镜像
docker-compose down
docker-compose up -d --build

# 3. 执行新的数据库迁移（如有）
docker-compose exec app npx prisma migrate deploy

# 4. 验证
docker-compose ps
curl http://localhost:3000/health
```

---

## 监控和维护

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 仅查看应用日志
docker-compose logs -f app

# 查看最后 100 行
docker-compose logs --tail=100 app

# 导出日志到文件
docker-compose logs app > app.log
```

### 定期备份

```bash
# 备份 PostgreSQL 数据
docker-compose exec -T postgres pg_dump -U postgres cqupt_src > backup-$(date +%Y%m%d).sql

# 备份 Redis 数据
docker cp cqupt-src-redis:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb

# 备份整个 /opt 目录
sudo tar -czf /backup/cqupt-src-$(date +%Y%m%d).tar.gz /opt/cqupt-src
```

### 恢复备份

```bash
# 恢复 PostgreSQL
docker-compose exec -T postgres psql -U postgres cqupt_src < backup-20240422.sql

# 恢复 Redis（停止 Redis 后）
docker-compose stop redis
docker cp redis-backup-20240422.rdb cqupt-src-redis:/data/dump.rdb
docker-compose start redis
```

### 定期维护

```bash
# 清理未使用的镜像和容器
docker system prune -a

# 更新镜像
docker-compose pull
docker-compose up -d

# 检查磁盘使用
docker system df

# 查看容器资源使用
docker stats
```

### 监控命令

```bash
# 实时监控容器状态
watch -n 1 'docker-compose ps'

# 查看容器 CPU 和内存使用
docker stats cqupt-src-app

# 查看磁盘使用
df -h /var/lib/docker/volumes/

# 查看 PostgreSQL 连接数
docker-compose exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

### 启用监控工具（可选）

```bash
# 使用 Portainer 管理 Docker
docker run -d -p 9000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  portainer/portainer-ce

# 访问 http://your-server:9000

# 使用 Prometheus + Grafana 监控
# 编辑 docker-compose.yml，添加 prometheus 和 grafana 服务
```

---

## 🚀 部署清单

- [ ] 服务器配置完成（至少 2GB RAM，20GB 存储）
- [ ] Docker 和 Docker Compose 安装完成
- [ ] 项目代码克隆/上传到服务器
- [ ] `.env` 文件配置（JWT_SECRET, DB_PASSWORD 等）
- [ ] 执行 `docker-compose up -d` 启动服务
- [ ] 执行 `docker-compose exec app npx prisma migrate deploy`
- [ ] 验证应用可访问（`curl http://localhost:3000/health`）
- [ ] 配置域名和 SSL 证书
- [ ] 配置备份策略
- [ ] 测试邮件发送功能
- [ ] 文档更新和团队培训

---

## 📞 故障排查

### 获取帮助

```bash
# 收集诊断信息
docker-compose logs > logs.txt
docker system df >> logs.txt
docker-compose ps >> logs.txt
uname -a >> logs.txt

# 联系技术支持，提供 logs.txt 和以下信息：
# - 云服务商和配置
# - 部署命令和错误信息
# - 网络环境（防火墙规则等）
```

---

**最后更新**：2024 年 4 月
**维护者**：CQUPT SRC 团队
