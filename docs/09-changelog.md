[← 常见问题](08-faq.md) · [贡献指南 →](10-contributing.md)

# 更新日志

## v1.5.12 (2026-08-20)

**🚀 主控轮值表 + 软删除/回收站 + 审计日志 + 台网预告 + 后台 UI 美化**

- ✨ 新增**主控轮值表 `/admin/rotation`**：按主控聚合台网场次数、最近主持时间与分布（修复同名主控因 `controllerId` 有无/不同被重复拆分的问题，按 `controllerName` 归并统计）。
- 🗑 新增**软删除与回收站 `/admin/recycle`**：会话与记录改为软删除（新增 `deleted_at` 字段），可恢复，避免误删丢失数据。
- 📋 新增**审计日志 `/admin/audit`**：记录删除/恢复等操作，可追溯（新增 `audit_logs` 表）。
- 📅 新增**台网预告与排期 `/admin/schedules`**：后台创建预告，首页与 `/live` 显示倒计时；新增「开始台网」按钮到点一键开始。
- 🎨 实况大屏 `/live` 与后台页 UI 美化，信息更突出。
- 🛠 修复主控轮值表 `controllers` 字段回归（连同返回类型注解）。
- 🔐 修复后台权限：前台「查看历史台网」按钮缺少 admin 守卫，普通主控误入 `/admin` 页面导致浏览器显示裸 JSON「无权限进入」；`middleware` 后台页面路径非管理员访问改为重定向回首页（接口路径仍返回 403 JSON）。

> ⚠️ **注意：v1.5.12 含数据库表结构变更**，升级必须执行迁移（详见 `docs/05-deployment.md` 坑 9）：
> 1. 新增 `audit_logs` 表；
> 2. `log_sessions`、`log_records` 各新增 `deleted_at` 字段（`timestamptz`，可空）。
>
> 迁移 SQL（幂等）：
> ```sql
> CREATE TABLE IF NOT EXISTS audit_logs (
>   id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
>   user_id varchar(36), username varchar(50),
>   action varchar(30) NOT NULL, entity_type varchar(20) NOT NULL,
>   entity_id varchar(36) NOT NULL, detail text,
>   created_at timestamptz DEFAULT now() NOT NULL
> );
> ALTER TABLE log_sessions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
> ALTER TABLE log_records  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
> ```
> 迁移后部署，数据库 `page_configs.version` 由后台「版本更新」检测自动同步为 `1.5.12`（或手动 upsert）。

## v1.5.11 (2026-08-18)

**🛠 角色修复 + 配置对标 + 实况大屏**

- 🛠 修复后台「原有主控人员调整为管理员」功能无效：根因为 `updateUserSchema.pick` 遗漏 `role` 字段，zod 校验将角色字段剥离导致写入不生效。已在 `src/storage/database/shared/schema.ts` 补回 `role`，管理员角色写入恢复正常。
- 📋 后台页面配置（`page_configs`）全面对标正式站：测试站补齐**证书设置、首页设置、登录页设置、会话详情页配置**四类共 11 条配置，与正式站一致（原本测试站仅有「通用配置」2 条）。
- 🌐 版本更新检测改为**联机拉取 GitHub 官方清单**（启用 `UPGRADE_MANIFEST_URL` 指向 `raw.githubusercontent.com/.../main/version/upgrade-manifest.json`），检测信息与正式站完全一致；移除测试站专属的旧版 `public/version/upgrade-manifest.json`。
- ✨ 新增**实况大屏 `/live` 页面**：SSE 实时滚动在网呼号与最新记录。
- 🔧 新增调试接口 `/api/debug` 与会话详情接口 `/api/sessions/[sessionId]`。
- 🎨 优化登出逻辑与前台/后台布局。
- 📌 版本号同步项：`version/upgrade-manifest.json` 的 `latest` → `1.5.11`、`src/lib/version.ts` 的 `CODE_VERSION` → `1.5.11`、`package.json` 的 `version` → `1.5.11`（之前该字段停留在 `1.5.8`，本次一并修正）。

> ⚠️ 注意：v1.5.11 **未改动数据库表结构**（配置数据由后台初始化接口补齐，无新增/修改字段），升级只需拉代码 + 重新构建部署即可，无需执行额外表迁移；部署后数据库 `page_configs.version` 由后台「版本更新」检测自动同步为 `1.5.11`。

## v1.5.10 (2026-08-15)

**🐛 彻底修复提交重复数据**

- 🐛 修复「台网记录提交时同时出现两组相同数据、重新进入后消失」的问题：在客户端所有记录插入/合并点引入 `dedupeRecords` 按 `id` 唯一性兜底，覆盖提交响应与 SSE 实时回声的任意到达时序。
- 🔧 原 v1.5.7 的去重逻辑（依赖两处各自判断 `prev` 快照）存在竞态缝隙，本次升级为统一的物理唯一键去重，确保 UI 层永不渲染重复条目。
- 🗄 数据库层记录写入本身始终为单条，重复仅存在于前端展示，重新进入台网（全量重拉）即消失的现象与此一致。

> ⚠️ 注意：v1.5.10 **未改动数据库表结构**（与 v1.5.9 一致），升级只需拉代码 + 重新构建部署即可，无需执行额外表迁移。

## v1.5.9 (2026-08-14)

**📜 证书配置后台化 + 防缓存修复 + 呼号查询免登录**

- ✨ **证书签发单位 / 签发机构后台可配置**：新增 `cert_sign_unit`（证书标题处单位）与 `cert_sign_org`（证书底部签发机构）两个页面配置项，可在后台「页面配置管理」中修改，实时生效。
- 🛠 **修复证书名称不生效（根因：客户端 JS 缓存）**：原实现依赖前端 `fetch('/api/page-configs')` 取配置，浏览器若缓存旧版 JS chunk 则永远显示写死保底值。现改为在 `query/layout.tsx`（服务端组件，`force-dynamic`）**直读数据库**并经 Client Provider（`certConfig.tsx`）注入 RSC payload，配置随每次请求服务端实时下发，**不再依赖任何客户端 fetch / 浏览器 JS 缓存**。
- 🔓 **呼号查询页免登录公开访问**：`/query` 路由未加入 middleware 受保护路径，前台呼号查询与生成证书无需登录即可使用；同时前台页面（非 `/api`）响应头统一加 `no-store` 防止后台配置改动后仍显示旧版。
- 🔽 **呼号参与查询降序排列**：用户查询返回的参与记录按日期降序排列（最新在前）。
- 📄 版本更新页「当前已是最新版本」下方新增「当前版本更新日志」展示。

> ⚠️ 注意：v1.5.9 **未改动数据库表结构**（证书配置复用既有 `page_configs` 表，新增 key 由后台初始化接口补齐），升级只需拉代码 + 重新构建部署即可，无需执行额外表迁移。

## v1.5.8 (2026-08-13)

**🔒 台网日期唯一约束（新增业务规则）**

- 🔒 新增**台网日期唯一约束**：以**北京时间日期**为唯一键，**同一天仅允许一场台网**。当天已存在台网时，再次创建（无论是后台「台网历史管理」指定日期新建，还是前台「台网记录信息录入」实时建台网）将被拒绝，返回 `409` 并提示「该日期台网已存在，请到台网历史管理中修改已有的台网记录」，同时返回 `existingSessionId` 便于前端跳转修改。
- 🔒 历史台网导入的数据与实时记录统一存入 `log_records` 表，按 `(session_id + 呼号)` 区分；导入台网记录前须先有当天台网会话，已存在则只能修改，避免重复录入。
- 🛠 新增 `LogManager.findSessionByBeijingDate(date)`：按 `DATE(session_time AT TIME ZONE 'Asia/Shanghai')` 查重，全站统一以北京时间判定「同一天」。
- ✅ 验证：同日期第二次创建返回拦截提示，跨日期创建正常放行。

> ⚠️ 注意：v1.5.8 **未改动数据库表结构**（仅新增服务端查重逻辑，无新增/修改字段），升级只需拉代码 + 重新构建部署即可，无需执行额外表迁移。后续若需支持「一天多场台网」，再扩展判定键（如日期+主控/时段）。

## v1.5.7 (2026-08-13)

**🐛 BUG 修复（紧急）**

- 🐛 修复 **录入台网记录时列表瞬间出现连续两条相同记录**：根因为前端本地乐观更新插入一次 + SSE 回声又插入一次（id 相同）。现前端在两处插入逻辑均按 `id` 去重，确保列表只出现一条。
- 🐛 修复 **呼号查询结果（按录入时间归类）与后台历史台网（按台网时间归类）不符**：呼号查询原按 `record.createdAt` 归类与过滤，导致旧台网记录在被导入当天被算入当日。现呼号查询改为按 `session_time`（台网时间）归类与过滤，与后台历史口径一致。

**📌 本次版本同步项**

- `version/upgrade-manifest.json` 的 `latest` 改为 `1.5.7`
- `src/lib/version.ts` 的 `CODE_VERSION` 改为 `1.5.7`
- `package.json` 的 `version` 改为 `1.5.7`
- 数据库 `page_configs.version` 部署后由后台「版本更新」检测自动同步为 `1.5.7`（无需手动 SQL）

> ⚠️ 注意：v1.5.7 **未改动数据库表结构**（无新增/修改字段），升级只需拉代码 + 重新构建部署即可，无需执行额外表迁移。

## v1.5.6 (2026-08-13)

**🔔 后台版本检测**

- ✨ 新增**后台「版本更新」菜单**：管理员可在后台一键检测是否有新版本
- 🔒 **版本号改为数据库存储且后台只读**：页面配置中 `version` 项仅展示、不可手动修改，避免误改；数据库连接异常时回退显示 `1.1.0`
- 🌐 **远程版本清单比对**：检测接口读取远程 `version/upgrade-manifest.json`（可经 `UPGRADE_MANIFEST_URL` 指向 GitHub raw 地址），与数据库当前版本比对，展示更新日志与仓库地址
- 🔄 **代码更新后自动同步版本号**：当管理员已把程序代码更新到与远程清单一致（`CODE_VERSION >= latest`），但数据库 `version` 仍落后时，检测接口会自动将数据库 `version` 回写为最新版，避免一直提示有新版本
- 📝 仓库新增 `version/` 目录专门存放版本清单；发版时需同步：① `version/upgrade-manifest.json` 的 `latest`/`changelog` ② `src/lib/version.ts` 的 `CODE_VERSION` ③ 部署后数据库 `page_configs.version` 会自动同步

## v1.5.5 (2026-08-10)

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

## v1.5.1 (2026-08-10)

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

## v1.5.0 (2026-08-06)
- ✨ 新增**设备库管理**：独立管理设备名称，支持增删改查、批量导入导出
- ✨ 新增**从历史记录导入设备**：一键同步历史台网中的设备名称到设备库
- ✨ 新增**设备自动同步**：台网录入时自动将新设备添加到设备库
- ✨ 新增**设备智能补全**：录入设备时从设备库和历史记录中获取补全建议
- ✨ 新增**台网历史管理**：管理员可修改任意历史记录、指定日期新增记录
- ✨ 新增**历史数据导入导出**：支持从 Excel 批量导入台网记录到指定会话
- 🔧 优化权限控制：管理员操作不受6小时过期限制

## v1.4.0 (2026-02-12)
- ✨ 将主页底部的"台网统计"和"管理工具"按钮移至顶部Header
- ✨ 优化用户管理界面，所有操作改为弹窗模式
- 🐛 修复登录API密码验证逻辑错误
- 🐛 修复用户管理输入框字体颜色问题
- 🔧 全站数据检查和优化
- 📝 更新文档

## v1.3.0 (2026-02-12)
- ✨ 新增用户管理弹窗式编辑功能
- ✨ 优化输入框字体颜色（黑色）
- 🔧 修复密码输入框代码结构错误
- 🐛 修复编辑用户功能问题

## v1.2.0 (2026-02-12)
- ✨ 新增管理后台页面配置管理功能
- ✨ 新增 AdminLayout 组件，实现左右布局及菜单收缩功能
- ✨ 新增管理后台权限控制
- 🔧 优化用户管理界面

## v1.1.0 (2026-02-12)
- ✨ 新增台网统计页面
- ✨ 新增管理工具页面
- ✨ 新增呼号查询页面
- ✨ 新增Excel导出功能（带样式）
- ✨ 新增参与人员库管理
- 🔧 优化用户界面和交互

## v1.0.0 (2026-01-09)
- 🎉 初始版本发布
- ✨ 基础用户认证和权限管理
- ✨ 台网会话管理
- ✨ 台网记录录入
- ✨ 实时协作（SSE）
- ✨ 会话自动过期功能
- ✨ 北京时间统一显示

---

[← 返回文档首页](../README.md)
