// @version v1.5.22
import { desc, eq, and, sql, type SQL } from "drizzle-orm"
import { randomInt } from "crypto"
import { getDb } from "./db"
import { wechatBindCodes, insertWechatBindCodeSchema } from "./shared/schema"
import type { WechatBindCode, InsertWechatBindCode } from "./shared/schema"

// [v1.5.21 微信推送] 幂等建表（同 loginLogManager 模式）
let ensurePromise: Promise<void> | null = null

async function ensureTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const db = await getDb()
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS wechat_bind_codes (
          id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          callsign varchar(20) NOT NULL,
          code varchar(32) NOT NULL,
          status varchar(20) NOT NULL DEFAULT 'active',
          expires_at timestamp with time zone,
          used_by varchar(64),
          used_at timestamp with time zone,
          created_by varchar(36),
          created_at timestamp with time zone DEFAULT now() NOT NULL
        )
      `)
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS wechat_bind_codes_callsign_idx ON wechat_bind_codes (callsign)`
      )
      await db.execute(
        sql`CREATE UNIQUE INDEX IF NOT EXISTS wechat_bind_codes_code_idx ON wechat_bind_codes (code)`
      )
    })().catch((error) => {
      ensurePromise = null
      throw error
    })
  }
  return ensurePromise
}

/** 生成随机数字绑定码（避免 0/O、1/I 等易混淆字符的场景下用纯数字最稳） */
function randomCode(length: number): string {
  const len = Math.min(Math.max(length, 4), 12)
  let out = ""
  for (let i = 0; i < len; i++) {
    out += randomInt(0, 10).toString()
  }
  return out
}

export class WechatBindCodesManager {
  /**
   * 批量为呼号生成绑定码（每个呼号一个码）。
   * 返回含明文 code 的记录，供后台展示与导出。
   */
  async generateMany(params: {
    callsigns: string[]
    length?: number
    hours?: number
    createdBy?: string
  }): Promise<WechatBindCode[]> {
    await ensureTable()
    const db = await getDb()

    const {
      callsigns,
      length = 6,
      hours = 24,
      createdBy,
    } = params

    const clean = Array.from(
      new Set(
        callsigns
          .map((c) => c.trim().toUpperCase())
          .filter((c) => c.length > 0)
      )
    )
    if (clean.length === 0) return []

    const rows: InsertWechatBindCode[] = clean.map((callsign) => ({
      callsign,
      code: randomCode(length),
      status: "active",
      // hours <= 0 表示长期有效（不设过期时间）
      expiresAt: hours > 0 ? new Date(Date.now() + hours * 3600 * 1000) : null,
      createdBy: createdBy ?? null,
    }))

    const inserted = await db
      .insert(wechatBindCodes)
      .values(rows.map((r) => insertWechatBindCodeSchema.parse(r)))
      .returning()

    return inserted
  }

  /**
   * 校验「呼号 + 绑定码」是否有效。
   * 条件：码存在且状态 active、呼号匹配、未过期。
   */
  async verify(
    callsign: string,
    code: string
  ): Promise<WechatBindCode | null> {
    await ensureTable()
    const db = await getDb()
    const [row] = await db
      .select()
      .from(wechatBindCodes)
      .where(
        and(
          eq(wechatBindCodes.callsign, callsign),
          eq(wechatBindCodes.code, code),
          eq(wechatBindCodes.status, "active")
        )
      )
      .limit(1)

    if (!row) return null
    // 过期判定放在应用层，便于对不同时区部署保持一致
    if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
      return null
    }
    return row
  }

  /** 标记码已被使用（绑定成功后调用） */
  async markUsed(id: string, openid: string): Promise<void> {
    await ensureTable()
    const db = await getDb()
    await db
      .update(wechatBindCodes)
      .set({ status: "used", usedBy: openid, usedAt: new Date() })
      .where(eq(wechatBindCodes.id, id))
  }

  /** 作废（管理员手动失效某个码） */
  async disable(id: string): Promise<boolean> {
    await ensureTable()
    const db = await getDb()
    const rows = await db
      .update(wechatBindCodes)
      .set({ status: "disabled" })
      .where(eq(wechatBindCodes.id, id))
      .returning({ id: wechatBindCodes.id })
    return rows.length > 0
  }

  async list(
    options: { limit?: number; offset?: number; callsign?: string; status?: string } = {}
  ): Promise<{ items: WechatBindCode[]; total: number }> {
    const { limit = 100, offset = 0, callsign, status } = options
    await ensureTable()
    const db = await getDb()

    const conditions: SQL[] = []
    if (callsign) {
      conditions.push(sql`${wechatBindCodes.callsign} ILIKE ${`%${callsign}%`}`)
    }
    if (status) conditions.push(eq(wechatBindCodes.status, status))
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const items = await db
      .select()
      .from(wechatBindCodes)
      .where(where)
      .orderBy(desc(wechatBindCodes.createdAt))
      .limit(limit)
      .offset(offset)

    const [agg] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wechatBindCodes)
      .where(where)

    return { items, total: agg?.count ?? 0 }
  }
}

export const wechatBindCodesManager = new WechatBindCodesManager()
