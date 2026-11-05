// @version v2.0.5
/**
 * [v2.0.4] 回归欢迎：算「本场每位参与者距上次参与隔了多少天」
 *
 * 口径：只算已开台、未软删的场次；呼号去空格转大写归一。
 * 首次参与的人不在结果里（没有上一次），由调用方视为「新面孔」。
 */

import { sql } from "drizzle-orm"
import { getDb } from "@/storage/database/db"

/**
 * [v2.0.6] 全量 map 加短缓存：大屏每 3 秒轮询一次，若每次都算全表会很吃 CPU，
 * 缓存 2 秒能显著摊薄成本；2 秒的窗口内新进场者可能错过一轮欢迎条，下一轮即补上。
 */
const mapCache = new Map<string, { at: number; map: Map<string, number> }>()
const MAP_CACHE_TTL = 2000

export async function getReturningDaysMap(sessionId: string): Promise<Map<string, number>> {
  const hit = mapCache.get(sessionId)
  const now = Date.now()
  if (hit && now - hit.at < MAP_CACHE_TTL) return hit.map

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
  mapCache.set(sessionId, { at: now, map })
  return map
}

/**
 * [v2.0.6] 单个呼号的回归天数：录入时只算当前这位，走 idx_records_callsign 索引，
 * 避免每次提交都重算整场所有人的间隔（这是「提交卡一下」的根因）。
 */
export async function getReturningDays(
  sessionId: string,
  callsign: string
): Promise<number | null> {
  const db = await getDb()
  const result = await db.execute(sql`
    select round(extract(epoch from (
      (select session_time from log_sessions where id = ${sessionId} and deleted_at is null) -
      (select max(s2.session_time)
         from log_records r2
         join log_sessions s2 on r2.session_id = s2.id
         where r2.deleted_at is null
           and s2.deleted_at is null
           and s2.session_time < (select session_time from log_sessions where id = ${sessionId} and deleted_at is null)
           and upper(trim(r2.callsign)) = upper(${callsign.trim()}))
    )) / 86400)::int as days
  `)
  const rows = (result as unknown as { rows?: Record<string, unknown>[] }).rows ?? []
  const days = Number(rows[0]?.days)
  return Number.isFinite(days) && days >= 0 ? days : null
}

/** 回归判定阈值：距上次参与 ≥ 30 天算「老友回归」 */
export const RETURNING_DAYS_THRESHOLD = 30

export function isReturning(days?: number | null): boolean {
  return typeof days === "number" && days >= RETURNING_DAYS_THRESHOLD
}
