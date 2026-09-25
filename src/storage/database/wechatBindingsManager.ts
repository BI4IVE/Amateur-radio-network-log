// @version v1.5.25
import { desc, eq, and, sql, type SQL } from "drizzle-orm"
import { getDb } from "./db"
import { wechatBindings, insertWechatBindingSchema } from "./shared/schema"
import type { WechatBinding, InsertWechatBinding } from "./shared/schema"

/**
 * 绑定状态：
 * - active   已生效（可接收推送）
 * - pending  待管理员审核（绑定方式 = manual 时提交后会处于该状态）
 * - rejected 审核被拒绝
 * - inactive 已失效（用户解绑或取关）
 */
export type WechatBindStatus = "active" | "inactive" | "pending" | "rejected"

// [v1.5.21 微信推送] 幂等建表：tar 覆盖部署无 db:push 步骤，
// 首次使用时确保表存在。用模块级 Promise 缓存，避免每次调用都执行 DDL。
let ensurePromise: Promise<void> | null = null

async function ensureTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const db = await getDb()
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS wechat_bindings (
          id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          openid varchar(64) NOT NULL,
          callsign varchar(20) NOT NULL,
          unionid varchar(64),
          status varchar(20) NOT NULL DEFAULT 'active',
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now() NOT NULL
        )
      `)
      // 一个微信只绑一个呼号（1:1 由 openid 唯一约束保证）
      await db.execute(
        sql`CREATE UNIQUE INDEX IF NOT EXISTS wechat_bindings_openid_idx ON wechat_bindings (openid)`
      )
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS wechat_bindings_callsign_idx ON wechat_bindings (callsign)`
      )
      // 兼容历史遗留表：早期版本建过同名表但结构不同（例如用 bound_at/unbound_at、缺 updated_at）。
      // CREATE TABLE IF NOT EXISTS 对已存在的表不会做任何修改，
      // 因此这里逐列补齐新代码依赖的列（幂等，不删数据）。
      await db.execute(
        sql`ALTER TABLE wechat_bindings ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now()`
      )
      await db.execute(
        sql`ALTER TABLE wechat_bindings ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now()`
      )
      await db.execute(
        sql`ALTER TABLE wechat_bindings ADD COLUMN IF NOT EXISTS unionid varchar(64)`
      )
      await db.execute(
        sql`ALTER TABLE wechat_bindings ADD COLUMN IF NOT EXISTS callsign varchar(20)`
      )
    })().catch((error) => {
      // 失败则清空缓存，允许下次重试
      ensurePromise = null
      throw error
    })
  }
  return ensurePromise
}

export class WechatBindingsManager {
  /**
   * 绑定呼号。同一 openid 重复提交则覆盖更新呼号，
   * 保证「1 个微信只绑 1 个呼号」；一个呼号可被多个微信绑定。
   */
  async bind(data: InsertWechatBinding): Promise<WechatBinding> {
    await ensureTable()
    const db = await getDb()
    const validated = insertWechatBindingSchema.parse(data)
    const [row] = await db
      .insert(wechatBindings)
      .values({
        ...validated,
        status: validated.status ?? "active",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: wechatBindings.openid,
        set: {
          callsign: validated.callsign,
          unionid: validated.unionid ?? null,
          // 必须使用传入的 status：硬编码 "active" 会让「人工审核」方式下
          // 用户重复提交直接变成已生效，从而绕过管理员审核
          status: validated.status ?? "active",
          updatedAt: new Date(),
        },
      })
      .returning()
    return row
  }

  async getByOpenid(openid: string): Promise<WechatBinding | null> {
    await ensureTable()
    const db = await getDb()
    const [row] = await db
      .select()
      .from(wechatBindings)
      .where(eq(wechatBindings.openid, openid))
    return row || null
  }

  /** 按呼号查全部有效绑定（推送时对该呼号的所有绑定者发送） */
  async listActiveByCallsign(callsign: string): Promise<WechatBinding[]> {
    await ensureTable()
    const db = await getDb()
    return db
      .select()
      .from(wechatBindings)
      .where(
        and(
          eq(wechatBindings.callsign, callsign),
          eq(wechatBindings.status, "active")
        )
      )
  }

  /**
   * 修改绑定状态（解绑、取关失效、审核通过/拒绝都走这里）。
   * 保留记录而非物理删除，便于后续追溯与重新激活。
   */
  async setStatus(
    openid: string,
    status: WechatBindStatus
  ): Promise<boolean> {
    await ensureTable()
    const db = await getDb()
    const rows = await db
      .update(wechatBindings)
      .set({ status, updatedAt: new Date() })
      .where(eq(wechatBindings.openid, openid))
      .returning({ id: wechatBindings.id })
    return rows.length > 0
  }

  async unbind(openid: string): Promise<boolean> {
    return this.setStatus(openid, "inactive")
  }

  /** 按状态查绑定列表（后台审核页用 pending，管理页用 active/inactive） */
  async listByStatus(
    status: WechatBindStatus,
    options: { limit?: number; offset?: number; callsign?: string } = {}
  ): Promise<{ items: WechatBinding[]; total: number }> {
    const { limit = 50, offset = 0, callsign } = options
    await ensureTable()
    const db = await getDb()
    const conditions: SQL[] = [eq(wechatBindings.status, status)]
    if (callsign) {
      conditions.push(sql`${wechatBindings.callsign} ILIKE ${`%${callsign}%`}`)
    }
    const where = and(...conditions)

    const items = await db
      .select()
      .from(wechatBindings)
      .where(where)
      .orderBy(desc(wechatBindings.createdAt))
      .limit(limit)
      .offset(offset)

    const [agg] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wechatBindings)
      .where(where)

    return { items, total: agg?.count ?? 0 }
  }

  /** 审核：通过置为 active，拒绝置为 rejected */
  async review(openid: string, approve: boolean): Promise<boolean> {
    return this.setStatus(openid, approve ? "active" : "rejected")
  }

  /** 管理员修改某 openid 绑定的呼号（用户不自助改，防止冒绑） */
  async updateCallsign(openid: string, callsign: string): Promise<boolean> {
    await ensureTable()
    const db = await getDb()
    const rows = await db
      .update(wechatBindings)
      .set({ callsign: callsign.trim().toUpperCase(), updatedAt: new Date() })
      .where(eq(wechatBindings.openid, openid))
      .returning({ id: wechatBindings.id })
    return rows.length > 0
  }

  /** 后台绑定管理列表，支持按呼号模糊搜索 */
  async list(
    options: { limit?: number; offset?: number; callsign?: string } = {}
  ): Promise<{ items: WechatBinding[]; total: number }> {
    const { limit = 50, offset = 0, callsign } = options
    await ensureTable()
    const db = await getDb()

    const conditions: SQL[] = []
    if (callsign) {
      conditions.push(sql`${wechatBindings.callsign} ILIKE ${`%${callsign}%`}`)
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const items = await db
      .select()
      .from(wechatBindings)
      .where(where)
      .orderBy(desc(wechatBindings.createdAt))
      .limit(limit)
      .offset(offset)

    const [agg] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wechatBindings)
      .where(where)

    return { items, total: agg?.count ?? 0 }
  }
}

export const wechatBindingsManager = new WechatBindingsManager()
