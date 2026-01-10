# 济南黄河业余无线电台网主控日志系统

一个专为业余无线电台网设计的现代化日志管理系统，提供台网会话记录、参与人员管理、数据导出、权限控制等完整功能。

## 项目简介

本系统是为济南黄河业余无线电中继台开发的台网日志管理平台，支持：

- 主控人员管理（管理员/普通主控）
- 台网会话记录与实时录入
- 参与人员库自动同步
- Excel/CSV数据导出
- 呼号查询功能
- 基于角色的权限控制（RBAC）
- 证书生成功能
- 台网统计分析

## 技术栈

- **框架**: Next.js 16 (App Router)
- **UI库**: React 19
- **语言**: TypeScript 5
- **样式**: Tailwind CSS 4
- **数据库**: PostgreSQL
- **ORM**: Drizzle ORM
- **导出**: xlsx (Excel处理)

## 主要功能

### 1. 用户认证与权限
- 管理员账号：`ADMIN` / `ADMIN123`（不区分大小写）
- 基于角色的访问控制（RBAC）
- 非管理员只能查看自己主控的会话，无法编辑或删除记录

### 2. 台网会话管理
- 创建台网会话（记录主控信息、设备、天线、QTH等）
- 实时录入台网记录（呼号、QTH、设备、天馈、功率、信号、报告、备注）
- 必填字段验证（呼号、QTH、天馈、功率、信号）
- Ctrl+Enter 快捷键提交记录

### 3. 智能联想
- 参与人员库搜索联想（呼号输入时自动匹配）
- 历史记录联想（QTH、设备、天馈、功率、信号、报告、备注）
- 键盘导航支持（方向键选择，回车确认）

### 4. 参与人员库
- 记录自动同步到参与人员库
- 支持参与人员查询

### 5. 数据导出
- 当前会话Excel导出
- 台网统计CSV导出（包含所有会话的详细记录）
- 单个会话CSV导出

### 6. 台网统计
- 总会话数、总记录数、唯一呼号数统计
- 按呼号统计参与次数
- 会话列表（可点击查看详情）
- 按日期范围筛选

### 7. 呼号查询
- 查询参与人员的参与时间和总次数
- 支持呼号模糊搜索

### 8. 管理工具
- 用户管理（新增、编辑、删除用户）
- 参与人员库管理
- 数据备份与恢复

### 9. 证书生成
- 为参与人员生成参与证书
- 证书签发机构：济南黄河业余无线电中继台

## 项目结构

```
.
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API路由
│   │   │   ├── admin/        # 管理员API
│   │   │   ├── init/         # 初始化API
│   │   │   ├── login/        # 登录API
│   │   │   ├── participants/ # 参与人员API
│   │   │   ├── records/      # 记录API
│   │   │   ├── sessions/     # 会话API
│   │   │   └── users/        # 用户API
│   │   ├── admin/            # 管理页面
│   │   ├── query/            # 查询页面
│   │   ├── login/            # 登录页面
│   │   └── page.tsx          # 主页
│   ├── storage/
│   │   └── database/         # 数据库相关
│   │       ├── index.ts      # 数据库连接
│   │       ├── shared/       # 共享代码
│   │       │   └── schema.ts # 数据库schema
│   │       └── sql/          # SQL迁移文件
│   └── lib/
│       └── xlsx.ts           # Excel导出工具
├── .coze                      # 项目配置
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## 快速开始

### 前置要求

- Node.js 24+
- PostgreSQL 数据库
- pnpm 包管理器

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd <project-directory>
```

2. 安装依赖
```bash
pnpm install
```

3. 配置环境变量
```bash
cp .env.example .env.local
# 编辑 .env.local 文件，填写数据库连接信息
```

4. 初始化数据库
```bash
# 数据库表会自动创建，首次运行时会自动初始化管理员账号
```

5. 启动开发服务器
```bash
pnpm dev
```

6. 访问应用
打开浏览器访问 `http://localhost:5000`

### 默认账号

- **管理员账号**: `ADMIN`
- **密码**: `ADMIN123`

## 开发指南

### 运行构建检查
```bash
npx tsc --noEmit
```

### 运行开发服务器
```bash
pnpm dev
```

### 构建生产版本
```bash
pnpm build
```

## 数据库设计

### 主要数据表

1. **users** - 用户表（台网主控人员）
2. **log_sessions** - 台网会话表
3. **log_records** - 台网记录明细表
4. **participants** - 参与人员信息表

详细数据库结构请参考 `src/storage/database/shared/schema.ts`

## API文档

完整的API文档请参考 [API.md](./API.md)

## 部署指南

详细的部署指南请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 贡献指南

欢迎贡献代码！请参考 [CONTRIBUTING.md](./CONTRIBUTING.md)

## 许可证

本项目为业余无线电中继台内部使用系统。

## 技术支持

如有问题或建议，请联系项目维护者。

---

济南黄河业余无线电中继台 © 2024
