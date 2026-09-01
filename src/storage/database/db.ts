// @version v1.5.20
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./shared/schema"

// 本地/宝塔部署用的 PostgreSQL 连接（替代 coze-coding-dev-sdk 的 getDb）
// 连接串从环境变量 DATABASE_URL 读取
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("[db] 缺少环境变量 DATABASE_URL，请先配置后再启动")
}

const pool = new Pool({
  connectionString,
  // 必要时取消下方注释以允许自签证书
  // ssl: { rejectUnauthorized: false },
})

export const db = drizzle(pool, { schema })

// 与原 SDK 保持相同签名，方便全项目无缝替换
export const getDb = () => db
