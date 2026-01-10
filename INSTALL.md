# 快速安装指南

本文档提供济南黄河业余无线电台网主控日志系统的快速安装步骤。

## 前置检查

在开始之前，请确保您的系统已安装以下软件：

- Node.js 24+ ([下载地址](https://nodejs.org/))
- PostgreSQL 12+ ([下载地址](https://www.postgresql.org/download/))

检查版本：

```bash
node -v  # 应显示 v24.x.x
psql -V  # 应显示 12.x 或更高
```

## 快速安装（5 分钟）

### 1. 下载项目

```bash
# 克隆仓库
git clone <repository-url>
cd projects

# 或下载压缩包并解压
```

### 2. 安装依赖

```bash
# 安装 pnpm（如果未安装）
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 3. 配置数据库

#### 方式一：使用现有数据库

创建 `.env` 文件：

```env
DATABASE_URL=postgresql://你的用户名:你的密码@localhost:5432/你的数据库名
```

#### 方式二：创建新数据库

```bash
# 登录 PostgreSQL
sudo -u postgres psql

# 执行以下 SQL 命令
CREATE DATABASE amateur_radio_log;
CREATE USER radio_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE amateur_radio_log TO radio_admin;
\q
```

创建 `.env` 文件：

```env
DATABASE_URL=postgresql://radio_admin:your_secure_password@localhost:5432/amateur_radio_log
```

### 4. 启动应用

```bash
# 开发模式
pnpm dev

# 或生产模式
pnpm build
pnpm start
```

### 5. 访问系统

打开浏览器访问：`http://localhost:5000`

### 6. 登录

默认管理员账号：
- 用户名：`ADMIN`
- 密码：`ADMIN123`

> ⚠️ **重要**：登录后请立即修改默认密码！

## 验证安装

### 检查服务状态

```bash
# 检查端口是否监听
curl -I http://localhost:5000

# 应返回 HTTP/1.1 200 OK
```

### 检查数据库连接

首次登录时，系统会自动创建所需的数据表。登录后进入管理页面，确认能够正常访问所有功能。

## 下一步

- [阅读完整文档](README.md)
- [配置生产环境](DEPLOYMENT.md)
- [创建主控用户](#创建主控用户)

## 创建主控用户

### 方式一：通过管理页面

1. 使用管理员账号登录
2. 点击顶部导航栏"管理工具"
3. 进入"用户管理"
4. 点击"添加新用户"
5. 填写用户信息并设置角色为"user"

### 方式二：通过数据库直接添加

```bash
# 连接数据库
psql -U radio_admin -d amateur_radio_log

# 插入新用户（密码需要加密，建议使用管理页面）
INSERT INTO users (username, password, name, role)
VALUES ('BG4ABC', 'encrypted_password', '张三', 'user');

\q
```

## 常见安装问题

### 问题 1：pnpm install 失败

**解决方案：**
```bash
# 清除缓存
pnpm store prune

# 重新安装
rm -rf node_modules
pnpm install
```

### 问题 2：数据库连接失败

**解决方案：**
1. 确认 PostgreSQL 正在运行：
   ```bash
   sudo systemctl status postgresql
   ```

2. 检查 `.env` 文件中的连接字符串格式

3. 测试连接：
   ```bash
   psql -U radio_admin -d amateur_radio_log
   ```

### 问题 3：端口 5000 被占用

**解决方案：**
```bash
# 修改端口
export PORT=3001
pnpm dev
```

### 问题 4：编译错误

**解决方案：**
```bash
# 清理 Next.js 缓存
rm -rf .next

# 重新构建
pnpm build
```

## 系统要求

### 最低配置
- CPU: 2 核
- 内存: 2GB
- 硬盘: 10GB
- 操作系统: Linux/macOS/Windows

### 推荐配置
- CPU: 4 核
- 内存: 4GB
- 硬盘: 20GB SSD
- 操作系统: Ubuntu 20.04 LTS 或更高

## 技术支持

如果遇到安装问题：

1. 查看 [常见问题](DEPLOYMENT.md#常见问题)
2. 检查应用日志
3. 联系技术支持

## 更新升级

### 更新依赖

```bash
pnpm update
```

### 更新代码

```bash
git pull origin main
pnpm install
pnpm build
pnpm start
```

## 安全提示

1. ✅ 立即修改默认管理员密码
2. ✅ 使用强密码
3. ✅ 定期备份数据库
4. ✅ 保持依赖更新
5. ✅ 配置防火墙规则
6. ✅ 启用 HTTPS（生产环境）

## 下一步

恭喜！系统已成功安装。现在您可以：

- 创建新的台网会话
- 录入台网记录
- 查询参与历史
- 导出数据报表

如有任何问题，请参考完整文档或联系支持团队。
