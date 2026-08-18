[← 部署指南](05-deployment.md) · [使用文档 →](07-usage.md)

# 更新方式

本项目部署只拉取 `main` 分支，升级即「拉最新代码 → 重新构建 → 同步版本号」。按是否涉及数据库表结构变更，分两种方式。

## 一、不涉及数据库表结构变更（纯代码更新）

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

## 二、涉及数据库表结构变更（含表/字段迁移）

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

## 三、发版三处版本源必须一致

每次发版（无论是否涉及表变更），以下三处版本号必须同步为同一值，否则后台会一直误报有新版本：

| # | 位置 | 字段/变量 | 说明 |
|---|------|-----------|------|
| 1 | `version/upgrade-manifest.json` | `latest` | 远程最新版（检测基准），提交到 GitHub `main` |
| 2 | `src/lib/version.ts` | `CODE_VERSION` | 当前部署代码版本 |
| 3 | 数据库 `page_configs` (key=`version`) | `value` | 线上实际运行版本，**部署后由后台检测自动同步**，一般不手动改 |

> 部署完成后，务必登录后台「版本更新」点一次检测，确认 `hasUpdate=false`、当前版本与 `latest` 一致。

## 四、回滚

若新版异常需回退：
```bash
git log --oneline -5        # 找到上一个稳定提交哈希
git checkout <旧提交哈希>   # 或 git revert
pnpm install && pnpm build && pm2 restart radio-log
```
- 若涉及表结构变更且已 `db:push`，回滚代码后表结构**不会自动回退**，需用第 1 步的备份 `pg_restore` 恢复（或手动反向迁移）。故表变更前备份尤其重要。

---

[← 返回文档首页](../README.md)
