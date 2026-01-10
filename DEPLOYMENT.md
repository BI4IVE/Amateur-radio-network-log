# 部署指南

本文档提供了济南黄河业余无线电台网主控日志系统的部署指南。

## 部署方式

本系统支持多种部署方式：

1. **Docker部署**（推荐）
2. **传统服务器部署**
3. **云平台部署**

## 1. Docker部署（推荐）

### 准备工作

- 安装 Docker
- 安装 Docker Compose

### 使用Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/radio_log
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=radio_log
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

### 构建并启动

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

## 2. 传统服务器部署

### 系统要求

- **操作系统**: Linux (Ubuntu 20.04+ 推荐)
- **Node.js**: 24.0 或更高版本
- **PostgreSQL**: 15.0 或更高版本
- **内存**: 至少 2GB RAM
- **存储**: 至少 10GB 可用空间
- **CPU**: 2核或更高

### 安装Node.js

```bash
# 使用 nvm 安装 Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24
```

### 安装PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# 启动PostgreSQL服务
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 创建数据库

```bash
# 切换到postgres用户
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE radio_log;
CREATE USER radio_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE radio_log TO radio_user;
\q
```

### 安装项目依赖

```bash
cd /path/to/project
pnpm install
```

### 配置环境变量

```bash
cp .env.example .env.local
nano .env.local
```

编辑 `.env.local` 文件：

```env
DATABASE_URL=postgresql://radio_user:your_password@localhost:5432/radio_log
```

### 构建项目

```bash
pnpm build
```

### 使用PM2管理进程（推荐）

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start npm --name "radio-log" -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs radio-log

# 设置开机自启
pm2 startup
pm2 save
```

### 使用Systemd管理进程

创建服务文件 `/etc/systemd/system/radio-log.service`：

```ini
[Unit]
Description=Radio Log System
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/project
ExecStart=/usr/bin/node /path/to/project/node_modules/.bin/next start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable radio-log
sudo systemctl start radio-log
```

## 3. 云平台部署

### Vercel部署

1. 将代码推送到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量 `DATABASE_URL`
4. 部署

### Railway部署

1. 在 Railway 中创建新项目
2. 添加 PostgreSQL 数据库
3. 导入代码仓库
4. 配置环境变量
5. 部署

## 环境变量配置

所有部署方式都需要配置以下环境变量：

```env
# 数据库连接URL
DATABASE_URL=postgresql://username:password@host:port/database_name

# 可选：应用端口（默认5000）
PORT=5000

# 可选：Node环境（development/production）
NODE_ENV=production
```

## Nginx反向代理配置

如果使用Nginx作为反向代理，创建配置文件 `/etc/nginx/sites-available/radio-log`：

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

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/radio-log /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL证书配置（HTTPS）

使用Certbot获取免费SSL证书：

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 数据库备份

### 自动备份脚本

创建备份脚本 `/usr/local/bin/backup-db.sh`：

```bash
#!/bin/bash

# 配置
DB_USER="radio_user"
DB_NAME="radio_log"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/radio_log_$DATE.dump"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE

# 压缩备份文件
gzip $BACKUP_FILE

# 删除7天前的备份
find $BACKUP_DIR -name "radio_log_*.dump.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

添加到crontab（每天凌晨2点执行）：

```bash
sudo crontab -e

# 添加以下行
0 2 * * * /usr/local/bin/backup-db.sh
```

## 监控和日志

### 日志位置

- 应用日志：`/var/log/radio-log/` 或 PM2日志目录
- Nginx日志：`/var/log/nginx/`
- PostgreSQL日志：`/var/log/postgresql/`

### 监控工具

推荐使用以下工具监控应用状态：

- **PM2 Monitor**: `pm2 monit`
- **htop**: 系统资源监控
- **netdata**: 实时性能监控

## 故障排查

### 常见问题

1. **数据库连接失败**
   - 检查数据库服务是否运行
   - 检查 `DATABASE_URL` 环境变量是否正确
   - 检查防火墙设置

2. **应用无法启动**
   - 检查Node.js版本
   - 检查依赖是否正确安装
   - 查看应用日志

3. **内存不足**
   - 增加服务器内存
   - 配置Node.js内存限制：`NODE_OPTIONS="--max-old-space-size=2048"`

## 性能优化

### 数据库优化

```sql
-- 创建索引
CREATE INDEX IF NOT EXISTS idx_log_records_session_id ON log_records(session_id);
CREATE INDEX IF NOT EXISTS idx_log_records_callsign ON log_records(callsign);
CREATE INDEX IF NOT EXISTS idx_log_records_created_at ON log_records(created_at);
CREATE INDEX IF NOT EXISTS idx_participants_callsign ON participants(callsign);
```

### Next.js优化

- 使用 `next build` 构建生产版本
- 配置CDN加速静态资源
- 启用HTTP/2

## 安全建议

1. **定期更新依赖**
   ```bash
   pnpm update
   ```

2. **配置防火墙**
   ```bash
   # 仅允许SSH、HTTP、HTTPS
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

3. **定期备份数据库**

4. **修改默认管理员密码**

5. **启用HTTPS**

## 更新部署

### 更新应用代码

```bash
# 拉取最新代码
git pull origin main

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 重启服务
pm2 restart radio-log
# 或
sudo systemctl restart radio-log
```

## 回滚

如果更新后出现问题，可以快速回滚：

```bash
# 查看之前的commit
git log --oneline

# 回滚到指定commit
git checkout <commit-hash>
pnpm install
pnpm build
pm2 restart radio-log
```

## 支持

如遇到部署问题，请：
1. 查看日志文件
2. 检查系统资源
3. 参考故障排查部分
4. 联系项目维护者

---

济南黄河业余无线电中继台 © 2024
