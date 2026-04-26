# Docker 部署快速参考

## 🚀 5 分钟快速启动

```bash
# 1. 复制配置
cp .env.example .env

# 2. 启动服务
docker-compose up -d

# 3. 初始化数据库
docker-compose exec app npx prisma migrate deploy

# 4. 访问应用
# http://localhost:3000
```

---

## 📋 常用命令

```bash
# 启动 | 停止 | 重启 | 删除
docker-compose up -d
docker-compose down
docker-compose restart
docker-compose down -v  # 删除所有数据！

# 查看日志
docker-compose logs -f app          # 应用日志
docker-compose logs -f postgres     # 数据库日志
docker-compose logs -f              # 所有日志

# 进入容器
docker-compose exec app sh          # 应用容器
docker-compose exec postgres psql -U postgres -d cqupt_src  # 数据库

# 数据库操作
docker-compose exec -T app npx prisma migrate deploy       # 迁移
docker-compose exec -T app npx prisma db seed              # 初始化数据
docker-compose exec -T postgres pg_dump -U postgres cqupt_src > backup.sql  # 备份

# 状态和资源
docker-compose ps                   # 容器状态
docker stats                        # 资源使用
docker system df                    # 磁盘使用
```

---

## ⚙️ 关键环境变量

```bash
# 必须改！生成强密钥
openssl rand -hex 32

# 在 .env 中配置
NODE_ENV=production
JWT_SECRET=<生成的强密钥>
DB_PASSWORD=<强密码>
REDIS_PASSWORD=<强密码>
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
APP_URL=https://yourdomain.com
```

---

## 🌐 云服务器部署 (10 步)

### 1. 购买云服务器
- 配置：2核 4GB 内存，50GB SSD，Ubuntu 22.04
- 云服商：阿里云、腾讯云、AWS、DigitalOcean 等

### 2. 安装 Docker
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

### 3. 克隆项目
```bash
git clone https://your-repo-url.git /opt/cqupt-src
cd /opt/cqupt-src
```

### 4. 配置环境
```bash
cp .env.example .env
nano .env  # 编辑所有 * 标记的变量
```

### 5. 启动服务
```bash
docker-compose up -d
docker-compose exec -T app npx prisma migrate deploy
```

### 6. 配置域名
- 云服商 DNS 中添加 A 记录指向服务器 IP

### 7. 配置 SSL（免费）
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com
```

### 8. 更新 nginx.conf
- 取消注释 SSL 配置
- 更新证书路径

### 9. 重启 Nginx
```bash
docker-compose restart nginx
```

### 10. 验证
```bash
curl https://yourdomain.com
```

---

## 📁 文件结构

```
项目根目录/
├── Dockerfile                    # Docker 构建配置
├── docker-compose.yml            # 容器编排配置
├── .dockerignore                 # Docker 忽略文件
├── nginx.conf                    # Nginx 反向代理配置
├── deploy.sh                     # Linux/Mac 部署脚本
├── deploy.bat                    # Windows 部署脚本
├── .env.example                  # 环境变量示例
├── DOCKER_DEPLOYMENT.md          # 详细部署指南
├── DOCKER_SETUP_COMPLETE.md      # 完成总结
├── .github/workflows/
│   └── docker-build.yml          # GitHub Actions CI/CD
└── k8s/
    └── deployment.yaml           # Kubernetes 配置
```

---

## 🐛 常见问题速查

| 问题 | 解决方案 |
|-----|--------|
| 容器无法启动 | `docker-compose logs app` 查看错误 |
| 数据库连接失败 | `docker-compose restart postgres` |
| 邮件无法发送 | 检查 `.env` 中 SMTP 配置和凭证 |
| 端口被占用 | 修改 `.env` 中的 `PORT` |
| 内存不足 | 增加云服务器内存或优化应用 |
| SSL 证书失效 | 重新生成证书，更新 nginx.conf |

---

## 💰 成本估计

| 云服商 | 配置 | 月成本 | 特点 |
|-------|------|-------|------|
| DigitalOcean | 2GB | $12 | 最便宜，易使用 |
| AWS | t3.small | $20-30 | 全球可用 |
| 阿里云 | 2核4GB | ¥400-500 | 国内最快 |
| 腾讯云 | 2核4GB | ¥300-400 | 国内友好 |

---

## 📞 文档链接

- **详细部署指南**：`DOCKER_DEPLOYMENT.md`
- **云服务商指南**：`docs/CLOUD_DEPLOYMENT.md`
- **Kubernetes 配置**：`k8s/deployment.yaml`
- **完成总结**：`DOCKER_SETUP_COMPLETE.md`

---

## ✅ 本地测试检查

- [ ] 已运行 `docker-compose up -d`
- [ ] 访问 http://localhost:3000 正常
- [ ] 数据库迁移成功
- [ ] 邮件功能正常
- [ ] 所有容器运行正常 (`docker-compose ps`)

---

## 🎯 推荐部署流程

```
1. 本地开发 (docker-compose)
   ↓
2. 测试环境 (单服务器部署)
   ↓
3. 生产环境 (使用 Nginx + SSL)
   ↓
4. 高可用 (Kubernetes 集群)
```

---

**保存此文档以备快速查询！**
