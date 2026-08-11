# AGENTS.md - 台网管理系统

## 项目概览
业余无线电台网管理系统，用于实时记录和管理台网通联数据。支持多主控实时协作、历史数据管理、数据导入导出等功能。

- **技术栈**: Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4
- **数据库**: PostgreSQL + Drizzle ORM
- **实时通信**: Server-Sent Events (SSE)
- **部署**: Coze 平台，生产环境 https://qx7q39dy6z.coze.site/
- **详细文档**: 参见 [README.md](./README.md)

## 目录结构
```
src/
├── app/
│   ├── api/
│   │   ├── admin/          # 管理员专用 API（绕过6h过期限制）
│   │   │   ├── sessions/   # 历史会话管理（CRUD + 记录管理 + 导入）
│   │   │   ├── participants/import/  # 参与者批量导入
│   │   │   ├── equipments/ # 设备库管理（CRUD + 导入 + 从历史记录导入）
│   │   │   ├── page-configs/         # 页面配置管理
│   │   │   └── stats/               # 统计数据
│   │   ├── sessions/       # 台网会话 API（受6h过期限制）
│   │   ├── participants/   # 参与者 API（呼号库）
│   │   ├── users/          # 用户认证 API
│   │   └── sse/            # SSE 实时推送
│   ├── admin/              # 管理后台页面
│   │   ├── page.tsx        # 用户管理
│   │   ├── stats/          # 台网统计
│   │   ├── tools/          # 管理工具
│   │   ├── page-configs/   # 页面配置
│   │   ├── logs/           # 台网历史管理（管理员）
│   │   ├── participants/   # 参与者管理（管理员）
│   │   └── equipments/     # 设备库管理（管理员）
│   ├── login/              # 登录页
│   └── page.tsx            # 主页（实时台网记录）
├── components/             # 共享组件
│   └── AdminLayout.tsx     # 管理后台布局（含菜单定义）
├── storage/database/
│   ├── shared/schema.ts    # Drizzle 表结构 + Zod schema
│   ├── logManager.ts       # 台网记录 CRUD（无过期限制）
│   ├── participantManager.ts # 参与者 CRUD
│   ├── equipmentManager.ts # 设备库 CRUD + 自动同步
│   └── utils/sessionUtils.ts # isSessionExpired（6h过期判断）
└── utils/dateFormat.ts     # 北京时间格式化工具
```

## 数据库表
| 表名 | 用途 | 关键字段 |
|------|------|----------|
| users | 用户 | username(unique), password, role(admin/user) |
| log_sessions | 台网会话 | controllerId, sessionTime(日期), controllerName/Equipment/Antenna/Qth |
| log_records | 台网记录 | sessionId(FK), callsign, qth, equipment, antenna, power, signal, report, remarks |
| participants | 呼号库 | callsign(unique), name, equipment, antenna, qth... |
| equipments | 设备库 | name(unique), description |
| page_configs | 页面配置 | key(unique), value, category |

## 核心业务逻辑
- **6小时过期机制**: API 路由层检查 `isSessionExpired(sessionTime)`，过期会话禁止普通用户写操作。管理员通过 `/api/admin/` 路由绕过此限制。
- **权限控制**: admin 可管理所有数据；user 可创建/编辑记录（6h内）；删除仅 admin。
- **实时协作**: SSE 广播记录变更到所有连接的客户端。
- **设备自动同步**: 台网录入时，新输入的设备名称自动添加到设备库。
- **设备智能补全**: 设备字段同时从设备库和历史记录中获取补全建议。
- **版本号**: package.json + page_configs(key='version') 双处维护，当前 v1.5.0。

## 构建与运行
```bash
pnpm install        # 安装依赖
pnpm run dev        # 开发环境 (port 5000)
pnpm run build      # 生产构建
pnpm run start      # 生产运行
```

## 开发规范
- 包管理器: pnpm（禁止 npm/yarn）
- 端口: 通过 `${DEPLOY_RUN_PORT}` 环境变量读取，禁止硬编码
- 北京时间: 所有日期显示统一 UTC+8，使用 `src/utils/dateFormat.ts`
- 组件风格: shadcn/ui + Tailwind CSS
