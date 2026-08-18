[← 技术栈](03-tech-stack.md) · [部署指南 →](05-deployment.md)

# 快速开始

## 环境要求

- **Node.js**：24.x 或更高版本
- **pnpm**：9.x 或更高版本
- **PostgreSQL**：14.x 或更高版本
- **内存**：至少 2GB
- **磁盘空间**：至少 1GB

## 本地开发

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
创建 PostgreSQL 数据库：
```sql
CREATE DATABASE radio_network_log;
```

### 4. 配置环境变量
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

### 5. 初始化数据库
执行数据库迁移：
```bash
# 创建表结构
pnpm db:push
```

### 6. 配置管理员初始密码
管理员账户在**首次访问首页时自动初始化**（见 `src/app/page.tsx` 的 `initializeAdmin()`），无需手动创建。密码取自环境变量 `ADMIN_INIT_PASSWORD`：
```env
# .env 中设置（务必修改为强密码）
ADMIN_INIT_PASSWORD=你的初始密码
```
> ⚠️ 安全说明：v1.5.1 起 `/api/users` 的创建接口已要求管理员权限，**匿名调用会被 403 拒绝**，请勿再用 curl 匿名创建管理员。初始化接口 `/api/init` 同样依赖 `ADMIN_INIT_PASSWORD`，未设置则拒绝初始化。

### 7. 启动开发服务器
```bash
pnpm dev
```

访问 `http://localhost:5000` 查看应用。

---

[← 返回文档首页](../README.md)
