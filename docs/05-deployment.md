[← 快速开始](04-quick-start.md) · [更新方式 →](06-update.md)

# 部署指南

| 部署方式 | 适用场景 | 难度 | 说明 |
|----------|----------|------|------|
| 方式一 · Coze Coding 环境 | ⚠️ 已弃用（前期平台） | ⭐ | 早期 Coze 沙箱方式，项目已迁出，仅作历史参考 |
| 方式二 · 宝塔面板 | 国内服务器可视化管理 | ⭐⭐ | 图形化建站 + Nginx 反代，适合长期运维 |
| 方式三 · 传统 Linux | 纯命令行 VPS / 云主机 | ⭐⭐⭐ | 手动安装依赖与 Nginx，灵活可控 |
| 方式四 · Docker | 容器化 / 一键迁移 | ⭐⭐ | 镜像化部署，含 Postgres 服务 |

> 🔒 **安全提示（v1.5.1+）**：出于安全加固，危险接口 `/api/reset-admin` 已**永久删除**，请勿在文档或脚本中调用。自 **v1.5.11** 起，受管理员权限保护的调试接口 `/api/debug` 重新引入（仅管理员可访问，匿名返回 401/403）。同时 `/api/users`、`/api/participants`、`/api/admin/page-configs`、`/api/sessions`（POST）等接口均已加入管理员权限校验，匿名访问将返回 403/401。

## 方式一：Coze Coding 环境（⚠️ 已弃用）

> 💡 本项目数据库已从 `coze-coding-dev-sdk` 迁移为本地/宝塔直连 PostgreSQL（`src/storage/database/db.ts`）。以下为**前期平台的历史部署方式**，仅供追溯，**不再适用于当前版本**，请优先使用方式二/三/四。

本系统早期曾在 Coze Coding 沙箱环境中部署，这是当时的官方推荐开发和测试环境。

### 环境特点
- 预配置 Node.js 24 运行环境
- 集成 PostgreSQL 数据库
- 自动热更新（HMR）
- 内置端口管理（默认 5000）
- 支持一键构建和部署

### 部署步骤

1. **初始化项目**
```bash
coze init ${COZE_WORKSPACE_PATH} --template nextjs
```

2. **安装依赖**
```bash
cd ${COZE_WORKSPACE_PATH}
pnpm install
```

3. **配置环境变量**
在 `.coze` 文件中配置数据库连接和环境变量。

4. **启动开发服务**
```bash
coze dev
```

5. **构建生产版本**
```bash
coze build
```

6. **启动生产服务**
```bash
coze start
```

### 注意事项
- 服务默认运行在 5000 端口
- 日志文件位于 `/app/work/logs/bypass/`
- 禁止使用 9000 端口（系统服务占用）
- 使用 `coze --help` 查看更多命令

---

## 方式二：宝塔面板部署

宝塔面板是一款服务器管理软件，支持一键部署和管理 Web 应用。

### 前提条件
- 已安装宝塔面板的服务器
- 服务器系统：CentOS 7+、Ubuntu 18+、Debian 9+
- 至少 2GB 内存

### 部署步骤

##### 1. 安装宝塔面板
```bash
# CentOS 安装命令
yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh

# Ubuntu/Debian 安装命令
wget -O install.sh http://download.bt.cn/install/install-ubuntu-6.0.sh && sudo bash install.sh
```

##### 2. 登录宝塔面板
- 访问 `http://服务器IP:8888`
- 使用安装时提供的用户名和密码登录

##### 3. 安装软件套件
在宝塔面板中安装以下软件：
- **Nginx**：Web 服务器
- **Node.js**：选择 Node.js 24 版本
- **PostgreSQL**：选择 PostgreSQL 14 版本
- **PM2**：进程管理器

##### 4. 创建 PostgreSQL 数据库
1. 进入"数据库"菜单
2. 点击"添加数据库"
3. 填写数据库信息：
   - 数据库名：`radio_network_log`
   - 用户名：自定义
   - 密码：自定义（请记住密码）
   - 访问权限：本地服务器
4. 点击"提交"

##### 5. 上传项目文件
1. 进入"文件"菜单
2. 在 `/www/wwwroot/` 目录下创建项目文件夹 `radio-log`
3. 将项目文件上传到此目录
4. 解压项目文件（如果是压缩包）

##### 6. 安装项目依赖
1. 进入宝塔"终端"
2. 切换到项目目录：
   ```bash
   cd /www/wwwroot/radio-log
   ```
3. 安装 pnpm（如果未安装）：
   ```bash
   npm install -g pnpm
   ```
4. 安装项目依赖：
   ```bash
   pnpm install
   ```

##### 7. 配置环境变量
1. 在项目根目录创建 `.env` 文件
2. 编辑 `.env` 文件：
   ```env
   DATABASE_URL=postgresql://用户名:密码@localhost:5432/radio_network_log
   PORT=5000
   NODE_ENV=production
   JWT_SECRET=请替换为随机生成的强密钥
   ADMIN_INIT_PASSWORD=你的初始管理员密码
   ```
   *注意：将用户名和密码替换为实际的数据库用户名和密码。*
   *`PORT` 决定 `pnpm start` 监听端口（start 脚本未硬编码端口，必须在此设置）；`JWT_SECRET` 为 JWT 签名密钥，务必用随机强字符串（如 `openssl rand -base64 48`），缺失将使用不安全的硬编码默认值；`ADMIN_INIT_PASSWORD` 为管理员初始密码，首次访问首页时自动初始化管理员账户。*

##### 8. 初始化数据库
```bash
pnpm db:push
```

##### 9. 配置管理员初始密码
管理员账户在**首次访问首页时自动初始化**，密码取自 `.env` 的 `ADMIN_INIT_PASSWORD`（请确保其已设置且为强密码）。无需手动创建。

> ⚠️ v1.5.1 起匿名创建用户接口已返回 403，请勿再用 curl 调用 `/api/users` 创建管理员。

##### 10. 配置 PM2 守护进程
1. 进入宝塔"软件商店"
2. 找到 PM2，点击"设置"
3. 点击"添加项目"
4. 填写项目信息：
   - 项目名称：`radio-log`
   - 启动文件：`/www/wwwroot/radio-log/package.json`
   - 启动命令：`pnpm start`
   - 项目目录：`/www/wwwroot/radio-log`
5. 点击"提交"

##### 11. 配置 Nginx 反向代理
1. 进入"网站"菜单
2. 点击"添加站点"
3. 填写站点信息：
   - 域名：填写你的域名（如果没有，填写服务器IP）
   - 根目录：`/www/wwwroot/radio-log/.next`
   - PHP版本：纯静态
4. 点击"提交"
5. 点击站点的"设置"
6. 进入"配置文件"，替换为以下内容：
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;  # 替换为你的域名

       location / {
           proxy_pass http://127.0.0.1:5000;
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

##### 12. 配置 SSL（可选但推荐）
1. 在站点设置中进入"SSL"
2. 选择"Let's Encrypt"
3. 点击"申请"
4. 开启"强制HTTPS"

##### 13. 测试访问
- 访问你的域名：`http://your-domain.com` 或 `https://your-domain.com`
- 使用管理员账户 `ADMIN` 登录，密码为 `.env` 中 `ADMIN_INIT_PASSWORD` 的值（首次访问首页已自动初始化）

---

#### ⚠️ 宝塔部署真实避坑记录（来自 v1.5.7 / v1.5.8 实测部署）

以下为生产环境部署中真实遇到的问题与解决办法，照做可少走弯路。

**坑 1：必须用宝塔「Node 项目」托管才能申请 SSL，但会和 PM2 抢端口**
- 现象：用 PM2 手动 `next start -p 5000` 后，再在宝塔建 Node 项目也会监听 5000，报 `EADDRINUSE`。
- 解决：**二选一，不要并存**。要么纯 PM2（但拿不到宝塔 SSL 自动管理），要么纯宝塔 Node 项目托管（推荐，SSL/开机自启都在宝塔里）。
- 若已用 PM2 占住端口：先在宝塔把 Node 项目停掉/删掉，再 `pm2 delete` 释放端口，最后只用宝塔启动 Node 项目即可。
- 注意：宝塔 Node 项目底层**不是**全局 pm2，用 `pm2 list` 看不到它；它的进程是 `node .../next-server`（用户 `www`）。

**坑 2：`.env` 用 `cp` 覆盖时被交互确认打断，导致仍是模板**
- 现象：`cp .env.example .env` 提示是否覆盖，非交互终端下直接跳过，`.env` 内容还是模板，`db:push` 连不上库。
- 解决：用 `cat > .env <<'EOF' ... EOF` 强制写入，或 `cp -f`。

**坑 3：`pnpm db:push` 报 `permission denied for schema public (42501)`**
- 现象：数据库用户（如 `logtest`）对 `public` schema 无建表权限。
- 解决：用全路径 psql 授权（宝塔 PostgreSQL 的 psql 不在默认 PATH）：
  ```bash
  /www/server/pgsql/bin/psql "postgresql://logtest:密码@127.0.0.1:5432/logtest" \
    -c "GRANT ALL ON SCHEMA public TO logtest;"
  /www/server/pgsql/bin/psql "postgresql://logtest:密码@127.0.0.1:5432/logtest" \
    -c "ALTER DATABASE logtest OWNER TO logtest;"
  ```
  授权后再 `pnpm db:push`。

**坑 4：非交互远程 shell 里 `pnpm` / `node` 找不到（command not found）**
- 原因：plink/脚本执行的 shell PATH 为空，读不到 nvm/宝塔的 node。
- 解决：远程命令前加 `export PATH=/www/server/nodejs/v24.12.0/bin:$PATH`（按实际版本调整）。

**坑 5：原生模块 bcrypt / sharp 编译失败或运行时报错**
- 现象：构建/启动报 `bcrypt` 或 `sharp` 原生绑定错误。
- 解决：项目目录执行 `pnpm rebuild bcrypt sharp`，确保用部署环境的 Node 版本重新编译。

**坑 6：改了 package.json 的 `start` 脚本端口不生效**
- 现象：`next start` 不读 `.env` 的 `PORT`，默认监听 3000，与宝塔反代 5000 对不上。
- 解决：把 `package.json` 的 `start` 改为 `next start -p 5000`（显式指定端口），或用宝塔 Node 项目的「端口」配置项填写 5000。

**坑 7：后台版本号显示「v1.1.0 兜底默认值（数据库读取失败）」**
- 原因：全新库 `page_configs` 表是空的，版本接口读不到就回退兜底值。
- 解决：登录后台调一次初始化接口补齐配置，再触发版本检测即可同步为真实版本：
  ```bash
  TOKEN=$(curl -s -X POST http://127.0.0.1:5000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"ADMIN","password":"你的密码"}' | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')
  curl -s -X POST http://127.0.0.1:5000/api/admin/migrate/page-configs -H "Authorization: Bearer $TOKEN"
  curl -s http://127.0.0.1:5000/api/admin/upgrade/check -H "Authorization: Bearer $TOKEN"
  ```
  若想让「在线更新检测」真正可用，在 `.env` 设：
  `UPGRADE_MANIFEST_URL=https://raw.githubusercontent.com/BI4IVE/Amateur-radio-network-log/main/version/upgrade-manifest.json`
  （不设也能用，只是检测时看不到远程清单，显示「当前已是最新版本」）。

**坑 8：测试站与正式站共用端口/数据库的风险**
- 现象：同一服务器两站都 `PORT=5000`、连同一库，重启容易误操作另一站。
- 解决：测试站独立服务器 + 独立数据库 + 独立端口，彻底隔离（本项目测试站即采用此方案）。

---

## 方式三：传统 Linux 服务器部署

### 前提条件
- Linux 服务器（CentOS 7+、Ubuntu 18+、Debian 9+）
- 至少 2GB 内存
- root 权限或 sudo 权限

### 部署步骤

##### 1. 安装 Node.js 24
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS
curl -fsSL https://rpm.nodesource.com/setup_24.x | sudo bash -
sudo yum install -y nodejs
```

##### 2. 安装 pnpm
```bash
npm install -g pnpm
```

##### 3. 安装 PostgreSQL 14
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-14 postgresql-contrib-14

# CentOS
sudo yum install postgresql14-server postgresql14-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

##### 4. 创建数据库和用户
```bash
sudo -u postgres psql
```

在 PostgreSQL 命令行中执行：
```sql
-- 创建数据库
CREATE DATABASE radio_network_log;

-- 创建用户
CREATE USER radio_user WITH PASSWORD 'your_password';

-- 授权
GRANT ALL PRIVILEGES ON DATABASE radio_network_log TO radio_user;

-- 退出
\q
```

##### 5. 安装 PM2
```bash
npm install -g pm2
```

##### 6. 上传项目文件
```bash
# 创建项目目录
sudo mkdir -p /var/www/radio-log
sudo chown $USER:$USER /var/www/radio-log

# 上传项目文件（使用 scp、sftp 或 git）
cd /var/www/radio-log
# git clone 或上传项目文件
```

##### 7. 安装依赖
```bash
cd /var/www/radio-log
pnpm install
```

##### 8. 配置环境变量
```bash
nano .env
```

添加以下内容：
```env
DATABASE_URL=postgresql://radio_user:your_password@localhost:5432/radio_network_log
PORT=5000
NODE_ENV=production
JWT_SECRET=请替换为随机生成的强密钥
ADMIN_INIT_PASSWORD=你的初始管理员密码
```

##### 9. 初始化数据库
```bash
pnpm db:push
```

##### 10. 配置管理员初始密码
管理员账户在**首次访问首页时自动初始化**，密码取自 `.env` 的 `ADMIN_INIT_PASSWORD`（请确保其已设置且为强密码）。无需手动创建。

> ⚠️ v1.5.1 起匿名创建用户接口已返回 403，请勿再用 curl 调用 `/api/users` 创建管理员。

##### 11. 构建生产版本
```bash
pnpm build
```

##### 12. 使用 PM2 启动服务
```bash
pm2 start npm --name "radio-log" -- start
pm2 save
pm2 startup
```

##### 13. 配置 Nginx 反向代理
```bash
sudo apt-get install nginx  # Ubuntu/Debian
sudo yum install nginx      # CentOS
```

创建配置文件：
```bash
sudo nano /etc/nginx/sites-available/radio-log
```

添加以下内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
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
# Ubuntu/Debian
sudo ln -s /etc/nginx/sites-available/radio-log /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# CentOS
sudo nginx -t
sudo systemctl reload nginx
```

##### 14. 配置防火墙
```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 方式四：Docker 部署（可选）

### 创建 .dockerignore（重要）
在项目根目录创建 `.dockerignore`，避免把 `.env`、本地 `node_modules`、`.next` 等打进镜像（既防止密钥泄露，也避免构建异常）：
```dockerignore
node_modules
.next
dist
out
.env
.env.*
!.env.example
.git
.gitignore
.vscode
.idea
bak
*.md
测试部署说明.txt
AGENTS.md
.DS_Store
*.log
logs
```

### 创建 Dockerfile
```dockerfile
FROM node:24-slim

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖清单（注意：仓库 .gitignore 默认忽略 pnpm-lock.yaml，
# 因此此处只用 package.json，并采用普通 install 而非 --frozen-lockfile）
COPY package.json ./

# 安装依赖
RUN pnpm install

# 复制项目文件
COPY . .

# 构建应用
RUN pnpm build

# 暴露端口
EXPOSE 5000

# 启动前先执行数据库迁移，再启动服务
CMD ["sh", "-c", "pnpm db:push && pnpm start"]
```

> 💡 若你本地已生成 `pnpm-lock.yaml` 并随项目一同打包进镜像，可把
> `COPY package.json ./` 改为 `COPY package.json pnpm-lock.yaml ./`，
> 并将 `pnpm install` 改为 `pnpm install --frozen-lockfile` 以锁定版本。

### 创建 docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/radio_network_log
      - NODE_ENV=production
      - JWT_SECRET=请替换为随机生成的强密钥
      - ADMIN_INIT_PASSWORD=你的初始管理员密码
    # 等待 db 健康后再启动；CMD 中已包含 pnpm db:push 建表
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=radio_network_log
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    # 健康检查：pg_isready 返回 0 才视为就绪
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d radio_network_log"]
      interval: 5s
      timeout: 5s
      retries: 10
    restart: unless-stopped

volumes:
  postgres_data:
```

### 启动服务
```bash
docker-compose up -d
```
> 启动后 `app` 容器会先自动执行 `pnpm db:push` 创建表结构（依赖 `db` 健康检查通过后才进行），随后启动服务。访问 `http://localhost:5000`，首次打开首页会自动初始化 `ADMIN` 管理员账户（密码为 `ADMIN_INIT_PASSWORD`）。可用 `docker-compose logs -f app` 查看启动与建表日志。

---

[← 返回文档首页](../README.md)
