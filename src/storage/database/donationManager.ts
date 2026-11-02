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
    select id, callsign, amount, donated_at, channel, note, anonymous, created_by, created_at
    from donations
    where ${where}
    order by donated_at desc, created_at desc
    limit ${limit}
  `)
  const rows = (result as unknown as { rows?: RawRow[] }).rows ?? []
  return rows.map(toRecord)
}

class DonationManager {
  /** 某呼号的全部支持记录（新→旧） */
  async listByCallsign(callsign: string, limit = 100): Promise<DonationRecord[]> {
    await ensureTable()
    return selectRows(sql`upper(trim(callsign)) = upper(${callsign.trim()})`, limit)
  }

  async countByCallsign(callsign: string): Promise<number> {
    await ensureTable()
    const db = await getDb()
    const result = await db.execute(sql`
      select count(*)::int as n from donations
      where upper(trim(callsign)) = upper(${callsign.trim()})
    `)
    const rows = (result as unknown as { rows?: RawRow[] }).rows ?? []
    return Number(rows[0]?.n ?? 0)
  }

  /** 后台：最近的支持记录（含呼号，用于列表展示） */
  async listRecent(limit = 200): Promise<DonationRecord[]> {
    await ensureTable()
    return selectRows(sql`true`, limit)
  }

  async create(data: {
    callsign: string
    amount?: number | null
    donatedAt: string
    channel?: string | null
    note?: string | null
    anonymous?: boolean
    createdBy?: string | null
  }): Promise<DonationRecord> {
    await ensureTable()
    const db = await getDb()
    const result = await db.execute(sql`
      insert into donations (callsign, amount, donated_at, channel, note, anonymous, created_by)
      values (
        upper(${data.callsign.trim()}),
        ${data.amount ?? null},
        ${data.donatedAt},
        ${data.channel ?? null},
        ${data.note ?? null},
        ${data.anonymous ?? false},
        ${data.createdBy ?? null}
      )
      returning id, callsign, amount, donated_at, channel, note, anonymous, created_by, created_at
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
