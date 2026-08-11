# 济南黄河业余无线电台网主控日志系统

<div align="center">

![Version](https://img.shields.io/badge/version-1.5.5-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-24.x-brightgreen)
![React](https://img.shields.io/badge/react-19.x-61DAFB)
![Next](https://img.shields.io/badge/next-16.x-black)

**本系统前期由扣子 AI（Coze Coding）编程完成，1.5.0 版本后由 CodeBuddy CN 接手开发**

[功能特性](#功能特性) • [技术栈](#技术栈) • [快速开始](#快速开始) • [部署指南](#部署指南) • [使用文档](#使用文档)

</div>

---

## 📖 项目简介

济南黄河业余无线电台网主控日志系统是一个专为业余无线电爱好者设计的现代化日志管理系统。系统支持多主控实时协作、会话管理、参与人员库、Excel 导出、呼号查询等功能，采用前后端分离架构，界面美观、操作便捷。

本系统已成功应用于济南黄河业余无线电台网的实际运营中，为台网日志记录提供了高效、可靠的解决方案。

### 核心优势

- 🎯 **专业设计**：专为业余无线电场景设计，贴合实际使用需求
- 🚀 **高性能**：采用 Next.js 16 + React 19，提供极速响应体验
- 🔒 **安全可靠**：完善的权限控制和数据加密机制
- 🌐 **实时协作**：基于 SSE 的多主控实时同步功能
- 📱 **响应式设计**：完美适配 PC、平板、手机等设备

---

## ✨ 功能特性

### 🔐 用户认证与权限管理
- **多角色权限控制**：管理员（admin）和主控（user）两种角色
- **安全登录**：支持不区分大小写的用户名和密码验证
- **权限分级**：
  - 管理员：拥有所有权限（用户管理、台网历史管理、设备库管理、页面配置管理）
  - 主控：可以创建会话、添加和编辑记录、查看历史会话
  - 多主控协作：任何主控都可以在任何会话中进行编辑操作

### 📝 台网会话管理
- **会话创建**：主控人员可创建新的台网会话
- **会话信息**：记录主控人员姓名、呼号、设备、天线、位置（QTH）等信息
- **会话过期**：会话创建 6 小时后自动过期，禁止添加、修改和删除记录
- **活跃会话列表**：实时显示未过期的活跃会话，方便主控加入协作

### 📊 台网记录录入
- **智能录入**：
  - 支持呼号自动联想（从参与人员库中搜索）
  - 设备名称自动补全（从设备库和历史记录中获取建议）
  - 历史记录联想（QTH、天线、功率、信号、报告、备注）
  - 键盘快捷键（Ctrl+Enter 快速添加记录）
  - 必填字段自动验证（呼号、QTH、天馈、功率、信号）
- **实时协作**：使用 SSE（Server-Sent Events）实现多主控实时同步
- **参与人员库同步**：自动将新记录更新到参与人员库
- **设备库同步**：自动将新输入的设备名称添加到设备库

### 🗂️ 参与人员库管理
- **人员信息管理**：呼号、姓名、位置、设备、天线、功率、信号、报告、备注
- **快速查询**：支持呼号搜索，自动填充历史数据
- **智能更新**：添加记录时自动更新或创建参与人员信息

### 🔧 设备库管理（v1.5.0 新增）
- **独立设备库**：专门管理设备名称的独立数据库，与参与人员库分离
- **增删改查**：支持新增、编辑、删除设备信息
- **批量导入**：支持从 Excel/CSV 文件批量导入设备
- **导出功能**：支持导出全部设备数据为 Excel 文件
- **从历史记录导入**：一键将所有历史台网记录中的设备名称同步到设备库
- **自动同步**：台网录入时，新输入的设备名称会自动添加到设备库
- **智能补全**：台网录入设备字段时，同时从设备库和历史记录中获取补全建议

### 📜 台网历史管理（v1.5.0 新增）
- **历史记录编辑**：管理员可修改任意历史台网记录（不受6小时过期限制）
- **指定日期新增**：管理员可创建指定日期的台网会话并添加记录
- **历史数据导入**：支持从 Excel 文件批量导入台网记录到指定会话
- **历史数据导出**：支持导出任意会话的完整记录为 Excel 文件
- **会话管理**：支持编辑、删除历史会话及其记录

### 📥 Excel 导出
- **专业格式**：使用 xlsx-js-style 库生成带样式的 Excel 文件
- **完整信息**：包含台网标题、主控信息、会话时间、记录列表等
- **美化样式**：
  - 标题行大字体、加粗、居中
  - 表头蓝色背景、白色文字
  - 数据单元格居中对齐
  - 自动调整列宽和行高

### 🔍 呼号查询
- **快速查询**：输入呼号即可查看该呼号的所有历史记录
- **详细信息**：显示每次台网的完整记录信息
- **统计信息**：显示该呼号参与的台网次数和时间

### 📈 台网统计
- **历史会话**：查看所有历史台网会话记录
- **会话详情**：查看每个会话的完整记录列表
- **数据导出**：支持导出 CSV 格式的会话数据
- **统计报表**：提供多维度数据分析

### ⚙️ 页面配置管理
- **动态配置**：管理员可在后台修改所有页面的标题、版本号、联系方式等
- **实时生效**：配置修改后无需重启服务，立即生效
- **分类管理**：
  - 通用配置：网站标题、版本号、联系方式
  - 登录页配置：标题、副标题
  - 首页配置：页头标题、页脚文字
  - 会话详情页配置：页面标题

### 🛠️ 管理工具
- **用户管理**：创建、更新用户，设置角色和权限
- **弹窗式编辑**：所有编辑操作采用弹窗模式，提升用户体验
- **批量操作**：支持批量删除、批量修改角色
- **数据导出**：支持导出用户列表为 CSV 文件
- **搜索筛选**：支持按用户名、姓名、角色、设备等多条件搜索

### 🌐 多语言与时区
- **北京时间**：系统所有时间统一显示为北京时间（UTC+8）
- **中文界面**：全中文界面，符合国内用户习惯
- **大写输入**：呼号输入自动转换为大写字母

### 🎨 界面优化
- **现代化设计**：采用 shadcn/ui 组件库，界面美观简洁
- **响应式布局**：完美适配各种屏幕尺寸
- **快捷导航**：顶部导航栏快速访问常用功能
- **侧边栏菜单**：管理后台支持收缩/展开

---

## 🛠️ 技术栈

### 前端技术
- **框架**：Next.js 16（App Router）
- **UI 库**：React 19
- **样式**：Tailwind CSS 4
- **组件库**：shadcn/ui
- **语言**：TypeScript 5
- **Excel 导出**：xlsx-js-style

### 后端技术
- **运行时**：Node.js 24
- **ORM**：Drizzle ORM
- **数据库**：PostgreSQL 14+
- **实时通信**：Server-Sent Events (SSE)

### 开发工具
- **包管理器**：pnpm
- **部署工具**：Coze CLI
- **API**：RESTful API + SSE
- **类型检查**：TypeScript strict mode

---

## 🚀 快速开始

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
```

#### 5. 初始化数据库
执行数据库迁移：
```bash
# 创建表结构
pnpm drizzle-kit push:pg
```

#### 6. 创建管理员账户
使用管理工具页面创建管理员账户，或使用 API：
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ADMIN",
    "password": "ADMIN123",
    "name": "管理员",
    "role": "admin"
  }'
```

#### 7. 启动开发服务器
```bash
pnpm dev
```

访问 `http://localhost:5000` 查看应用。

---

## 📦 部署指南

### 方式一：当前平台部署（Coze Coding 环境）

本系统已在 Coze Coding 沙箱环境中成功部署，这是官方推荐的开发和测试环境。

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
   ```
   *注意：将用户名和密码替换为实际的数据库用户名和密码*

##### 8. 初始化数据库
```bash
pnpm drizzle-kit push:pg
```

##### 9. 创建管理员账户
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ADMIN",
    "password": "ADMIN123",
    "name": "管理员",
    "role": "admin"
  }'
```

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
- 使用管理员账户登录：`ADMIN` / `ADMIN123`

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
```

##### 9. 初始化数据库
```bash
pnpm drizzle-kit push:pg
```

##### 10. 创建管理员账户
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ADMIN",
    "password": "ADMIN123",
    "name": "管理员",
    "role": "admin"
  }'
```

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

#### 创建 Dockerfile
```dockerfile
FROM node:24-slim

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制项目文件
COPY . .

# 构建应用
RUN pnpm build

# 暴露端口
EXPOSE 5000

# 启动应用
CMD ["pnpm", "start"]
```

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
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=radio_network_log
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

#### 启动服务
```bash
docker-compose up -d
```

---

## 📖 使用文档

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

## 🔧 常见问题

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

## 📝 更新日志

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

## 🤝 贡献指南

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

## 📄 开源协议

本项目采用 MIT 协议开源。

---

## 📮 联系方式

- **项目地址**：[GitHub](https://github.com/BI4IVE/Amateur-radio-network-log)
- **问题反馈**：[Issues](https://github.com/BI4IVE/Amateur-radio-network-log/issues)
- **联系邮箱**：bi4ive@br4in.cn

---

## 🙏 致谢

感谢以下开源项目和技术：

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [PostgreSQL](https://www.postgresql.org/)
- [Coze Coding](https://www.coze.cn/)

特别感谢 **Coze Coding AI** 协助完成本项目的前期开发。后续开发 1.5.0 版本后由 **CodeBuddy CN** 接手开发。

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！**

Made with ❤️ by BI4IVE

</div>
