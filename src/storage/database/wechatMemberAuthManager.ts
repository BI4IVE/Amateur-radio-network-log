// @version v1.5.22
import { desc, eq, and, sql, type SQL } from "drizzle-orm"
import { getDb } from "./db"
import { wechatMemberAuth, insertWechatMemberAuthSchema } from "./shared/schema"
import type { WechatMemberAuth, InsertWechatMemberAuth } from "./shared/schema"

// [v1.5.21 微信推送] 幂等建表（同 loginLogManager 模式）
let ensurePromise: Promise<void> | null = null

async function ensureTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const db = await getDb()
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS wechat_member_auth (
          id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          callsign varchar(20) NOT NULL,
          id_hash varchar(64) NOT NULL,
          name varchar(50),
          imported_by varchar(36),
          imported_at timestamp with time zone DEFAULT now() NOT NULL
        )
      `)
      await db.execute(
        sql`CREATE UNIQUE INDEX IF NOT EXISTS wechat_member_auth_callsign_idx ON wechat_member_auth (callsign)`
      )
      // 兼容历史遗留表：逐列补齐（幂等，不删数据）
      await db.execute(
        sql`ALTER TABLE wechat_member_auth ADD COLUMN IF NOT EXISTS id_hash varchar(64)`
      )
      await db.execute(
        sql`ALTER TABLE wechat_member_auth ADD COLUMN IF NOT EXISTS name varchar(50)`
      )
      await db.execute(
        sql`ALTER TABLE wechat_member_auth ADD COLUMN IF NOT EXISTS imported_by varchar(36)`
      )
      await db.execute(
        sql`ALTER TABLE wechat_member_auth ADD COLUMN IF NOT EXISTS imported_at timestamp with time zone DEFAULT now()`
      )
      await db.execute(
        sql`ALTER TABLE wechat_member_auth ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now()`
      )
    })().catch((error) => {
      ensurePromise = null
      throw error
    })
  }
  return ensurePromise
}

export class WechatMemberAuthManager {
  /**
   * 批量导入会员对照表。
   * 调用方需预先把「身份证后六位」算成 sha256(后六位 + SALT) 哈希，
   * 原始后六位与本表都不落库明文。
   * 按 callsign 冲突覆盖更新，返回导入条数。
   */
  async importRows(
    rows: InsertWechatMemberAuth[],
    importedBy?: string
  ): Promise<number> {
    if (rows.length === 0) return 0
    await ensureTable()
    const db = await getDb()

    const values = rows.map((r) =>
      insertWechatMemberAuthSchema.parse({
        ...r,
        importedBy: r.importedBy ?? importedBy ?? null,
      })
    )

    const result = await db
      .insert(wechatMemberAuth)
      .values(values)
      .onConflictDoUpdate({
        target: wechatMemberAuth.callsign,
        set: {
          idHash: sql`excluded.id_hash`,
          name: sql`excluded.name`,
          importedBy: sql`excluded.imported_by`,
          importedAt: sql`now()`,
        },
      })
      .returning({ id: wechatMemberAuth.id })

    return result.length
  }

  /**
   * 校验「呼号 + 身份证后六位哈希」是否匹配。
   * 只返回布尔值——调用方不得据此提示是哪一项错误，防枚举。
   */
  async verify(callsign: string, idHash: string): Promise<boolean> {
    await ensureTable()
    const db = await getDb()
    const [row] = await db
      .select({ id: wechatMemberAuth.id })
      .from(wechatMemberAuth)
      .where(
        and(
          eq(wechatMemberAuth.callsign, callsign),
          eq(wechatMemberAuth.idHash, idHash)
        )
      )
      .limit(1)
    return Boolean(row)
  }

  async list(
    options: { limit?: number; offset?: number; callsign?: string } = {}
  ): Promise<{ items: WechatMemberAuth[]; total: number }> {
    const { limit = 50, offset = 0, callsign } = options
    await ensureTable()
    const db = await getDb()

    const conditions: SQL[] = []
    if (callsign) {
      conditions.push(
        sql`${wechatMemberAuth.callsign} ILIKE ${`%${callsign}%`}`
      )
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const items = await db
      .select()
      .from(wechatMemberAuth)
      .where(where)
      .orderBy(desc(wechatMemberAuth.importedAt))
      .limit(limit)
      .offset(offset)

    const [agg] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wechatMemberAuth)
      .where(where)

    return { items, total: agg?.count ?? 0 }
  }

  async removeByCallsign(callsign: string): Promise<boolean> {
    await ensureTable()
    const db = await getDb()
    const rows = await db
      .delete(wechatMemberAuth)
      .where(eq(wechatMemberAuth.callsign, callsign))
      .returning({ id: wechatMemberAuth.id })
    return rows.length > 0
  }
}

export const wechatMemberAuthManager = new WechatMemberAuthManager()
