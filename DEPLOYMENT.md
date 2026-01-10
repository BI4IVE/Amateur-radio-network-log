# 部署指南

本文档提供济南黄河业余无线电台网主控日志系统的部署说明。

## 目录
- [环境准备](#环境准备)
- [本地开发](#本地开发)
- [生产环境部署](#生产环境部署)
- [Docker 部署](#docker-部署)
- [数据库配置](#数据库配置)
- [常见问题](#常见问题)

## 环境准备

### 必需软件
- Node.js 24 或更高版本
- PostgreSQL 12 或更高版本
- pnpm（包管理器）

### 安装 Node.js

```bash
# 使用 nvm 安装（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24

# 验证安装
node -v
npm -v
```

### 安装 pnpm

```bash
npm install -g pnpm
pnpm -v
```

### 安装 PostgreSQL

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS
```bash
brew install postgresql
brew services start postgresql
```

#### Windows
下载安装包：https://www.postgresql.org/download/windows/

## 本地开发

### 1. 克隆项目

```bash
git clone <repository-url>
cd projects
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

创建 `.env` 文件：

```env
# PostgreSQL 数据库连接
DATABASE_URL=postgresql://postgres:password@localhost:5432/amateur_radio_log

# AWS S3 配置（可选）
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your_bucket_name
```

### 4. 创建数据库

```bash
# 登录 PostgreSQL
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE amateur_radio_log;
CREATE USER radio_admin WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE amateur_radio_log TO radio_admin;
\q
```

### 5. 初始化数据库表

首次启动应用时会自动创建表结构。也可以手动运行：

```bash
# 进入数据库
psql -U radio_admin -d amateur_radio_log

# 查看创建的表
\dt
```

### 6. 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:5000` 查看应用。

默认管理员账号：
- 用户名：`ADMIN`
- 密码：`ADMIN123`
（不区分大小写）

### 7. 构建检查

```bash
# 类型检查
npx tsc --noEmit

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## 生产环境部署

### 方式一：使用进程管理器（PM2）

#### 1. 安装 PM2

```bash
npm install -g pm2
```

#### 2. 构建项目

```bash
pnpm build
```

#### 3. 创建 PM2 配置文件

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'amateur-radio-log',
    script: 'node',
    args: 'node_modules/.bin/next start',
    cwd: '/path/to/projects',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DATABASE_URL: 'postgresql://user:password@localhost:5432/amateur_radio_log'
    }
  }]
}
```

#### 4. 启动应用

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 5. PM2 常用命令

```bash
pm2 list              # 查看所有应用
pm2 logs amateur-radio-log  # 查看日志
pm2 restart amateur-radio-log  # 重启应用
pm2 stop amateur-radio-log     # 停止应用
pm2 delete amateur-radio-log    # 删除应用
```

### 方式二：使用 systemd（Linux）

#### 1. 创建服务文件

`/etc/systemd/system/amateur-radio-log.service`：

```ini
[Unit]
Description=Amateur Radio Log System
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/projects
Environment="NODE_ENV=production"
Environment="PORT=5000"
Environment="DATABASE_URL=postgresql://user:password@localhost:5432/amateur_radio_log"
ExecStart=/usr/bin/node /path/to/projects/node_modules/.bin/next start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### 2. 启动服务

```bash
sudo systemctl daemon-reload
sudo systemctl enable amateur-radio-log
sudo systemctl start amateur-radio-log
sudo systemctl status amateur-radio-log
```

### 反向代理配置（Nginx）

#### 1. 安装 Nginx

```bash
sudo apt install nginx
```

#### 2. 创建配置文件

`/etc/nginx/sites-available/amateur-radio-log`：

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
}
```

#### 3. 启用配置

```bash
sudo ln -s /etc/nginx/sites-available/amateur-radio-log /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### HTTPS 配置（Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
sudo systemctl enable certbot.timer
```

## Docker 部署

### 1. 创建 Dockerfile

```dockerfile
FROM node:24-alpine AS base

# 安装依赖阶段
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm install -g pnpm
RUN pnpm build

# 运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 5000

ENV PORT 5000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 2. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: radio_admin
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: amateur_radio_log
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://radio_admin:secure_password@postgres:5432/amateur_radio_log
      NODE_ENV: production
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
```

### 3. 构建和运行

```bash
docker-compose up -d --build
docker-compose logs -f app
```

## 数据库配置

### 数据库备份

```bash
# 备份数据库
pg_dump -U radio_admin -d amateur_radio_log > backup_$(date +%Y%m%d).sql

# 恢复数据库
psql -U radio_admin -d amateur_radio_log < backup_20240101.sql
```

### 定时备份（Cron）

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 2 点备份
0 2 * * * pg_dump -U radio_admin amateur_radio_log > /backups/backup_$(date +\%Y\%m\%d).sql
```

### 数据库性能优化

#### PostgreSQL 配置优化

`/etc/postgresql/15/main/postgresql.conf`：

```ini
# 内存配置
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB

# 连接配置
max_connections = 100

# 日志配置
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
```

重启 PostgreSQL：
```bash
sudo systemctl restart postgresql
```

## 常见问题

### 1. 端口被占用

```bash
# 查看端口占用
lsof -i :5000

# 修改端口
export PORT=3001
pnpm dev
```

### 2. 数据库连接失败

- 检查 PostgreSQL 是否运行：`sudo systemctl status postgresql`
- 检查 DATABASE_URL 配置是否正确
- 检查防火墙设置

### 3. 内存不足

```bash
# 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" pnpm build
```

### 4. 文件上传失败

- 检查 AWS S3 配置是否正确
- 确认 S3 bucket 权限设置

### 5. 应用无法访问

- 检查防火墙规则：`sudo ufw status`
- 确认 Nginx 配置正确
- 查看应用日志：`pm2 logs` 或 `docker-compose logs`

## 监控与维护

### 日志查看

```bash
# PM2
pm2 logs amateur-radio-log

# Docker
docker-compose logs -f app

# Systemd
journalctl -u amateur-radio-log -f
```

### 性能监控

推荐使用：
- PM2 Plus
- New Relic
- Datadog

### 更新应用

```bash
# 拉取最新代码
git pull origin main

# 安装依赖
pnpm install

# 重新构建
pnpm build

# 重启应用
pm2 restart amateur-radio-log
```

## 安全建议

1. **使用强密码**：修改默认管理员密码
2. **HTTPS**：配置 SSL 证书
3. **防火墙**：限制不必要的端口访问
4. **定期备份**：设置自动备份
5. **更新依赖**：定期运行 `pnpm update`
6. **监控日志**：及时发现异常访问

## 联系支持

如有部署问题，请联系技术支持团队。
