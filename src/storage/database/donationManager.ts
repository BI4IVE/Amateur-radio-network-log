// @version v2.0.6
import { sql } from "drizzle-orm"
import { getDb } from "./db"

/**
 * 支持记录（赞助 / 物资 / 场地）
 *
 * 说明：
 * - 项目用 tar 覆盖部署、没有 db:push，所以建表必须在这里幂等完成；
 * - 金额入库保存（供后台对账），但对外只返回最近一年的金额，更早的返回 null；
 * - 档位按"次数"算，与金额无关。
 */
let ensurePromise: Promise<void> | null = null

async function ensureTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const db = await getDb()
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS donations (
          id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          callsign varchar(20) NOT NULL,
          amount numeric(10, 2),
          donated_at date NOT NULL,
          channel varchar(30),
          note varchar(120),
          anonymous boolean DEFAULT false NOT NULL,
          created_by varchar(20),
          created_at timestamp with time zone DEFAULT now() NOT NULL
        )
      `)
      // [v2.0.6] kind 区分「个人捐助」与「汇总/其他收入」：
      // 感谢墙与个人中心只认 person，后台账目两者都算。
      await db.execute(
        sql`ALTER TABLE donations ADD COLUMN IF NOT EXISTS kind varchar(20) DEFAULT 'person' NOT NULL`
      )
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS donations_callsign_idx ON donations (upper(trim(callsign)))`
      )
      await db.execute(sql`CREATE INDEX IF NOT EXISTS donations_date_idx ON donations (donated_at DESC)`)
    })().catch((error) => {
      ensurePromise = null
      throw error
    })
  }
  return ensurePromise
}

export type DonationRecord = {
  id: string
  callsign: string
  /** 原始金额（字符串，避免浮点误差）；可能为 null（物资） */
  amount: string | null
  /** yyyy-MM-dd */
  donatedAt: string
  channel: string | null
  note: string | null
  anonymous: boolean
  /** person = 个人捐助；aggregate = 汇总/其他收入（不上感谢墙） */
  kind: string
  createdBy: string | null
  createdAt: string
}

type RawRow = Record<string, unknown>

function toRecord(row: RawRow): DonationRecord {
  const date =
    row.donated_at instanceof Date
      ? (row.donated_at as Date).toISOString().slice(0, 10)
      : String(row.donated_at ?? "").slice(0, 10)
  return {
    id: String(row.id ?? ""),
    callsign: String(row.callsign ?? ""),
    amount: row.amount === null || row.amount === undefined ? null : String(row.amount),
    donatedAt: date,
    channel: row.channel ? String(row.channel) : null,
    note: row.note ? String(row.note) : null,
    anonymous: Boolean(row.anonymous),
    kind: row.kind ? String(row.kind) : "person",
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: row.created_at ? String(row.created_at) : "",
  }
}

async function selectRows(
  where: ReturnType<typeof sql>,
  limit: number
): Promise<DonationRecord[]> {
  const db = await getDb()
  const result = await db.execute(sql`
    select id, callsign, amount, donated_at, channel, note, anonymous, kind, created_by, created_at
    from donations
    where ${where}
    order by donated_at desc, created_at desc
    limit ${limit}
  `)
  const rows = (result as unknown as { rows?: RawRow[] }).rows ?? []
  return rows.map(toRecord)
}

class DonationManager {
  /**
   * 某呼号的支持记录（新→旧）。
   * kind 传 "person" 时只取个人捐助（个人中心/感谢墙口径）；不传则全部（后台账目）。
   */
  async listByCallsign(
    callsign: string,
    limit = 100,
    kind?: "person" | "aggregate"
  ): Promise<DonationRecord[]> {
    await ensureTable()
    const where = kind
      ? sql`upper(trim(callsign)) = upper(${callsign.trim()}) and kind = ${kind}`
      : sql`upper(trim(callsign)) = upper(${callsign.trim()})`
    return selectRows(where, limit)
  }

  /** 个人中心只统计个人捐助（汇总/其他收入不算档位） */
  async countByCallsign(callsign: string): Promise<number> {
    await ensureTable()
    const db = await getDb()
    const result = await db.execute(sql`
      select count(*)::int as n from donations
      where upper(trim(callsign)) = upper(${callsign.trim()})
        and kind = 'person'
    `)
    const rows = (result as unknown as { rows?: RawRow[] }).rows ?? []
    return Number(rows[0]?.n ?? 0)
  }

  /** 后台：最近的支持记录（含呼号，用于列表展示） */
  async listRecent(limit = 200): Promise<DonationRecord[]> {
    await ensureTable()
    return selectRows(sql`true`, limit)
  }

  /**
   * [v2.0.6] 后台分页查询：支持呼号/备注搜索、类型筛选、年份筛选。
   * 返回当页数据 + 命中总数，前端据此翻页。
   */
  async listPaged(opts: {
    q?: string
    kind?: "person" | "aggregate"
    year?: string
    limit?: number
    offset?: number
  }): Promise<{ rows: DonationRecord[]; total: number; amount: number }> {
    await ensureTable()
    const db = await getDb()
    const limit = Math.min(200, Math.max(5, opts.limit ?? 20))
    const offset = Math.max(0, opts.offset ?? 0)

    const conds = [sql`true`]
    const q = (opts.q ?? "").trim()
    if (q) {
      const like = `%${q}%`
      conds.push(
        sql`(callsign ilike ${like} or coalesce(note,'') ilike ${like} or coalesce(channel,'') ilike ${like})`
      )
    }
    if (opts.kind) conds.push(sql`kind = ${opts.kind}`)
    if (opts.year && /^\d{4}$/.test(opts.year)) {
      conds.push(sql`to_char(donated_at, 'YYYY') = ${opts.year}`)
    }
    const where = sql.join(conds, sql` and `)

    const countResult = await db.execute(sql`
      select count(*)::int as n, coalesce(sum(amount), 0) as amt
      from donations where ${where}
    `)
    const countRows = (countResult as unknown as { rows?: RawRow[] }).rows ?? []
    const total = Number(countRows[0]?.n ?? 0)
    const amount = Number(countRows[0]?.amt ?? 0)

    const result = await db.execute(sql`
      select id, callsign, amount, donated_at, channel, note, anonymous, kind, created_by, created_at
      from donations
      where ${where}
      order by donated_at desc, created_at desc
      limit ${limit} offset ${offset}
    `)
    const rows = (result as unknown as { rows?: RawRow[] }).rows ?? []
    return { rows: rows.map(toRecord), total, amount }
  }

  /** 后台：按类型汇总（个人 / 汇总），带相同的搜索与年份条件 */
  async summary(opts: { q?: string; year?: string }): Promise<
    { kind: string; count: number; amount: number }[]
  > {
    await ensureTable()
    const db = await getDb()
    const conds = [sql`true`]
    const q = (opts.q ?? "").trim()
    if (q) {
      const like = `%${q}%`
      conds.push(
        sql`(callsign ilike ${like} or coalesce(note,'') ilike ${like} or coalesce(channel,'') ilike ${like})`
      )
    }
    if (opts.year && /^\d{4}$/.test(opts.year)) {
      conds.push(sql`to_char(donated_at, 'YYYY') = ${opts.year}`)
    }
    const where = sql.join(conds, sql` and `)

    const result = await db.execute(sql`
      select kind, count(*)::int as n, coalesce(sum(amount), 0) as amt
      from donations where ${where}
      group by kind
    `)
    const rows = (result as unknown as { rows?: RawRow[] }).rows ?? []
    return rows.map((r) => ({
      kind: String(r.kind ?? "person"),
      count: Number(r.n ?? 0),
      amount: Number(r.amt ?? 0),
    }))
  }

  /** 后台：数据里出现过的年份（倒序），用于年份筛选下拉 */
  async years(): Promise<string[]> {
    await ensureTable()
    const db = await getDb()
    const result = await db.execute(sql`
      select distinct to_char(donated_at, 'YYYY') as y from donations order by 1 desc
    `)
    const rows = (result as unknown as { rows?: RawRow[] }).rows ?? []
    return rows.map((r) => String(r.y ?? "")).filter(Boolean)
  }

  async create(data: {
    callsign: string
    amount?: number | null
    donatedAt: string
    channel?: string | null
    note?: string | null
    anonymous?: boolean
    kind?: "person" | "aggregate"
    createdBy?: string | null
  }): Promise<DonationRecord> {
    await ensureTable()
    const db = await getDb()
    const result = await db.execute(sql`
      insert into donations (callsign, amount, donated_at, channel, note, anonymous, kind, created_by)
      values (
        upper(${data.callsign.trim()}),
        ${data.amount ?? null},
        ${data.donatedAt},
        ${data.channel ?? null},
        ${data.note ?? null},
        ${data.anonymous ?? false},
        ${data.kind ?? "person"},
        ${data.createdBy ?? null}
      )
      returning id, callsign, amount, donated_at, channel, note, anonymous, kind, created_by, created_at
    `)
    const rows = (result as unknown as { rows?: RawRow[] }).rows ?? []
    return toRecord(rows[0] ?? {})
  }

  async remove(id: string): Promise<boolean> {
    await ensureTable()
    const db = await getDb()
    const result = await db.execute(sql`delete from donations where id = ${id}`)
    return (result as unknown as { rowCount?: number }).rowCount !== 0
  }
}

export const donationManager = new DonationManager()
