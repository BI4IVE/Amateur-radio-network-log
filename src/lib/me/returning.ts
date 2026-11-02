// @version v2.0.5
/**
 * [v2.0.4] 回归欢迎：算「本场每位参与者距上次参与隔了多少天」
 *
 * 口径：只算已开台、未软删的场次；呼号去空格转大写归一。
 * 首次参与的人不在结果里（没有上一次），由调用方视为「新面孔」。
 */

import { sql } from "drizzle-orm"
import { getDb } from "@/storage/database/db"

export async function getReturningDaysMap(sessionId: string): Promise<Map<string, number>> {
  const db = await getDb()
  const result = await db.execute(sql`
    with cur as (
      select id, session_time as st
      from log_sessions
      where id = ${sessionId} and deleted_at is null
    ), rec as (
      select distinct upper(trim(r.callsign)) as cs
      from log_records r
      join cur on r.session_id = cur.id
      where r.deleted_at is null and coalesce(trim(r.callsign), '') <> ''
    )
    select rec.cs,
      round(extract(epoch from (
        (select st from cur) - (
          select max(s2.session_time)
          from log_records r2
          join log_sessions s2 on r2.session_id = s2.id
          where r2.deleted_at is null
            and s2.deleted_at is null
            and s2.session_time < (select st from cur)
            and upper(trim(r2.callsign)) = rec.cs
        )
      )) / 86400)::int as days
    from rec
  `)

  const rows = ((result as unknown as { rows?: Record<string, unknown>[] }).rows ?? []) as Record<
    string,
    unknown
  >[]
  const map = new Map<string, number>()
  for (const row of rows) {
    const cs = String(row.cs ?? "").toUpperCase()
    const days = Number(row.days)
    if (!cs || !Number.isFinite(days) || days < 0) continue
    map.set(cs, days)
  }
  return map
}

/** 回归判定阈值：距上次参与 ≥ 30 天算「老友回归」 */
export const RETURNING_DAYS_THRESHOLD = 30

export function isReturning(days?: number | null): boolean {
  return typeof days === "number" && days >= RETURNING_DAYS_THRESHOLD
}
