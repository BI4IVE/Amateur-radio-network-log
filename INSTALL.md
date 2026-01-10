# 安装指南

本指南详细介绍了如何在不同环境下安装济南黄河业余无线电台网主控日志系统。

## 目录

- [系统要求](#系统要求)
- [开发环境安装](#开发环境安装)
- [生产环境安装](#生产环境安装)
- [Windows环境安装](#windows环境安装)
- [macOS环境安装](#macos环境安装)
- [故障排查](#故障排查)

## 系统要求

### 最低要求

- **Node.js**: 24.0 或更高版本
- **PostgreSQL**: 15.0 或更高版本
- **pnpm**: 8.0 或更高版本
- **内存**: 至少 2GB RAM
- **存储**: 至少 5GB 可用空间

### 推荐配置

- **Node.js**: 24.x LTS
- **PostgreSQL**: 15.x
- **pnpm**: 最新稳定版
- **内存**: 4GB 或更高
- **存储**: 10GB 或更高

## 开发环境安装

### 1. 安装Node.js

#### 使用 nvm (推荐)

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载终端配置
source ~/.bashrc

# 安装 Node.js 24
nvm install 24
nvm use 24
nvm alias default 24

# 验证安装
node --version
```

#### 直接下载安装

访问 [Node.js官网](https://nodejs.org/) 下载并安装 Node.js 24 LTS 版本。

### 2. 安装pnpm

```bash
# 全局安装 pnpm
npm install -g pnpm

# 验证安装
pnpm --version
```

### 3. 安装PostgreSQL

#### Linux (Ubuntu/Debian)

```bash
# 更新包列表
sudo apt update

# 安装 PostgreSQL
sudo apt install postgresql postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 验证安装
sudo -u postgres psql --version
```

#### macOS

```bash
# 使用 Homebrew 安装
brew install postgresql@15

# 启动服务
brew services start postgresql@15

# 验证安装
psql --version
```

#### Windows

1. 访问 [PostgreSQL官网](https://www.postgresql.org/download/windows/)
2. 下载并安装 PostgreSQL 15
3. 安装时设置密码，记住此密码

### 4. 克隆项目

```bash
# 使用 git
git clone <repository-url>
cd <project-directory>

# 或直接下载并解压
```

### 5. 安装项目依赖

```bash
# 在项目根目录执行
pnpm install
```

### 6. 配置数据库

```bash
# 登录 PostgreSQL
sudo -u postgres psql  # Linux/macOS
psql -U postgres       # Windows (使用安装时设置的密码)

# 创建数据库
CREATE DATABASE radio_log;

# 创建用户（可选）
CREATE USER radio_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE radio_log TO radio_user;

# 退出
\q
```

### 7. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑环境变量文件
nano .env.local  # Linux/macOS
notepad .env.local  # Windows
```

编辑 `.env.local` 文件：

```env
# 数据库连接URL
# 根据实际情况修改用户名、密码、主机、端口和数据库名
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/radio_log

# 应用端口（可选，默认5000）
PORT=5000

# Node环境
NODE_ENV=development
```

**注意**：
- `your_password` 替换为实际的PostgreSQL密码
- Windows上的密码可能需要URL编码，例如 `#` 编码为 `%23`
- 如果使用非本地数据库，请修改 `localhost` 为实际主机地址

### 8. 初始化数据库

```bash
# 数据库表会自动创建，首次运行时自动初始化管理员账号

# 可以手动运行初始化（可选）
pnpm dev
# 访问 http://localhost:5000，系统会自动初始化
```

### 9. 启动开发服务器

```bash
# 启动开发服务器
pnpm dev

# 或者使用npm
npm run dev
```

### 10. 访问应用

打开浏览器访问：`http://localhost:5000`

### 11. 登录系统

使用默认管理员账号登录：
- **用户名**: `ADMIN`
- **密码**: `ADMIN123`

## 生产环境安装

生产环境安装请参考 [DEPLOYMENT.md](./DEPLOYMENT.md) 文档。

## Windows环境安装

### 使用WSL2 (推荐)

Windows Subsystem for Linux (WSL2) 提供了在Windows上运行Linux环境的最佳方式。

1. **启用WSL2**
   ```powershell
   # 以管理员身份运行PowerShell
   wsl --install
   # 重启计算机
   ```

2. **安装Ubuntu**
   ```bash
   # 在WSL中安装Ubuntu
   wsl --install -d Ubuntu
   ```

3. **在WSL中按照Linux环境安装步骤操作**

### 使用Git Bash

如果不使用WSL2，可以使用Git Bash：

1. 安装 [Git for Windows](https://git-scm.com/download/win)
2. 安装 Node.js (Windows版本)
3. 安装 PostgreSQL (Windows版本)
4. 使用Git Bash按照上述步骤操作

### 注意事项

- Windows上PostgreSQL密码可能需要特殊字符转义
- 确保防火墙允许5000端口访问
- 文件路径使用正斜杠 `/` 或双反斜杠 `\\`

## macOS环境安装

### 使用Homebrew

```bash
# 安装 Homebrew (如果未安装)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Node.js
brew install node@24

# 安装 PostgreSQL
brew install postgresql@15

# 安装 pnpm
npm install -g pnpm

# 启动 PostgreSQL
brew services start postgresql@15

# 创建数据库
createdb radio_log

# 按照上述步骤继续操作
```

## 验证安装

### 检查Node.js

```bash
node --version
# 应输出: v24.x.x
```

### 检查pnpm

```bash
pnpm --version
# 应输出: 8.x.x 或更高
```

### 检查PostgreSQL

```bash
psql --version
# 应输出: psql (PostgreSQL) 15.x
```

### 检查数据库连接

```bash
psql -U postgres -d radio_log -c "SELECT version();"
```

### 检查应用

```bash
cd <project-directory>
pnpm dev
```

访问 `http://localhost:5000`，应看到登录页面。

## 配置选项

### 修改端口

编辑 `.env.local` 文件：

```env
PORT=3000  # 修改为你想要的端口
```

### 数据库连接池配置

如果需要调整数据库连接池，可以修改 `src/storage/database/index.ts`：

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## 数据库迁移

系统使用Drizzle ORM，表结构会在首次运行时自动创建。

如需手动管理迁移：

```bash
# 生成迁移文件
pnpm drizzle-kit generate:pg

# 执行迁移
pnpm drizzle-kit push:pg
```

## 故障排查

### 问题1: pnpm install 失败

**解决方案**：
```bash
# 清理缓存
pnpm store prune

# 删除node_modules和lock文件
rm -rf node_modules pnpm-lock.yaml

# 重新安装
pnpm install
```

### 问题2: 数据库连接失败

**检查项**：
1. PostgreSQL服务是否运行
   ```bash
   sudo systemctl status postgresql  # Linux
   brew services list                   # macOS
   ```

2. 检查 `.env.local` 中的 `DATABASE_URL` 是否正确

3. 测试数据库连接
   ```bash
   psql -U postgres -d radio_log
   ```

4. 检查防火墙设置

### 问题3: 端口5000已被占用

**解决方案**：
```bash
# 查找占用5000端口的进程
lsof -i :5000  # Linux/macOS
netstat -ano | findstr :5000  # Windows

# 杀死进程或修改端口
```

修改 `.env.local` 文件：
```env
PORT=3001
```

### 问题4: 权限错误

**Linux/macOS**：
```bash
# 确保对项目目录有读写权限
chmod -R 755 /path/to/project
```

**Windows**：
- 以管理员身份运行命令提示符
- 检查文件和文件夹的安全权限

### 问题5: TypeScript错误

```bash
# 清理TypeScript缓存
rm -rf .next

# 重新构建
pnpm build
```

### 问题6: 页面无法访问

**检查项**：
1. 开发服务器是否正在运行
2. 防火墙是否阻止了连接
3. 浏览器控制台是否有错误信息
4. 端口是否正确

## 卸载

### 停止服务

```bash
# 停止开发服务器
Ctrl + C

# 或杀死进程
pkill -f "next dev"
```

### 删除数据库

```bash
# 登录PostgreSQL
sudo -u postgres psql

# 删除数据库
DROP DATABASE radio_log;

# 删除用户（如果创建了）
DROP USER radio_user;

# 退出
\q
```

### 删除项目文件

```bash
# 删除项目目录
rm -rf /path/to/project
```

### 完全卸载PostgreSQL（可选）

**Linux**：
```bash
sudo apt remove --purge postgresql postgresql-contrib
sudo rm -rf /var/lib/postgresql
```

**macOS**：
```bash
brew uninstall postgresql@15
rm -rf /usr/local/var/postgres
```

## 获取帮助

如遇到问题：

1. 查看本文档的故障排查部分
2. 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 部署指南
3. 查看 [API.md](./API.md) API文档
4. 查看项目GitHub Issues
5. 联系项目维护者

## 下一步

安装完成后，您可以：

1. 阅读用户手册了解如何使用系统
2. 配置用户和权限
3. 开始记录台网日志
4. 探索数据统计和导出功能

---

济南黄河业余无线电中继台 © 2024
