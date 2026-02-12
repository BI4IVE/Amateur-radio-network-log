# 部署指南

本文档详细介绍了济南黄河业余无线电台网主控日志系统的各种部署方法。

## 目录

- [前置要求](#前置要求)
- [本地开发部署](#本地开发部署)
- [Docker 部署](#docker-部署)
- [云平台部署](#云平台部署)
- [生产环境部署](#生产环境部署)
- [配置说明](#配置说明)
- [数据库迁移](#数据库迁移)
- [性能优化](#性能优化)
- [备份与恢复](#备份与恢复)
- [监控与日志](#监控与日志)

---

## 前置要求

### 硬件要求

| 配置 | 最小配置 | 推荐配置 |
|------|----------|----------|
| CPU | 1 核 | 2 核及以上 |
| 内存 | 1 GB | 2 GB 及以上 |
| 磁盘 | 10 GB | 20 GB 及以上 |
| 网络 | 1 Mbps | 10 Mbps 及以上 |

### 软件要求

| 软件 | 版本 | 说明 |
|------|------|------|
| Node.js | 24.x | 必须使用 Node.js 24 |
| pnpm | 最新版本 | 包管理器 |
| PostgreSQL | 14.x | 数据库 |
| Nginx | 1.18+ | 反向代理（生产环境推荐） |

---

## 本地开发部署

### 1. 克隆项目

```bash
git clone https://github.com/BI4IVE/Amateur-radio-network-log.git
cd Amateur-radio-network-log
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置数据库

#### 方式一：使用本地 PostgreSQL

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql@14

# 启动 PostgreSQL
sudo systemctl start postgresql  # Linux
brew services start postgresql@14  # macOS
```

创建数据库：
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE radio_network_log;
CREATE USER radio_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE radio_network_log TO radio_user;
\q
```

#### 方式二：使用 Docker（推荐）

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_DB=radio_network_log \
  -e POSTGRES_USER=radio_user \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:14-alpine
```

### 4. 配置环境变量

创建 `.env` 文件：

```env
# 数据库配置
DATABASE_URL=postgresql://radio_user:your_password@localhost:5432/radio_network_log

# 应用配置
PORT=5000
NODE_ENV=development

# 可选配置
NEXT_PUBLIC_APP_NAME=济南黄河业余无线电台网主控日志系统
```

### 5. 初始化数据库

```bash
# 创建表结构
pnpm drizzle-kit push:pg

# 初始化页面配置
curl -X POST http://localhost:5000/api/admin/migrate/page-configs
```

### 6. 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:5000`。

### 7. 创建管理员账户

```bash
curl -X POST http://localhost:5000/api/debug/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ADMIN",
    "password": "ADMIN123",
    "name": "管理员",
    "role": "admin"
  }'
```

### 8. 登录系统

- 用户名：`ADMIN`
- 密码：`ADMIN123`

---

## Docker 部署

### 1. 创建 Dockerfile

项目已包含 `Dockerfile`，内容如下：

```dockerfile
FROM node:24-alpine AS base

# 安装依赖
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# 构建应用
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# 生产镜像
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 5000

ENV PORT=5000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### 2. 创建 docker-compose.yml

项目已包含 `docker-compose.yml`，内容如下：

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: radio-log-app
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/radio_network_log
      - NODE_ENV=production
      - PORT=5000
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:5000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    image: postgres:14-alpine
    container_name: radio-log-db
    environment:
      - POSTGRES_DB=radio_network_log
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### 3. 构建并启动

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 4. 初始化数据库

```bash
# 进入应用容器
docker-compose exec app sh

# 执行迁移
curl -X POST http://localhost:5000/api/admin/migrate/page-configs

# 创建管理员
curl -X POST http://localhost:5000/api/debug/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ADMIN",
    "password": "ADMIN123",
    "name": "管理员",
    "role": "admin"
  }'
```

### 5. 常用命令

```bash
# 停止服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v

# 重启服务
docker-compose restart

# 查看容器状态
docker-compose ps

# 进入应用容器
docker-compose exec app sh

# 查看日志
docker-compose logs -f app

# 更新代码
git pull
docker-compose build
docker-compose up -d
```

---

## 云平台部署

### Vercel 部署

#### 1. 准备工作

1. 登录 [Vercel](https://vercel.com)
2. 点击 "New Project"
3. 导入 GitHub 仓库

#### 2. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

```
DATABASE_URL=postgresql://...
```

#### 3. 数据库配置

推荐使用 Vercel 提供的 PostgreSQL：

1. 在 Vercel 项目中添加 PostgreSQL
2. 复制连接字符串
3. 更新 `DATABASE_URL` 环境变量

#### 4. 部署

点击 "Deploy" 按钮，等待构建完成。

#### 5. 初始化数据库

部署完成后，访问 `https://your-domain.vercel.app/api/admin/migrate/page-configs` 初始化配置。

### 阿里云部署

#### 1. 购买服务器

推荐配置：
- CPU：2 核
- 内存：4 GB
- 磁盘：40 GB SSD
- 带宽：5 Mbps

#### 2. 安装环境

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 pnpm
npm install -g pnpm

# 安装 PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 安装 Nginx
sudo apt install -y nginx

# 安装 PM2
npm install -g pm2
```

#### 3. 配置 PostgreSQL

```bash
# 启动 PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库
sudo -u postgres psql
```

```sql
CREATE DATABASE radio_network_log;
CREATE USER radio_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE radio_network_log TO radio_user;
\q
```

#### 4. 部署应用

```bash
# 克隆代码
cd /opt
git clone https://github.com/BI4IVE/Amateur-radio-network-log.git
cd Amateur-radio-network-log

# 安装依赖
pnpm install

# 配置环境变量
cat > .env << EOF
DATABASE_URL=postgresql://radio_user:secure_password@localhost:5432/radio_network_log
PORT=5000
NODE_ENV=production
EOF

# 构建应用
pnpm run build

# 启动服务
pm2 start npm --name "radio-log" -- start
pm2 save
pm2 startup
```

#### 5. 配置 Nginx

```bash
sudo nano /etc/nginx/sites-available/radio-log
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 日志
    access_log /var/log/nginx/radio-log-access.log;
    error_log /var/log/nginx/radio-log-error.log;
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/radio-log /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

#### 6. 配置 SSL（推荐）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 生产环境部署

### 1. 服务器准备

#### 安全加固

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 配置防火墙
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 禁用 root 登录
sudo nano /etc/ssh/sshd_config
```

修改以下配置：
```
PermitRootLogin no
PasswordAuthentication no
```

```bash
# 重启 SSH
sudo systemctl restart sshd
```

### 2. 数据库优化

#### PostgreSQL 配置

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

推荐配置：
```
# 内存配置
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# 连接配置
max_connections = 100

# 日志配置
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'mod'
log_duration = on
```

```bash
# 重启 PostgreSQL
sudo systemctl restart postgresql
```

### 3. 应用优化

#### 环境变量配置

```env
# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/radio_network_log?pool_min=2&pool_max=10

# 应用配置
PORT=5000
NODE_ENV=production

# 性能配置
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG=false
```

#### PM2 配置

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'radio-log',
    script: 'node',
    args: 'server.js',
    cwd: '/opt/Amateur-radio-network-log',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    max_memory_restart: '1G',
    error_file: '/var/log/radio-log/error.log',
    out_file: '/var/log/radio-log/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
```

```bash
# 使用 PM2 启动
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Nginx 高级配置

```nginx
upstream radio_log_backend {
    least_conn;
    server 127.0.0.1:5000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;

    # 强制 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # 静态文件缓存
    location /_next/static {
        proxy_pass http://radio_log_backend;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable, max-age=31536000, stale-while-revalidate=86400";
    }

    location / {
        proxy_pass http://radio_log_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 日志
    access_log /var/log/nginx/radio-log-access.log;
    error_log /var/log/nginx/radio-log-error.log;
}
```

---

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | - | 是 |
| `PORT` | 应用端口 | 5000 | 否 |
| `NODE_ENV` | 运行环境 | development | 否 |

### 数据库连接池

在 `DATABASE_URL` 中配置连接池：

```
postgresql://user:password@host:port/dbname?pool_min=2&pool_max=10
```

---

## 数据库迁移

### 创建迁移

```bash
pnpm drizzle-kit generate:pg
```

### 执行迁移

```bash
pnpm drizzle-kit push:pg
```

### 回滚迁移

```bash
pnpm drizzle-kit drop
```

### 初始化页面配置

```bash
curl -X POST http://localhost:5000/api/admin/migrate/page-configs
```

---

## 性能优化

### 1. 启用压缩

Next.js 默认支持 gzip 压缩，确保在 `next.config.ts` 中启用：

```typescript
const nextConfig = {
  compress: true,
}
```

### 2. 图片优化

使用 Next.js Image 组件：

```tsx
import Image from 'next/image'

<Image src="/logo.png" alt="Logo" width={100} height={100} />
```

### 3. 代码分割

Next.js 默认支持代码分割，无需额外配置。

### 4. 缓存策略

```typescript
// API 路由缓存
export const revalidate = 3600 // 1 小时
```

---

## 备份与恢复

### 数据库备份

#### 手动备份

```bash
pg_dump -U radio_user radio_network_log > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 自动备份

创建备份脚本：

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/radio-log"
mkdir -p $BACKUP_DIR

pg_dump -U radio_user radio_network_log > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql

# 保留最近 7 天的备份
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

添加到 crontab：

```bash
crontab -e
```

```
0 2 * * * /path/to/backup.sh
```

### 数据库恢复

```bash
psql -U radio_user radio_network_log < backup_file.sql
```

---

## 监控与日志

### PM2 监控

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs radio-log

# 查看监控数据
pm2 monit
```

### Nginx 日志

```bash
# 访问日志
tail -f /var/log/nginx/radio-log-access.log

# 错误日志
tail -f /var/log/nginx/radio-log-error.log
```

### 应用日志

```bash
# PM2 日志
tail -f /var/log/radio-log/error.log
tail -f /var/log/radio-log/out.log
```

### 性能监控

推荐使用以下工具：
- PM2 Plus
- New Relic
- Datadog
- Prometheus + Grafana

---

## 故障排查

### 常见问题

#### 1. 应用无法启动

```bash
# 检查端口占用
lsof -i:5000

# 检查 PM2 状态
pm2 status

# 查看错误日志
pm2 logs radio-log --err
```

#### 2. 数据库连接失败

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 测试连接
psql -U radio_user -h localhost radio_network_log

# 检查防火墙
sudo ufw status
```

#### 3. 内存不足

```bash
# 查看内存使用
free -h

# 限制 PM2 内存使用
pm2 update ecosystem.config.js
```

### 紧急恢复

```bash
# 重启应用
pm2 restart radio-log

# 重启数据库
sudo systemctl restart postgresql

# 重启 Nginx
sudo systemctl restart nginx

# 重启服务器（最后手段）
sudo reboot
```

---

## 更新升级

### 拉取最新代码

```bash
cd /opt/Amateur-radio-network-log
git pull
```

### 安装依赖

```bash
pnpm install
```

### 构建应用

```bash
pnpm run build
```

### 重启服务

```bash
pm2 restart radio-log
```

### 数据库迁移

```bash
pnpm drizzle-kit push:pg
```

---

## 安全检查清单

- [ ] 修改默认管理员密码
- [ ] 启用 HTTPS
- [ ] 配置防火墙
- [ ] 禁用 root 登录
- [ ] 配置 SSH 密钥认证
- [ ] 定期更新系统和依赖
- [ ] 配置数据库备份
- [ ] 启用日志监控
- [ ] 配置 SSL 证书自动续期
- [ ] 限制数据库访问权限

---

## 联系支持

如需帮助，请通过以下方式联系：

- **邮箱**：contact@bi4ive.org
- **GitHub Issues**：https://github.com/BI4IVE/Amateur-radio-network-log/issues
