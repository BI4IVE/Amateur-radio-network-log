# 济南黄河业余无线电台网主控日志系统

一个基于 Next.js 开发的业余无线电网络日志管理系统，用于记录和管理台网会话、参与人员信息及通信记录。

## 功能特性

### 核心功能
- **用户管理**：支持管理员和普通主控两种角色，基于密码认证登录
- **台网会话管理**：创建新台网会话，记录主控人员信息（姓名、设备、天线、QTH）
- **记录录入**：快速录入参与台网的无线电通信记录
  - 必填项：呼号、QTH、天馈、功率、信号
  - 可选项：设备、报告、备注
  - 支持 Ctrl+Enter 快捷键提交
  - 支持历史记录联想输入（呼号、QTH、设备、天馈、功率、信号、报告、备注）
  - 自动同步更新参与人员库
- **参与人员库管理**：自动维护参与人员信息，支持手动管理
- **历史查询**：
  - 按呼号查询参与历史（显示参与时间和总次数）
  - 台网统计（按日期范围筛选、查看总会话数、总记录数、唯一呼号数）
  - 会话详情（查看每次台网的所有记录）
- **数据导出**：
  - 单次会话导出为 Excel 格式
  - 批量导出为 CSV 格式（序号正序、时间正序）
- **证书生成**：为参与人员生成参与证书

### 权限控制
- **管理员 (ADMIN/ADMIN123)**：
  - 查看所有用户的台网会话
  - 编辑和删除任何记录
  - 管理用户账户
  - 使用管理工具
- **普通主控**：
  - 仅可查看自己主控的会话
  - 只能添加新记录，无法编辑或删除
  - 仅可查询自己的历史记录
  - 仅可查看自己的统计数据

## 技术栈

- **前端框架**：Next.js 16 (App Router)
- **UI 框架**：React 19
- **样式方案**：Tailwind CSS 4
- **开发语言**：TypeScript 5
- **数据库**：PostgreSQL
- **ORM**：Drizzle ORM
- **文件导出**：xlsx (Excel)、CSV
- **对象存储**：AWS S3 (集成服务)

## 数据库结构

### 用户表 (users)
- id: 用户 ID (UUID)
- username: 用户名（唯一，不区分大小写）
- password: 密码（不区分大小写）
- name: 姓名
- equipment: 设备信息
- antenna: 天线信息
- qth: 位置信息
- role: 角色 (admin/user)
- createdAt: 创建时间
- updatedAt: 更新时间

### 台网会话表 (log_sessions)
- id: 会话 ID (UUID)
- controllerId: 主控人员 ID
- controllerName: 主控姓名
- controllerEquipment: 主控设备
- controllerAntenna: 主控天线
- controllerQth: 主控位置
- sessionTime: 台网时间
- createdAt: 创建时间

### 台网记录表 (log_records)
- id: 记录 ID (UUID)
- sessionId: 所属会话 ID
- callsign: 呼号
- qth: 位置
- equipment: 设备
- antenna: 天馈
- power: 功率
- signal: 信号
- report: 报告
- remarks: 备注
- createdAt: 创建时间

### 参与人员表 (participants)
- id: ID (UUID)
- callsign: 呼号（唯一）
- name: 姓名
- qth: 位置
- equipment: 设备
- antenna: 天馈
- power: 功率
- signal: 信号
- report: 报告
- remarks: 备注
- createdAt: 创建时间
- updatedAt: 更新时间

## 安装与部署

### 环境要求
- Node.js 24+
- PostgreSQL 数据库

### 本地开发

1. **克隆项目**
```bash
git clone <repository-url>
cd projects
```

2. **安装依赖**
```bash
pnpm install
```

3. **配置环境变量**
创建 `.env` 文件（已包含在 .gitignore 中），配置以下变量：
```env
# PostgreSQL 数据库配置
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# AWS S3 对象存储配置（可选，用于文件存储）
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your_bucket_name
```

4. **初始化数据库**
首次启动时会自动初始化管理员账户（用户名：ADMIN，密码：ADMIN123，不区分大小写）

5. **启动开发服务器**
```bash
pnpm dev
```
服务将在 `http://localhost:5000` 启动

6. **构建生产版本**
```bash
pnpm build
pnpm start
```

### Docker 部署（可选）

如果使用 Docker 部署，可以参考以下 Dockerfile：

```dockerfile
FROM node:24-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

EXPOSE 5000

CMD ["pnpm", "start"]
```

## 使用说明

### 1. 登录系统
- 默认管理员账号：`ADMIN` / `ADMIN123`（不区分大小写）
- 管理员可在 `/admin` 页面创建新的主控账户

### 2. 创建台网会话
- 填写台网时间、主呼号、设备、天线、QTH 信息
- 点击"创建新台网会话"
- 主控人员可选择"使用数据库中的信息"自动填充

### 3. 录入台网记录
- 在参与人员下拉框中选择人员（可选）
- 手动输入呼号（支持历史联想，方向键选择，回车确认）
- 填写必填项：呼号、QTH、天馈、功率、信号
- 点击"添加记录"或按 Ctrl+Enter 提交
- 系统自动将记录同步到参与人员库

### 4. 查看历史台网
- 点击"查看历史台网"按钮
- 可按日期范围筛选统计
- 点击会话行查看详细记录

### 5. 导出数据
- 单次会话：点击"导出Excel"按钮
- 批量导出：在台网统计页面点击"导出CSV"
- 会话详情：在详情页面点击"导出CSV"

### 6. 查询参与记录
- 点击顶部导航栏"呼号查询"
- 输入呼号查询参与时间和总次数

### 7. 生成证书
- 在查询结果中点击"生成证书"按钮
- 证书签发机构：济南黄河业余无线电中继台

## 项目结构

```
├── src/
│   ├── app/                          # Next.js App Router 页面
│   │   ├── api/                      # API 路由
│   │   │   ├── admin/                # 管理员 API
│   │   │   ├── auth/                 # 认证 API
│   │   │   ├── sessions/             # 会话 API
│   │   │   └── users/                # 用户 API
│   │   ├── admin/                    # 管理页面
│   │   ├── query/                    # 查询页面
│   │   ├── login/                    # 登录页面
│   │   └── page.tsx                  # 主页面
│   └── storage/                       # 数据层
│       └── database/                 # 数据库管理
├── public/                           # 静态资源
├── .coze                             # 项目配置
├── next.config.ts                    # Next.js 配置
├── package.json                      # 项目依赖
└── tsconfig.json                     # TypeScript 配置
```

## 开发规范

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 组件使用函数式组件和 Hooks
- 样式使用 Tailwind CSS 类名

### API 规范
- RESTful API 设计
- 统一的错误处理
- 使用 JSON 格式响应

### Git 提交规范
```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构代码
test: 测试相关
chore: 构建/工具配置
```

## 安全说明

- 所有密码在数据库中加密存储
- 登录时支持大小写不敏感（使用 SQL LOWER 函数）
- API 路由进行权限验证
- 敏感配置通过环境变量管理
- 实现了基于角色的访问控制（RBAC）

## 常见问题

### 1. 数据库连接失败
检查 `.env` 文件中的 `DATABASE_URL` 是否正确配置。

### 2. 登录失败
- 确认用户名和密码拼写正确
- 注意用户名和密码不区分大小写
- 管理员默认账号：ADMIN / ADMIN123

### 3. 导出失败
- 确保浏览器支持文件下载
- 检查是否有足够的会话数据

### 4. 联想功能不工作
- 确保已有历史记录数据
- 输入至少 2 个字符后才显示联想结果

## 技术支持

当然是没有了。

## 许可证

以上完全AI编写
AI是Apache 2.0协议所以
本项目仅供学习和内部使用。
