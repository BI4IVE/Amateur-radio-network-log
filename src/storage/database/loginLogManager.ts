// @version v1.5.20
import { desc, eq, and, sql, lt, type SQL } from "drizzle-orm"
import { getDb } from "./db"
import { loginLogs, insertLoginLogSchema } from "./shared/schema"
import type { LoginLog, InsertLoginLog } from "./shared/schema"

// 幂等建表：测试站走 tar 覆盖部署，没有 db:push 迁移步骤，
// 因此首次使用时确保表存在。用模块级 Promise 缓存，避免每次登录都执行 DDL。
let ensurePromise: Promise<void> | null = null

async function ensureTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const db = await getDb()
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS login_logs (
          id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id varchar(36),
          username varchar(50),
          success boolean NOT NULL DEFAULT false,
          reason varchar(100),
          ip varchar(64),
          user_agent varchar(500),
          location varchar(100),
          created_at timestamp with time zone DEFAULT now() NOT NULL
        )
      `)
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS login_logs_created_at_idx ON login_logs (created_at DESC)`
      )
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS login_logs_user_id_idx ON login_logs (user_id)`
      )
    })().catch((error) => {
      // 失败则清空缓存，允许下次重试
      ensurePromise = null
      throw error
    })
  }
  return ensurePromise
}

export class LoginLogManager {
  /**
   * 写入一条登录日志。**永不抛出**——日志写入失败绝不能影响登录流程，
   * 否则一个日志 bug 会把所有人锁在门外。
   */
  async write(data: InsertLoginLog): Promise<void> {
    try {
      await ensureTable()
      const db = await getDb()
      const validated = insertLoginLogSchema.parse(data)
      await db.insert(loginLogs).values(validated)
    } catch (error) {
      console.error("[loginLog] 写入登录日志失败（已忽略，不影响登录）:", error)
    }
  }

  /** 查询登录日志（倒序），支持按用户与成功/失败过滤 */
  async list(
    options: { limit?: number; offset?: number; userId?: string; success?: boolean } = {}
  ): Promise<{ logs: LoginLog[]; total: number }> {
    const { limit = 100, offset = 0, userId, success } = options
    await ensureTable()
    const db = await getDb()

    const conditions: SQL[] = []
    if (userId) conditions.push(eq(loginLogs.userId, userId))
    if (success !== undefined) conditions.push(eq(loginLogs.success, success))
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db
      .select()
      .from(loginLogs)
      .where(where)
      .orderBy(desc(loginLogs.createdAt))
      .limit(limit)
      .offset(offset)

    const [agg] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(loginLogs)
      .where(where)

    return { logs: rows, total: agg?.count ?? 0 }
  }

  /** 清理 N 天前的记录，返回删除条数 */
  async purgeOlderThan(days: number): Promise<number> {
    await ensureTable()
    const db = await getDb()
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const deleted = await db
      .delete(loginLogs)
      .where(lt(loginLogs.createdAt, cutoff))
      .returning({ id: loginLogs.id })
    return deleted.length
  }
}

export const loginLogManager = new LoginLogManager()
