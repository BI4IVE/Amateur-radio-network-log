// @version v1.5.25
import { desc, eq, and, sql, type SQL } from "drizzle-orm"
import { getDb } from "./db"
import { wechatPushLog, insertWechatPushLogSchema } from "./shared/schema"
import type { WechatPushLog, InsertWechatPushLog } from "./shared/schema"

// [v1.5.21 微信推送] 幂等建表（同 loginLogManager 模式）
let ensurePromise: Promise<void> | null = null

async function ensureTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const db = await getDb()
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS wechat_push_log (
          id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          callsign varchar(20),
          openid varchar(64),
          session_id varchar(36),
          record_id varchar(36),
          status varchar(20) NOT NULL,
          errcode integer,
          errmsg varchar(200),
          msgid varchar(64),
          created_at timestamp with time zone DEFAULT now() NOT NULL
        )
      `)
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS wechat_push_log_created_at_idx ON wechat_push_log (created_at DESC)`
      )
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS wechat_push_log_callsign_idx ON wechat_push_log (callsign)`
      )
      // 兼容历史遗留表：逐列补齐（幂等，不删数据）
      await db.execute(
        sql`ALTER TABLE wechat_push_log ADD COLUMN IF NOT EXISTS callsign varchar(20)`
      )
      await db.execute(
        sql`ALTER TABLE wechat_push_log ADD COLUMN IF NOT EXISTS openid varchar(64)`
      )
      await db.execute(
        sql`ALTER TABLE wechat_push_log ADD COLUMN IF NOT EXISTS session_id varchar(36)`
      )
      await db.execute(
        sql`ALTER TABLE wechat_push_log ADD COLUMN IF NOT EXISTS record_id varchar(36)`
      )
      await db.execute(
        sql`ALTER TABLE wechat_push_log ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'success'`
      )
      await db.execute(
        sql`ALTER TABLE wechat_push_log ADD COLUMN IF NOT EXISTS errcode integer`
      )
      await db.execute(
        sql`ALTER TABLE wechat_push_log ADD COLUMN IF NOT EXISTS errmsg varchar(200)`
      )
      await db.execute(
        sql`ALTER TABLE wechat_push_log ADD COLUMN IF NOT EXISTS msgid varchar(64)`
      )
      await db.execute(
        sql`ALTER TABLE wechat_push_log ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now()`
      )
    })().catch((error) => {
      ensurePromise = null
      throw error
    })
  }
  return ensurePromise
}

export class WechatPushLogManager {
  /**
   * 写入一条推送留痕。**永不抛出**——推送日志失败绝不能影响记录提交主流程。
   */
  async write(data: InsertWechatPushLog): Promise<void> {
    try {
      await ensureTable()
      const db = await getDb()
      const validated = insertWechatPushLogSchema.parse(data)
      await db.insert(wechatPushLog).values(validated)
    } catch (error) {
      console.error("[wechatPushLog] 写入推送日志失败（已忽略）:", error)
    }
  }

  /**
   * 同一场次 + 同一呼号是否已成功推送过。
   * 用于「同场次同呼号只推一次」去重——主控修改记录时不重复打扰用户。
   */
  async hasPushed(sessionId: string, callsign: string): Promise<boolean> {
    await ensureTable()
    const db = await getDb()
    const [row] = await db
      .select({ id: wechatPushLog.id })
      .from(wechatPushLog)
      .where(
        and(
          eq(wechatPushLog.sessionId, sessionId),
          eq(wechatPushLog.callsign, callsign),
          eq(wechatPushLog.status, "success")
        )
      )
      .limit(1)
    return Boolean(row)
  }

  async list(
    options: {
      limit?: number
      offset?: number
      callsign?: string
      status?: string
    } = {}
  ): Promise<{ logs: WechatPushLog[]; total: number }> {
    const { limit = 100, offset = 0, callsign, status } = options
    await ensureTable()
    const db = await getDb()

    const conditions: SQL[] = []
    if (callsign) conditions.push(eq(wechatPushLog.callsign, callsign))
    if (status) conditions.push(eq(wechatPushLog.status, status))
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const logs = await db
      .select()
      .from(wechatPushLog)
      .where(where)
      .orderBy(desc(wechatPushLog.createdAt))
      .limit(limit)
      .offset(offset)

    const [agg] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wechatPushLog)
      .where(where)

    return { logs, total: agg?.count ?? 0 }
  }
}

export const wechatPushLogManager = new WechatPushLogManager()
