# 云服务商部署指南

本文档提供在不同云服务商上部署 CQUPT SRC 的具体步骤。

## 📑 目录

1. [阿里云 ECS](#阿里云-ecs)
2. [腾讯云 CVM](#腾讯云-cvm)
3. [华为云 ECS](#华为云-ecs)
4. [AWS EC2](#aws-ec2)
5. [DigitalOcean](#digitalocean)

---

## 阿里云 ECS

### 1. 创建实例

1. 登录 [阿里云控制台](https://console.aliyun.com)
2. 进入 **云服务器 ECS**
3. 创建实例：
   - **地域**：选择最近的地域（如华东2）
   - **实例规格**：`2核4GB` 或更高
   - **镜像**：Ubuntu 22.04
   - **存储**：50GB SSD
   - **网络**：分配公网 IP
   - **安全组**：允许 HTTP(80)、HTTPS(443)、SSH(22)

### 2. 连接实例

```bash
# 使用 SSH 连接
ssh -i /path/to/key.pem root@your-ecs-ip

# 或在阿里云控制台使用 VNC 连接
```

### 3. 安装 Docker

参考主部署指南的 [Docker 安装](#云服务器部署) 部分。

### 4. 配置安全组规则

```
阿里云控制台 → 安全组 → 入站规则
添加以下规则：
- 协议：TCP，端口：22（SSH）
- 协议：TCP，端口：80（HTTP）
- 协议：TCP，端口：443（HTTPS）
- 协议：TCP，端口：3000（应用）
```

### 5. 部署项目

```bash
# 创建应用目录
mkdir -p /opt/cqupt-src
cd /opt/cqupt-src

# 克隆项目
git clone https://your-repo-url.git .

# 配置环境
cp .env.example .env
nano .env  # 编辑配置

# 启动服务
docker-compose up -d

# 初始化数据库
docker-compose exec -T app npx prisma migrate deploy
```

### 6. 配置域名解析

1. 购买域名（阿里云或其他注册商）
2. 在阿里云 DNS 控制台添加 A 记录：
   - 主机记录：`@` 或 `www`
   - 记录类型：A
   - 记录值：ECS 实例公网 IP
3. 等待 DNS 解析生效（通常 15 分钟）

### 7. 获取 SSL 证书（免费）

阿里云免费 SSL 证书：

```bash
# 在阿里云控制台申请免费证书
# 1. 进入 SSL 证书服务
# 2. 点击"购买证书" → 选择免费 DV SSL 证书
# 3. 填写域名并验证
# 4. 颁发后下载证书

# 下载后的目录结构：
# - Nginx 文件夹（包含 .pem 和 .key 文件）

# 将证书上传到服务器并配置 Nginx
scp -i key.pem -r certs/ root@your-ecs-ip:/opt/cqupt-src/

# 更新 nginx.conf 中的 SSL 配置
nano /opt/cqupt-src/nginx.conf
# 取消注释 SSL 配置并更新证书路径
```

### 8. 成本估计

- **ECS 按量计费**：约 ¥200-400/月（2核4GB）
- **数据库**：不需要单独购买，使用容器内 PostgreSQL
- **带宽**：按流量计费，约 ¥100/月
- **域名**：¥50-100/年

---

## 腾讯云 CVM

### 1. 创建实例

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com)
2. 进入 **云服务器 CVM**
3. 创建实例：
   - **地域**：选择最近的地域
   - **可用区**：任选
   - **实例规格**：`2核4GB` 或更高
   - **镜像**：Ubuntu Server 22.04
   - **存储**：50GB 云硬盘
   - **网络**：分配公网 IP
   - **安全组**：创建新的，允许 22、80、443、3000 端口

### 2. 连接实例

```bash
# 使用 SSH
ssh -i /path/to/key ubuntu@your-cvm-ip

# 或在腾讯云控制台使用 VNC 连接
```

### 3. 初始化系统

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y git curl wget
```

### 4. 安装 Docker

```bash
# 使用腾讯云加速源（更快）
curl -fsSL https://mirrors.tencent.com/docker-ce/linux/ubuntu/gpg | sudo apt-key add -

echo "deb [arch=amd64] https://mirrors.tencent.com/docker-ce/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### 5. 部署项目

```bash
# 克隆项目
git clone https://your-repo-url.git /opt/cqupt-src
cd /opt/cqupt-src

# 配置环境
cp .env.example .env
nano .env

# 启动
docker-compose up -d
docker-compose exec -T app npx prisma migrate deploy
```

### 6. 配置域名和 SSL

```bash
# 腾讯云控制台 → 域名服务 → DNS 解析
# 添加 A 记录指向 CVM 公网 IP

# 获取免费 SSL 证书（腾讯云提供）
# 控制台 → SSL 证书 → 申请免费 DV 证书
# 验证域名所有权后获取证书
```

### 7. 成本估计

- **CVM 按量计费**：¥160-300/月（2核4GB）
- **公网带宽**：¥100-200/月
- **SSL 证书**：免费
- **域名**：¥50-100/年

---

## 华为云 ECS

### 1. 创建实例

1. 登录 [华为云控制台](https://console.huaweicloud.com)
2. 进入 **弹性云服务器 ECS**
3. 创建实例：
   - **地域**：华东（上海）或华南（深圳）
   - **可用区**：任选
   - **实例规格**：`2核4GB`
   - **镜像**：Ubuntu 22.04 LTS
   - **存储**：50GB 云硬盘
   - **安全组**：允许 22、80、443、3000 端口

### 2. 连接实例

```bash
# 使用 SSH
ssh -i /path/to/key ubuntu@your-ecs-ip

# 或使用华为云控制台的云手机/VNC
```

### 3. 安装 Docker

```bash
# 华为云提供的加速源
curl -fsSL https://repo.huaweicloud.com/docker-ce/linux/ubuntu/gpg | sudo apt-key add -

echo "deb [arch=amd64] https://repo.huaweicloud.com/docker-ce/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list

sudo apt update && sudo apt install -y docker-ce docker-ce-cli docker-compose-plugin
```

### 4. 部署项目

```bash
# 克隆和配置
git clone https://your-repo-url.git /opt/cqupt-src
cd /opt/cqupt-src
cp .env.example .env
nano .env

# 启动
docker-compose up -d
docker-compose exec -T app npx prisma migrate deploy
```

### 5. 使用华为云数据库（可选）

若不想使用容器 PostgreSQL，可使用华为云 RDS：

```bash
# 在华为云创建 RDS PostgreSQL 实例
# 在 .env 中更新 DATABASE_URL：
DATABASE_URL=postgresql://user:password@your-rds-endpoint:5432/cqupt_src

# 重启应用
docker-compose restart app
```

### 6. 成本估计

- **ECS 按量**：¥150-300/月
- **带宽**：¥100-200/月
- **RDS（可选）**：¥300-500/月
- **SSL 证书**：免费

---

## AWS EC2

### 1. 创建实例

1. 登录 [AWS 管理控制台](https://console.aws.amazon.com)
2. 进入 **EC2**
3. 启动实例：
   - **AMI**：Ubuntu Server 22.04 LTS
   - **实例类型**：`t3.medium` 或 `t3.small`
   - **存储**：50GB gp3
   - **安全组**：允许 22、80、443、3000

### 2. 连接实例

```bash
# 修改密钥权限
chmod 400 your-key.pem

# SSH 连接
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 3. 安装 Docker

参考主部署指南。

### 4. 配置 Elastic IP

```bash
# AWS 控制台 → 弹性 IP
# 分配新地址，并关联到 EC2 实例
# 这样即使实例重启，IP 也不会变
```

### 5. 部署项目

```bash
git clone https://your-repo-url.git /opt/cqupt-src
cd /opt/cqupt-src
cp .env.example .env
docker-compose up -d
docker-compose exec -T app npx prisma migrate deploy
```

### 6. 使用 RDS 数据库

```bash
# AWS 控制台 → RDS → 创建 PostgreSQL 数据库
# 安全组允许来自 EC2 的连接

# 更新 .env
DATABASE_URL=postgresql://admin:password@your-rds-endpoint:5432/cqupt_src

# 重启应用
docker-compose restart app
```

### 7. 成本估计

- **t3.medium**：$0.0416/小时 ≈ $30/月
- **t3.small**：$0.0208/小时 ≈ $15/月
- **存储**：$1/GB/月（50GB = $50）
- **RDS PostgreSQL**：$15-50/月
- **带宽**：$0.02/GB（出站）

---

## DigitalOcean

### 1. 创建 Droplet

1. 登录 [DigitalOcean](https://www.digitalocean.com)
2. 创建 Droplet：
   - **镜像**：Ubuntu 22.04 x64
   - **计划**：$6/月 (1GB) 或 $12/月 (2GB)
   - **地域**：最近的数据中心
   - **选项**：启用 IPv6，不需要 Kubernetes

### 2. 连接 Droplet

```bash
# 通过 SSH
ssh root@your-droplet-ip

# 或使用 DigitalOcean 控制台的 Console
```

### 3. 初始化

```bash
# 更新系统
apt update && apt upgrade -y

# 创建非 root 用户（推荐）
adduser cqupt
usermod -aG sudo cqupt
su - cqupt
```

### 4. 安装 Docker

```bash
# DigitalOcean 预装的市场镜像包含 Docker
# 若没有，参考主部署指南

docker --version
docker-compose --version
```

### 5. 部署应用

```bash
mkdir -p /opt/cqupt-src
cd /opt/cqupt-src

git clone https://your-repo-url.git .
cp .env.example .env
nano .env

docker-compose up -d
docker-compose exec -T app npx prisma migrate deploy
```

### 6. 配置域名

DigitalOcean 提供免费 DNS：

```bash
# 在 DigitalOcean 控制台
# 创建新域名 → 指向你的 Droplet

# 添加 A 记录：
# @ -> Droplet IP
# www -> Droplet IP
```

### 7. 启用 SSL

使用 Let's Encrypt（免费）：

```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 获取证书
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# 更新 nginx.conf 中的证书路径
nano nginx.conf

# 重启 Nginx
docker-compose restart nginx
```

### 8. 成本估计

- **Droplet ($6/月)**：基础配置，适合小型部署
- **Droplet ($12/月)**：2GB RAM，推荐
- **DNS**：免费
- **SSL**：免费
- **备份**：$0.20/GB/月（可选）

### 9. 使用 DigitalOcean 托管数据库

```bash
# DigitalOcean Managed Database for PostgreSQL
# 价格：$15/月起

# 创建数据库后，更新 .env：
DATABASE_URL=postgresql://user:password@db-endpoint:25060/cqupt_src?sslmode=require

docker-compose restart app
```

---

## 总成本比较

| 云服务商 | CPU/内存 | 月成本 | 特点 |
|---------|---------|-------|------|
| **阿里云** | 2核4GB | ¥400-500 | 国内速度快，支持备案 |
| **腾讯云** | 2核4GB | ¥300-400 | 国内友好，成本较低 |
| **华为云** | 2核4GB | ¥300-400 | 国内选择 |
| **AWS** | t3.small | $65-80 | 全球可用，成本可控 |
| **DigitalOcean** | 2GB | $12-20 | 最便宜，文档好 |

---

## 生产环境检查清单

在部署到云服务器后，检查以下项目：

- [ ] 防火墙规则配置正确
- [ ] SSL 证书已安装且有效
- [ ] 数据库备份已启用
- [ ] 日志聚合已配置
- [ ] 监控告警已设置
- [ ] 自动扩展规则已配置（如需要）
- [ ] 灾难恢复计划已制定
- [ ] 域名指向正确
- [ ] 应用可通过 HTTPS 访问
- [ ] 邮件功能正常工作

---

**最后更新**：2024 年 4 月
**维护者**：CQUPT SRC 团队
