// @version v2.0.6
/**
 * [v2.0.4] 台网简报数据聚合
 *
 * 输入一场台网，输出长图需要的全部数字：
 *   参与人数 / 信号分布 / 本期参与设备 / 新面孔 / 老友回归
 *
 * 口径：
 * - 只统计未软删的记录；
 * - 信号报告按主控录入的原值归类（49、稳定 等都照实列出），只有空值归为「未填写」；
 * - 新面孔 = 该呼号历史上第一次参与就是本场；
 * - 老友回归 = 本场之前参与过，且与上一次间隔 ≥ 30 天；
 * - 标签有上限（新面孔 8 / 回归 6 / 设备 6），多出来的走「等 N 位」。
 */

import { sql } from "drizzle-orm"
import { getDb } from "@/storage/database/db"

export type BriefSignal = { label: string; count: number }
export type BriefEquipment = { name: string; count: number }
export type BriefReturning = { callsign: string; days: number }

export type SessionBrief = {
  sessionId: string
  title: string
  controller: string
  /** ISO 时间 */
  sessionTime: string
  people: number
  withSignal: number
  signals: BriefSignal[]
  equipments: BriefEquipment[]
  /** 出现 1 次、未进标签的设备数 */
  equipmentRest: number
  newFaces: { total: number; names: string[] }
  returning: { total: number; items: BriefReturning[] }
}

const NAME_LIMIT = 8
const BACK_LIMIT = 6
const EQ_LIMIT = 6

function rowsOf(result: unknown): Record<string, unknown>[] {
  return ((result as { rows?: Record<string, unknown>[] }).rows ?? []) as Record<string, unknown>[]
}

export async function buildSessionBrief(sessionId: string): Promise<SessionBrief | null> {
  const db = await getDb()

  const head = rowsOf(
    await db.execute(sql`
      select
        s.id,
        coalesce(s.title, '') as title,
        coalesce(s.controller_name, '') as controller,
        s.session_time,
        (select count(*)::int from log_records r
          where r.session_id = s.id and r.deleted_at is null) as people
      from log_sessions s
      where s.id = ${sessionId} and s.deleted_at is null
      limit 1
    `)
  )[0]

  if (!head) return null

  const [signalRows, eqRows, newRows, backRows] = await Promise.all([
    db.execute(sql`
      select
        -- 按主控实际录入的信号报告原样归类（49 也是真实报告），只把空值归为「未填写」
        case when coalesce(trim(signal), '') = '' then '未填写' else trim(signal) end as label,
        count(*)::int as n
      from log_records
      where session_id = ${sessionId} and deleted_at is null
      group by 1
      order by 2 desc, 1 asc
    `),
    db.execute(sql`
      select coalesce(nullif(trim(equipment), ''), '未填写') as name, count(*)::int as n
      from log_records
      where session_id = ${sessionId} and deleted_at is null
      group by 1
      order by 2 desc, 1 asc
    `),
    db.execute(sql`
      with rec as (
        select upper(trim(callsign)) as cs
        from log_records
        where session_id = ${sessionId} and deleted_at is null
      ), firsts as (
        select upper(trim(r.callsign)) as cs, min(s2.session_time) as ft
        from log_records r
        join log_sessions s2 on r.session_id = s2.id
        where r.deleted_at is null and s2.deleted_at is null
        group by 1
      )
      select r.cs
      from rec r
      join firsts f on r.cs = f.cs
      where f.ft >= (select session_time from log_sessions where id = ${sessionId})
      order by r.cs asc
    `),
    db.execute(sql`
      with rec as (
        select upper(trim(callsign)) as cs
        from log_records
        where session_id = ${sessionId} and deleted_at is null
      ), prev as (
        select upper(trim(r.callsign)) as cs, max(s2.session_time) as pt
        from log_records r
        join log_sessions s2 on r.session_id = s2.id
        where r.deleted_at is null and s2.deleted_at is null
          and s2.session_time < (select session_time from log_sessions where id = ${sessionId})
        group by 1
      )
      select r.cs,
        round(extract(epoch from (
          (select session_time from log_sessions where id = ${sessionId}) - p.pt
        )) / 86400)::int as days
      from rec r
      join prev p on r.cs = p.cs
      where (select session_time from log_sessions where id = ${sessionId}) - p.pt >= interval '30 days'
      order by days desc, r.cs asc
    `),
  ])

  const signals: BriefSignal[] = rowsOf(signalRows).map((r) => ({
    label: String(r.label ?? "未填写"),
    count: Number(r.n) || 0,
  }))

  const allEq = rowsOf(eqRows).map((r) => ({
    name: String(r.name ?? "未填写"),
    count: Number(r.n) || 0,
  }))
  const counted = allEq.filter((e) => e.count >= 2)
  const equipments = counted.slice(0, EQ_LIMIT)
  const equipmentRest = allEq.reduce((sum, e) => sum + e.count, 0) -
    equipments.reduce((sum, e) => sum + e.count, 0)

  const newNames = rowsOf(newRows).map((r) => String(r.cs ?? "")).filter(Boolean)
  const backItems: BriefReturning[] = rowsOf(backRows).map((r) => ({
    callsign: String(r.cs ?? ""),
    days: Number(r.days) || 0,
  }))

  const people = Number(head.people) || 0
  const withSignal = signals
    .filter((s) => s.label !== "未填写")
    .reduce((a, b) => a + b.count, 0)

  return {
    sessionId: String(head.id),
    title: String(head.title ?? ""),
    controller: String(head.controller ?? ""),
    sessionTime: new Date(head.session_time as string | Date).toISOString(),
    people,
    withSignal,
    signals,
    equipments,
    equipmentRest,
    newFaces: { total: newNames.length, names: newNames.slice(0, NAME_LIMIT) },
    returning: { total: backItems.length, items: backItems.slice(0, BACK_LIMIT) },
  }
}

/** 取某呼号最近主控过的场次（用于简报的场次选择） */
export async function listControlledSessions(
  callsign: string,
  limit = 8
): Promise<{ id: string; title: string; sessionTime: string; controller: string }[]> {
  const db = await getDb()
  const res = await db.execute(sql`
    select id, coalesce(title, '') as title, session_time, coalesce(controller_name, '') as controller
    from log_sessions
    where deleted_at is null
      and status <> 'scheduled'
      and upper(trim(controller_name)) = upper(${callsign})
    order by session_time desc
    limit ${limit}
  `)
  return rowsOf(res).map((r) => ({
    id: String(r.id),
    title: String(r.title ?? ""),
    sessionTime: new Date(r.session_time as string | Date).toISOString(),
    controller: String(r.controller ?? ""),
  }))
}

/** 管理员：最近已开台的场次 */
export async function listRecentSessions(
  limit = 8
): Promise<{ id: string; title: string; sessionTime: string; controller: string }[]> {
  const db = await getDb()
  const res = await db.execute(sql`
    select id, coalesce(title, '') as title, session_time, coalesce(controller_name, '') as controller
    from log_sessions
    where deleted_at is null and status <> 'scheduled'
    order by session_time desc
    limit ${limit}
  `)
  return rowsOf(res).map((r) => ({
    id: String(r.id),
    title: String(r.title ?? ""),
    sessionTime: new Date(r.session_time as string | Date).toISOString(),
    controller: String(r.controller ?? ""),
  }))
}
