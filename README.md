# 济南黄河业余无线电台网主控日志系统

<div align="center">

![Version](https://img.shields.io/badge/version-1.5.11-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-24.x-brightgreen)
![React](https://img.shields.io/badge/react-19.x-61DAFB)
![Next](https://img.shields.io/badge/next-16.x-black)

<sub>前期由 扣子 AI（Coze Coding）编程完成，1.5.0 版本后由 CodeBuddy CN 接手开发</sub>

</div>

> 📋 **目录**
> [项目简介](#项目简介) · [功能特性](#功能特性) · [技术栈](#技术栈) · [快速开始](#快速开始) · [部署指南](#部署指南) · [更新方式](#更新方式) · [使用文档](#使用文档) · [常见问题](#常见问题) · [更新日志](#更新日志) · [贡献指南](#贡献指南) · [致谢](#致谢)

---

## 项目简介

济南黄河业余无线电台网主控日志系统是一个专为业余无线电爱好者设计的现代化日志管理系统。系统支持多主控实时协作、会话管理、参与人员库、Excel 导出、呼号查询等功能，采用前后端分离架构，界面美观、操作便捷。

本系统已成功应用于济南黄河业余无线电台网的实际运营中，为台网日志记录提供了高效、可靠的解决方案。

1.5.0 版本起由 **CodeBuddy CN** 持续开发维护。

### 核心优势

- 🎯 **专业设计**：专为业余无线电场景设计，贴合实际使用需求
- 🚀 **高性能**：采用 Next.js 16 + React 19，提供极速响应体验
- 🔒 **安全可靠**：完善的权限控制和数据加密机制
- 🌐 **实时协作**：基于 SSE 的多主控实时同步功能
- 📱 **响应式设计**：完美适配 PC、平板、手机等设备

---

## 功能特性

| 模块 | 核心能力 |
|------|----------|
| 🔐 **用户认证与权限** | 管理员 / 主控双角色；不区分大小写登录；权限分级与多主控协作 |
| 📝 **台网会话管理** | 创建会话、记录主控信息（呼号/设备/天线/QTH）；6 小时自动过期；活跃会话列表 |
| 📊 **台网记录录入** | 呼号/设备自动联想、历史联想；Ctrl+Enter 快捷录入；必填校验；SSE 实时协作 |
| 🗂️ **参与人员库** | 呼号/姓名/设备等信息管理；呼号搜索自动填充；录入即同步更新 |
| 🔧 **设备库**（v1.5.0） | 独立设备库；增删改查；Excel/CSV 批量导入导出；历史一键导入；录入自动同步 |
| 📜 **台网历史管理**（v1.5.0） | 管理员免过期编辑任意记录；指定日期新增；Excel 导入导出；会话管理 |
| 📥 **Excel 导出** | xlsx-js-style 带样式导出（标题加粗居中、表头蓝底白字、自动列宽行高） |
| 🔍 **呼号查询** | 按呼号查看全部历史记录、详细信息与参与次数统计 |
| 📈 **台网统计** | 历史会话浏览、会话详情、CSV 导出、多维度报表 |
| ⚙️ **页面配置** | 后台动态修改标题/版本号/联系方式等；实时生效；按通用/登录/首页/详情分类 |
| 🛠️ **管理工具** | 用户管理、弹窗编辑、批量操作、CSV 导出、多条件搜索筛选 |
| 🌐 **多语言与时区** | 全中文界面；统一北京时间（UTC+8）；呼号自动转大写 |
| 🎨 **界面优化** | shadcn/ui 现代化设计；响应式布局；顶部导航 + 可收缩侧边栏 |

---

## 技术栈

| 分类 | 技术 |
|------|------|
| 🎨 前端 | Next.js 16（App Router）· React 19 · Tailwind CSS 4 · shadcn/ui · TypeScript 5 |
| ⚙️ 后端 | Node.js 24 · Drizzle ORM · PostgreSQL 14+ · Server-Sent Events (SSE) |
| 🔧 工具 | pnpm · RESTful API + SSE · TypeScript strict mode |
| 🤖 AI 协作 | 前期 Coze Coding，1.5.0 版本后由 CodeBuddy CN 接手开发 |

---

## 快速开始

### 环境要求

- **Node.js**：24.x 或更高版本
- **pnpm**：9.x 或更高版本
- **PostgreSQL**：14.x 或更高版本
- **内存**：至少 2GB
- **磁盘空间**：至少 1GB

### 本地开发

#### 1. 克隆项目
```bash
git clone https://github.com/BI4IVE/Amateur-radio-network-log.git
cd Amateur-radio-network-log
```

#### 2. 安装依赖
```bash
pnpm install
```

#### 3. 配置数据库
创建 PostgreSQL 数据库：
```sql
CREATE DATABASE radio_network_log;
```

#### 4. 配置环境变量
创建 `.env` 文件：
```env
# 数据库配置
DATABASE_URL=postgresql://username:password@localhost:5432/radio_network_log

# 应用配置
PORT=5000
NODE_ENV=development

# JWT 签名密钥（必填！请用随机强字符串，例如：openssl rand -base64 48）
JWT_SECRET=请替换为随机生成的强密钥

# 初始化管理员密码（可选；首次访问首页自动创建 ADMIN 时使用的密码）
ADMIN_INIT_PASSWORD=你的初始密码
```

#### 5. 初始化数据库
执行数据库迁移：
```bash
# 创建表结构
pnpm db:push
```

#### 6. 配置管理员初始密码
管理员账户在**首次访问首页时自动初始化**（见 `src/app/page.tsx` 的 `initializeAdmin()`），无需手动创建。密码取自环境变量 `ADMIN_INIT_PASSWORD`：
```env
# .env 中设置（务必修改为强密码）
ADMIN_INIT_PASSWORD=你的初始密码
```
> ⚠️ 安全说明：v1.5.1 起 `/api/users` 的创建接口已要求管理员权限，**匿名调用会被 403 拒绝**，请勿再用 curl 匿名创建管理员。初始化接口 `/api/init` 同样依赖 `ADMIN_INIT_PASSWORD`，未设置则拒绝初始化。

#### 7. 启动开发服务器
```bash
pnpm dev
```

访问 `http://localhost:5000` 查看应用。

---

## 部署指南

| 部署方式 | 适用场景 | 难度 | 说明 |
|----------|----------|------|------|
| 方式一 · Coze Coding 环境 | ⚠️ 已弃用（前期平台） | ⭐ | 早期 Coze 沙箱方式，项目已迁出，仅作历史参考 |
| 方式二 · 宝塔面板 | 国内服务器可视化管理 | ⭐⭐ | 图形化建站 + Nginx 反代，适合长期运维 |
| 方式三 · 传统 Linux | 纯命令行 VPS / 云主机 | ⭐⭐⭐ | 手动安装依赖与 Nginx，灵活可控 |
| 方式四 · Docker | 容器化 / 一键迁移 | ⭐⭐ | 镜像化部署，含 Postgres 服务 |

> 🔒 **安全提示（v1.5.1+）**：出于安全加固，危险接口 `/api/reset-admin` 已**永久删除**，请勿在文档或脚本中调用。自 **v1.5.11** 起，受管理员权限保护的调试接口 `/api/debug` 重新引入（仅管理员可访问，匿名返回 401/403）。同时 `/api/users`、`/api/participants`、`/api/admin/page-configs`、`/api/sessions`（POST）等接口均已加入管理员权限校验，匿名访问将返回 403/401。

### 方式一：Coze Coding 环境（⚠️ 已弃用）

> 💡 本项目数据库已从 `coze-coding-dev-sdk` 迁移为本地/宝塔直连 PostgreSQL（`src/storage/database/db.ts`）。以下为**前期平台的历史部署方式**，仅供追溯，**不再适用于当前版本**，请优先使用方式二/三/四。

本系统早期曾在 Coze Coding 沙箱环境中部署，这是当时的官方推荐开发和测试环境。

#### 环境特点
- 预配置 Node.js 24 运行环境
- 集成 PostgreSQL 数据库
- 自动热更新（HMR）
- 内置端口管理（默认 5000）
- 支持一键构建和部署

#### 部署步骤

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

#### 注意事项
- 服务默认运行在 5000 端口
- 日志文件位于 `/app/work/logs/bypass/`
- 禁止使用 9000 端口（系统服务占用）
- 使用 `coze --help` 查看更多命令

---

### 方式二：宝塔面板部署

宝塔面板是一款服务器管理软件，支持一键部署和管理 Web 应用。

#### 前提条件
- 已安装宝塔面板的服务器
- 服务器系统：CentOS 7+、Ubuntu 18+、Debian 9+
- 至少 2GB 内存

#### 部署步骤

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

### 方式三：传统 Linux 服务器部署

#### 前提条件
- Linux 服务器（CentOS 7+、Ubuntu 18+、Debian 9+）
- 至少 2GB 内存
- root 权限或 sudo 权限

#### 部署步骤

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

### 方式四：Docker 部署（可选）

#### 创建 .dockerignore（重要）
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

#### 创建 Dockerfile
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

#### 创建 docker-compose.yml
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

#### 启动服务
```bash
docker-compose up -d
```
> 启动后 `app` 容器会先自动执行 `pnpm db:push` 创建表结构（依赖 `db` 健康检查通过后才进行），随后启动服务。访问 `http://localhost:5000`，首次打开首页会自动初始化 `ADMIN` 管理员账户（密码为 `ADMIN_INIT_PASSWORD`）。可用 `docker-compose logs -f app` 查看启动与建表日志。

---

## 更新方式

本项目部署只拉取 `main` 分支，升级即「拉最新代码 → 重新构建 → 同步版本号」。按是否涉及数据库表结构变更，分两种方式。

### 一、不涉及数据库表结构变更（纯代码更新）

适用于绝大多数版本（如 v1.5.6、v1.5.7）：仅修复逻辑、界面或新增后台功能，**未新增/修改任何数据库表或字段**。

**步骤**：

1. **拉取最新代码**（部署服务器，项目目录内）
   ```bash
   git pull origin main
   ```
2. **安装/更新依赖**（依赖有变化时必做）
   ```bash
   pnpm install
   ```
3. **重新构建**
   ```bash
   pnpm build
   ```
4. **重启服务**
   - PM2：`pm2 restart radio-log`（或 `pm2 reload radio-log` 平滑重启）
   - Docker：`docker-compose up -d --build`
5. **同步版本号（关键）**
   登录后台 → 左侧菜单「版本更新」→ 点击「立即检测」。
   - 若程序代码已更新到与远程清单一致（`CODE_VERSION >= latest`），检测接口会**自动将数据库 `page_configs.version` 回写为最新版**，无需手动 SQL。
   - 若仍提示有新版本，说明 `src/lib/version.ts` 的 `CODE_VERSION` 与 `version/upgrade-manifest.json` 的 `latest` 不一致，需核对三处版本源（见下）。

> ⚠️ 纯代码更新**不要执行** `pnpm db:push`（虽执行也无害，但无表变更时没必要）。

### 二、涉及数据库表结构变更（含表/字段迁移）

当新版本**新增了表、新增/修改了字段、或改了约束**时必须走此流程（例如未来某版本给 `log_records` 加字段，或新建某配置表）。

**步骤**：

1. **先备份数据库（强烈建议）**
   ```bash
   # PostgreSQL 逻辑备份
   pg_dump -U <用户> -h localhost -d radio_network_log -F c -f radio_log_$(date +%Y%m%d).dump
   # 或纯 SQL 备份
   pg_dump -U <用户> -h localhost -d radio_network_log > radio_log_$(date +%Y%m%d).sql
   ```
2. **拉代码 + 安装依赖 + 构建**（同方式一 1~3 步）
   ```bash
   git pull origin main
   pnpm install
   pnpm build
   ```
3. **执行表结构迁移**（Drizzle 自动按 schema 推断增量变更）
   ```bash
   pnpm db:push
   ```
   - `db:push` 会对比 `src/storage/database/shared/schema.ts` 与线上表结构，自动 `ALTER TABLE` / 建表，**不会删数据**（Drizzle push 默认安全，不会丢弃列，除非手动改列类型导致不兼容）。
   - 迁移前务必完成第 1 步备份。
4. **重启服务**（同方式一第 4 步）
5. **同步版本号**（同方式一第 5 步，后台「版本更新」检测）

> ⚠️ **如何判断是否需要表迁移**：查看新版本的更新日志 / `src/storage/database/shared/schema.ts` 与上一版的 diff。若 `schema.ts` 有新增表或字段定义，则必须执行 `pnpm db:push`；若无变化，走方式一即可。本项目每次发版都会在「更新日志」中标注「是否涉及表结构变更」。

### 三、发版三处版本源必须一致

每次发版（无论是否涉及表变更），以下三处版本号必须同步为同一值，否则后台会一直误报有新版本：

| # | 位置 | 字段/变量 | 说明 |
|---|------|-----------|------|
| 1 | `version/upgrade-manifest.json` | `latest` | 远程最新版（检测基准），提交到 GitHub `main` |
| 2 | `src/lib/version.ts` | `CODE_VERSION` | 当前部署代码版本 |
| 3 | 数据库 `page_configs` (key=`version`) | `value` | 线上实际运行版本，**部署后由后台检测自动同步**，一般不手动改 |

> 部署完成后，务必登录后台「版本更新」点一次检测，确认 `hasUpdate=false`、当前版本与 `latest` 一致。

### 四、回滚

若新版异常需回退：
```bash
git log --oneline -5        # 找到上一个稳定提交哈希
git checkout <旧提交哈希>   # 或 git revert
pnpm install && pnpm build && pm2 restart radio-log
```
- 若涉及表结构变更且已 `db:push`，回滚代码后表结构**不会自动回退**，需用第 1 步的备份 `pg_restore` 恢复（或手动反向迁移）。故表变更前备份尤其重要。

---

## 使用文档

### 用户角色说明

#### 管理员（Admin）
- **用户管理**：创建、编辑、删除用户
- **台网统计**：查看所有历史台网数据
- **管理工具**：管理系统配置
- **页面配置**：动态修改网站内容

#### 主控（User）
- **创建会话**：发起台网会话
- **录入记录**：添加台网日志记录
- **实时协作**：与其他主控同时编辑
- **查看历史**：查看自己的历史会话

### 操作指南

#### 1. 登录系统
1. 访问系统地址
2. 输入用户名和密码
3. 点击"登录"按钮

#### 2. 创建台网会话
1. 点击"创建新会话"
2. 选择主控人员（可从现有用户中选择）
3. 填写主控信息（设备、天线、QTH）
4. 设置会话时间（北京时间）
5. 点击"创建会话"

#### 3. 录入台网记录
1. 进入会话详情页
2. 在呼号输入框中输入呼号（支持自动联想）
3. 系统自动填充历史数据
4. 确认或修改信息
5. 点击"添加记录"或按 Ctrl+Enter

#### 4. 导出 Excel
1. 进入会话详情页
2. 点击"导出Excel"按钮
3. 系统自动生成并下载 Excel 文件

#### 5. 查询呼号
1. 点击顶部"呼号查询"
2. 输入呼号
3. 点击"查询"按钮
4. 查看该呼号的所有历史记录

---

## 常见问题

### 1. 数据库连接失败
**问题**：提示"数据库连接失败"

**解决方案**：
- 检查 PostgreSQL 服务是否启动
- 检查数据库用户名、密码是否正确
- 检查 `.env` 文件中的 `DATABASE_URL` 配置
- 确保数据库已创建

### 2. 端口被占用
**问题**：提示"端口 5000 已被占用"

**解决方案**：
```bash
# 查找占用端口的进程
lsof -i:5000

# 结束进程
kill -9 <PID>
```

### 3. 实时同步不工作
**问题**：多个主控编辑时不同步

**解决方案**：
- 检查浏览器是否支持 SSE（Server-Sent Events）
- 检查网络连接是否稳定
- 检查防火墙是否阻止了 SSE 连接

### 4. Excel 导出失败
**问题**：点击导出后无反应

**解决方案**：
- 检查是否有数据可导出
- 检查浏览器是否阻止了下载
- 尝试使用 Chrome 或 Firefox 浏览器

### 5. 会话无法编辑
**问题**：会话创建后无法添加记录

**解决方案**：
- 检查会话是否已超过 6 小时（自动过期）
- 检查当前用户是否有主控权限

---

## 更新日志

### v1.5.11 (2026-08-18)

**🛠 角色修复 + 配置对标 + 实况大屏**

- 🛠 修复后台「原有主控人员调整为管理员」功能无效：根因为 `updateUserSchema.pick` 遗漏 `role` 字段，zod 校验将角色字段剥离导致写入不生效。已在 `src/storage/database/shared/schema.ts` 补回 `role`，管理员角色写入恢复正常。
- 📋 后台页面配置（`page_configs`）全面对标正式站：测试站补齐**证书设置、首页设置、登录页设置、会话详情页配置**四类共 11 条配置，与正式站一致（原本测试站仅有「通用配置」2 条）。
- 🌐 版本更新检测改为**联机拉取 GitHub 官方清单**（启用 `UPGRADE_MANIFEST_URL` 指向 `raw.githubusercontent.com/.../main/version/upgrade-manifest.json`），检测信息与正式站完全一致；移除测试站专属的旧版 `public/version/upgrade-manifest.json`。
- ✨ 新增**实况大屏 `/live` 页面**：SSE 实时滚动在网呼号与最新记录。
- 🔧 新增调试接口 `/api/debug` 与会话详情接口 `/api/sessions/[sessionId]`。
- 🎨 优化登出逻辑与前台/后台布局。
- 📌 版本号同步项：`version/upgrade-manifest.json` 的 `latest` → `1.5.11`、`src/lib/version.ts` 的 `CODE_VERSION` → `1.5.11`、`package.json` 的 `version` → `1.5.11`（之前该字段停留在 `1.5.8`，本次一并修正）。

> ⚠️ 注意：v1.5.11 **未改动数据库表结构**（配置数据由后台初始化接口补齐，无新增/修改字段），升级只需拉代码 + 重新构建部署即可，无需执行额外表迁移；部署后数据库 `page_configs.version` 由后台「版本更新」检测自动同步为 `1.5.11`。

### v1.5.10 (2026-08-15)

**🐛 彻底修复提交重复数据**

- 🐛 修复「台网记录提交时同时出现两组相同数据、重新进入后消失」的问题：在客户端所有记录插入/合并点引入 `dedupeRecords` 按 `id` 唯一性兜底，覆盖提交响应与 SSE 实时回声的任意到达时序。
- 🔧 原 v1.5.7 的去重逻辑（依赖两处各自判断 `prev` 快照）存在竞态缝隙，本次升级为统一的物理唯一键去重，确保 UI 层永不渲染重复条目。
- 🗄 数据库层记录写入本身始终为单条，重复仅存在于前端展示，重新进入台网（全量重拉）即消失的现象与此一致。

> ⚠️ 注意：v1.5.10 **未改动数据库表结构**（与 v1.5.9 一致），升级只需拉代码 + 重新构建部署即可，无需执行额外表迁移。

### v1.5.9 (2026-08-14)

**📜 证书配置后台化 + 防缓存修复 + 呼号查询免登录**

- ✨ **证书签发单位 / 签发机构后台可配置**：新增 `cert_sign_unit`（证书标题处单位）与 `cert_sign_org`（证书底部签发机构）两个页面配置项，可在后台「页面配置管理」中修改，实时生效。
- 🛠 **修复证书名称不生效（根因：客户端 JS 缓存）**：原实现依赖前端 `fetch('/api/page-configs')` 取配置，浏览器若缓存旧版 JS chunk 则永远显示写死保底值。现改为在 `query/layout.tsx`（服务端组件，`force-dynamic`）**直读数据库**并经 Client Provider（`certConfig.tsx`）注入 RSC payload，配置随每次请求服务端实时下发，**不再依赖任何客户端 fetch / 浏览器 JS 缓存**。
- 🔓 **呼号查询页免登录公开访问**：`/query` 路由未加入 middleware 受保护路径，前台呼号查询与生成证书无需登录即可使用；同时前台页面（非 `/api`）响应头统一加 `no-store` 防止后台配置改动后仍显示旧版。
- 🔽 **呼号参与查询降序排列**：用户查询返回的参与记录按日期降序排列（最新在前）。
- 📄 版本更新页「当前已是最新版本」下方新增「当前版本更新日志」展示。

> ⚠️ 注意：v1.5.9 **未改动数据库表结构**（证书配置复用既有 `page_configs` 表，新增 key 由后台初始化接口补齐），升级只需拉代码 + 重新构建部署即可，无需执行额外表迁移。

### v1.5.8 (2026-08-13)

**🔒 台网日期唯一约束（新增业务规则）**

- 🔒 新增**台网日期唯一约束**：以**北京时间日期**为唯一键，**同一天仅允许一场台网**。当天已存在台网时，再次创建（无论是后台「台网历史管理」指定日期新建，还是前台「台网记录信息录入」实时建台网）将被拒绝，返回 `409` 并提示「该日期台网已存在，请到台网历史管理中修改已有的台网记录」，同时返回 `existingSessionId` 便于前端跳转修改。
- 🔒 历史台网导入的数据与实时记录统一存入 `log_records` 表，按 `(session_id + 呼号)` 区分；导入台网记录前须先有当天台网会话，已存在则只能修改，避免重复录入。
- 🛠 新增 `LogManager.findSessionByBeijingDate(date)`：按 `DATE(session_time AT TIME ZONE 'Asia/Shanghai')` 查重，全站统一以北京时间判定「同一天」。
- ✅ 验证：同日期第二次创建返回拦截提示，跨日期创建正常放行。

> ⚠️ 注意：v1.5.8 **未改动数据库表结构**（仅新增服务端查重逻辑，无新增/修改字段），升级只需拉代码 + 重新构建部署即可，无需执行额外表迁移。后续若需支持「一天多场台网」，再扩展判定键（如日期+主控/时段）。

### v1.5.7 (2026-08-13)

**🐛 BUG 修复（紧急）**

- 🐛 修复 **录入台网记录时列表瞬间出现连续两条相同记录**：根因为前端本地乐观更新插入一次 + SSE 回声又插入一次（id 相同）。现前端在两处插入逻辑均按 `id` 去重，确保列表只出现一条。
- 🐛 修复 **呼号查询结果（按录入时间归类）与后台历史台网（按台网时间归类）不符**：呼号查询原按 `record.createdAt` 归类与过滤，导致旧台网记录在被导入当天被算入当日。现呼号查询改为按 `session_time`（台网时间）归类与过滤，与后台历史口径一致。

**📌 本次版本同步项**

- `version/upgrade-manifest.json` 的 `latest` 改为 `1.5.7`
- `src/lib/version.ts` 的 `CODE_VERSION` 改为 `1.5.7`
- `package.json` 的 `version` 改为 `1.5.7`
- 数据库 `page_configs.version` 部署后由后台「版本更新」检测自动同步为 `1.5.7`（无需手动 SQL）

> ⚠️ 注意：v1.5.7 **未改动数据库表结构**（无新增/修改字段），升级只需拉代码 + 重新构建部署即可，无需执行额外表迁移。

### v1.5.6 (2026-08-13)

**🔔 后台版本检测**

- ✨ 新增**后台「版本更新」菜单**：管理员可在后台一键检测是否有新版本
- 🔒 **版本号改为数据库存储且后台只读**：页面配置中 `version` 项仅展示、不可手动修改，避免误改；数据库连接异常时回退显示 `1.1.0`
- 🌐 **远程版本清单比对**：检测接口读取远程 `version/upgrade-manifest.json`（可经 `UPGRADE_MANIFEST_URL` 指向 GitHub raw 地址），与数据库当前版本比对，展示更新日志与仓库地址
- 🔄 **代码更新后自动同步版本号**：当管理员已把程序代码更新到与远程清单一致（`CODE_VERSION >= latest`），但数据库 `version` 仍落后时，检测接口会自动将数据库 `version` 回写为最新版，避免一直提示有新版本
- 📝 仓库新增 `version/` 目录专门存放版本清单；发版时需同步：① `version/upgrade-manifest.json` 的 `latest`/`changelog` ② `src/lib/version.ts` 的 `CODE_VERSION` ③ 部署后数据库 `page_configs.version` 会自动同步

### v1.5.5 (2026-08-10)

**🔐 认证与登录修复**

- 🐛 修复 **登录成功后立即退出**：http 站点下 cookie 被强制标记 `Secure`，浏览器拒绝存储导致鉴权失败。改为仅当 `FORCE_SECURE_COOKIE=true`（HTTPS）时才启用 `Secure` 标志。
- 🐛 修复 **登录页与后台页面无限循环跳转**：中间件仅校验 `Authorization: Bearer` 头，而前端使用 cookie 鉴权，所有受保护接口返回 401 后前端被踢回登录页。现中间件同时支持从 `Bearer` 头和 `token` cookie 读取身份；未登录页面请求重定向至 `/login`，API 请求返回 401 JSON。
- 🐛 修复 **登录态不同步**：登录成功后补充写入 `localStorage.user`，保证前端身份状态与 cookie 一致。

**📊 统计页面修复**

- 🐛 修复 **`/admin/stats` 白屏崩溃**：前端 `StatsResponse` 类型期望嵌套的 `stats` 对象，而接口原返回顶层字段，导致 `Cannot read properties of undefined (reading 'totalSessions')`。现接口统一返回 `{ stats: { totalSessions, ... }, sessions, callsignStats }` 结构。
- 🔒 为 `/admin/stats` 及会话详情页补充登录守卫，未登录自动跳转至 `/login`。

**🆕 台网会话创建修复**

- 🐛 修复 **创建会话返回 500**：`log_sessions.controllerId` 为必填字段，但前端未传，触发 Zod 校验失败。后端现自动从当前登录用户填充 `controllerId`，创建成功返回 201。

**🔧 全站健壮性与接口一致性**

- ✅ 对 **13 个核心 API** 的返回结构与前端读取方式逐一比对，修正不一致项（仅统计接口存在结构不匹配，已修复，其余接口均对齐）。
- 🛡️ 前端列表渲染增加空值兜底（如 `equipments || []`、`sessions || []`），避免接口异常时白屏。
- 🔔 首页 `loadUsers` / `loadParticipants` 异常时增加 `alert` 提示，便于定位问题。
- 🐛 修复 **登出接口 cookie 名称不一致**（原清理 `auth-token`，实际为 `token`），统一清理 `token`。

**🧪 全站测试（测试经理）**

- 完成全站功能回归测试，覆盖：认证、用户管理、参与人员库、台网录入（核心）、统计、设备库、页面配置、呼号查询、鉴权守卫。
- 端到端脚本测试结果：**PASS 23 / FAIL 1**（唯一失败项为测试脚本断言误差，非系统缺陷；登录接口正确返回 200 + token）。

### v1.5.1 (2026-08-10)

**🔒 安全修复**

- 修复多个 API 接口缺少权限检查的漏洞
- 删除危险的调试接口（`/api/reset-admin`、`/api/debug/*`）
- 保护 `/api/init` 初始化接口，防止未授权创建管理员
- 修复 `/api/users` 接口无权限检查，任何人可查看/创建用户
- 修复 `/api/participants` 接口无权限检查，任何人可增删参与者
- 修复 `/api/admin/page-configs` 接口无权限检查，任何人可修改页面配置
- 修复 `/api/sessions` POST 无权限检查，任何人可创建会话

**修复的漏洞清单**

| 接口 | 问题 | 风险等级 |
|------|------|----------|
| `/api/users` | 无权限检查 | 🔴 严重 |
| `/api/users/[id]` | 无权限检查 | 🔴 严重 |
| `/api/participants` | 无权限检查 | 🔴 严重 |
| `/api/participants/upsert` | 无权限检查 | 🔴 严重 |
| `/api/participants/[id]` | 无权限检查 | 🟡 中等 |
| `/api/admin/page-configs` | 无权限检查 | 🔴 严重 |
| `/api/sessions` POST | 无权限检查 | 🔴 严重 |
| `/api/reset-admin` | 可重置管理员密码 | 🔴 严重 |
| `/api/debug/*` | 暴露用户信息 | 🔴 严重 |
| `/api/init` | 可创建管理员 | 🔴 严重 |

### v1.5.0 (2026-08-06)
- ✨ 新增**设备库管理**：独立管理设备名称，支持增删改查、批量导入导出
- ✨ 新增**从历史记录导入设备**：一键同步历史台网中的设备名称到设备库
- ✨ 新增**设备自动同步**：台网录入时自动将新设备添加到设备库
- ✨ 新增**设备智能补全**：录入设备时从设备库和历史记录中获取补全建议
- ✨ 新增**台网历史管理**：管理员可修改任意历史记录、指定日期新增记录
- ✨ 新增**历史数据导入导出**：支持从 Excel 批量导入台网记录到指定会话
- 🔧 优化权限控制：管理员操作不受6小时过期限制

### v1.4.0 (2026-02-12)
- ✨ 将主页底部的"台网统计"和"管理工具"按钮移至顶部Header
- ✨ 优化用户管理界面，所有操作改为弹窗模式
- 🐛 修复登录API密码验证逻辑错误
- 🐛 修复用户管理输入框字体颜色问题
- 🔧 全站数据检查和优化
- 📝 更新文档

### v1.3.0 (2026-02-12)
- ✨ 新增用户管理弹窗式编辑功能
- ✨ 优化输入框字体颜色（黑色）
- 🔧 修复密码输入框代码结构错误
- 🐛 修复编辑用户功能问题

### v1.2.0 (2026-02-12)
- ✨ 新增管理后台页面配置管理功能
- ✨ 新增 AdminLayout 组件，实现左右布局及菜单收缩功能
- ✨ 新增管理后台权限控制
- 🔧 优化用户管理界面

### v1.1.0 (2026-02-12)
- ✨ 新增台网统计页面
- ✨ 新增管理工具页面
- ✨ 新增呼号查询页面
- ✨ 新增Excel导出功能（带样式）
- ✨ 新增参与人员库管理
- 🔧 优化用户界面和交互

### v1.0.0 (2026-01-09)
- 🎉 初始版本发布
- ✨ 基础用户认证和权限管理
- ✨ 台网会话管理
- ✨ 台网记录录入
- ✨ 实时协作（SSE）
- ✨ 会话自动过期功能
- ✨ 北京时间统一显示

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范
- 使用 TypeScript 编写
- 遵循 ESLint 规则
- 编写清晰的注释
- 提交信息使用 Conventional Commits 格式

---

## 开源协议

本项目采用 MIT 协议开源。

---

## 联系方式

- **项目地址**：[GitHub](https://github.com/BI4IVE/Amateur-radio-network-log)
- **问题反馈**：[Issues](https://github.com/BI4IVE/Amateur-radio-network-log/issues)
- **联系邮箱**：bi4ive@br4in.cn

---

## 致谢

感谢以下开源项目和技术：

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [PostgreSQL](https://www.postgresql.org/)
- [Coze Coding](https://www.coze.cn/)
- [CodeBuddy CN](https://www.codebuddy.ai/)

特别感谢 **Coze Coding AI** 协助完成本项目的前期开发。后续开发 1.5.0 版本后由 **CodeBuddy CN** 接手开发。

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！**

1.5.0+ 版本开发维护：CodeBuddy CN

Made with ❤️ by BI4IVE

</div>
