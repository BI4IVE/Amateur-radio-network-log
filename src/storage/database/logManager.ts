// @version v2.0.0
import { eq, and, SQL, like, desc, gte, sql, isNull, inArray } from "drizzle-orm"
import { getDb } from "./db"
import {
  logSessions,
  insertLogSessionSchema,
  updateLogSessionSchema,
  logRecords,
  insertLogRecordSchema,
  updateLogRecordSchema,
  auditLogs,
} from "./shared/schema"
import type {
  LogSession,
  InsertLogSession,
  UpdateLogSession,
  LogRecord,
  InsertLogRecord,
  UpdateLogRecord,
  AuditLog,
} from "./shared/schema"

export class LogManager {
  // LogSession operations
  async createLogSession(data: InsertLogSession): Promise<LogSession> {
    const db = await getDb()
    const validated = insertLogSessionSchema.parse(data)
    const [session] = await db.insert(logSessions).values(validated).returning()
    return session
  }

  async getLogSessionById(id: string): Promise<LogSession | null> {
    const db = await getDb()
    const [session] = await db.select().from(logSessions).where(eq(logSessions.id, id))
    return session || null
  }

  // 按北京时间日期查询当天是否已存在台网会话（一天仅允许一场台网）
  // [v1.5.13 修复] 仅统计未软删的会话：当日台网被删除后应允许重新创建。
  async findSessionByBeijingDate(date: Date): Promise<LogSession | null> {
    const db = await getDb()
    const [session] = await db
      .select()
      .from(logSessions)
      .where(
        and(
          sql`DATE(${logSessions.sessionTime} AT TIME ZONE 'Asia/Shanghai') = DATE(${date} AT TIME ZONE 'Asia/Shanghai')`,
          isNull(logSessions.deletedAt)
        )
      )
      .limit(1)
    return session || null
  }

  async getLogSessions(options: {
    skip?: number
    limit?: number
    controllerId?: string
    includeDeleted?: boolean
  } = {}): Promise<LogSession[]> {
    const { skip = 0, limit = 100, controllerId, includeDeleted = false } = options
    const db = await getDb()

    const conditions: SQL[] = []
    if (controllerId !== undefined) {
      conditions.push(eq(logSessions.controllerId, controllerId))
    }
    if (!includeDeleted) {
      conditions.push(isNull(logSessions.deletedAt))
    }

    if (conditions.length > 0) {
      return db
        .select()
        .from(logSessions)
        .where(and(...conditions))
        .orderBy(desc(logSessions.sessionTime))
        .limit(limit)
        .offset(skip)
    }

    return db
      .select()
      .from(logSessions)
      .orderBy(desc(logSessions.sessionTime))
      .limit(limit)
      .offset(skip)
  }

  async updateLogSession(
    id: string,
    data: UpdateLogSession
  ): Promise<LogSession | null> {
    const db = await getDb()
    const validated = updateLogSessionSchema.parse(data)
    const [session] = await db
      .update(logSessions)
      .set(validated)
      .where(eq(logSessions.id, id))
      .returning()
    return session || null
  }

  // 软删除台网会话（保留数据，记录审计）
  async softDeleteLogSession(id: string, actor?: { userId?: string; username?: string }): Promise<boolean> {
    const db = await getDb()
    const now = new Date()
    const [updated] = await db
      .update(logSessions)
      .set({ deletedAt: now })
      .where(and(eq(logSessions.id, id), isNull(logSessions.deletedAt)))
      .returning()
    if (updated) {
      await this.writeAudit({
        userId: actor?.userId,
        username: actor?.username,
        action: "SOFT_DELETE",
        entityType: "session",
        entityId: id,
        detail: `软删除台网会话（${updated.title || updated.controllerName} @ ${updated.sessionTime}）`,
      })
    }
    return !!updated
  }

  // 恢复已软删除的台网会话
  async restoreLogSession(id: string, actor?: { userId?: string; username?: string }): Promise<boolean> {
    const db = await getDb()
    const [updated] = await db
      .update(logSessions)
      .set({ deletedAt: null })
      .where(eq(logSessions.id, id))
      .returning()
    if (updated) {
      await this.writeAudit({
        userId: actor?.userId,
        username: actor?.username,
        action: "RESTORE",
        entityType: "session",
        entityId: id,
        detail: `恢复台网会话（${updated.title || updated.controllerName}）`,
      })
    }
    return !!updated
  }

  // 主控轮值统计：按「主控呼号」(controllerName) 聚合台网场次，不区分是谁添加的账号。
  // 同一呼号无论由哪个账号创建，都归到该呼号名下（如 BI4IVE 的台网无论谁添加都计入 BI4IVE）。
  async getControllerRotation(): Promise<{
    ranking: {
      controllerId: string | null
      controllerName: string
      sessionCount: number
      lastSessionAt: Date | null
      orphan: boolean
    }[]
    totalSessions: number
    controllers: number
    orphanCount: number
  }> {
    const db = await getDb()

    // [轮值表] 仅基于未软删的会话；排除 deletedAt 非空的记录。
    // 直接按 controllerName 分组（呼号即主控身份），不再按 controllerId 分组。
    const rows = await db
      .select({
        controllerName: logSessions.controllerName,
        sessionCount: sql<number>`count(*)::int`,
        lastSessionAt: sql<Date>`max(${logSessions.sessionTime})`,
      })
      .from(logSessions)
      .where(isNull(logSessions.deletedAt))
      .groupBy(logSessions.controllerName)

    // 归并键：去空格 + 小写，避免 "BI4IVE" / "bi4ive" / " BI4IVE " 被算成不同人；
    // 展示名取原样（首个非空值），与数据库分组一致。
    type Agg = {
      controllerName: string
      sessionCount: number
      lastSessionAt: Date | null
    }
    const merged = new Map<string, Agg>()
    for (const r of rows) {
      const raw = (r.controllerName || "").trim()
      const name = raw.length > 0 ? raw : "未知主控"
      const key = name.toLowerCase()
      const exist = merged.get(key)
      if (exist) {
        exist.sessionCount += Number(r.sessionCount)
        const t = r.lastSessionAt ? new Date(r.lastSessionAt).getTime() : 0
        const ct = exist.lastSessionAt ? new Date(exist.lastSessionAt).getTime() : 0
        if (t > ct) exist.lastSessionAt = r.lastSessionAt
      } else {
        merged.set(key, {
          controllerName: name,
          sessionCount: Number(r.sessionCount),
          lastSessionAt: r.lastSessionAt,
        })
      }
    }

    // 按呼号聚合后不再区分添加账号，故不再有「账号孤儿」；统一不标记 orphan。
    const ranking = Array.from(merged.values()).map((a) => ({
      controllerId: null,
      controllerName: a.controllerName,
      sessionCount: a.sessionCount,
      lastSessionAt: a.lastSessionAt,
      orphan: false,
    }))
    ranking.sort((a, b) => b.sessionCount - a.sessionCount)

    const totalSessions = ranking.reduce((s, r) => s + r.sessionCount, 0)
    const orphanCount = ranking
      .filter((r) => r.controllerName === "未知主控")
      .reduce((s, r) => s + r.sessionCount, 0)

    return { ranking, totalSessions, controllers: ranking.length, orphanCount }
  }

  // 台网预告 / 排期：status='scheduled' 的 log_sessions 即为预告
  async getSchedules(): Promise<LogSession[]> {
    const db = await getDb()
    return db
      .select()
      .from(logSessions)
      .where(eq(logSessions.status, "scheduled"))
      .orderBy(sql`${logSessions.scheduledTime} ASC NULLS LAST`)
  }

  // 取最近一条尚未开始的预告（用于首页 /live 倒计时）
  async getUpcomingSchedule(): Promise<LogSession | null> {
    const db = await getDb()
    const [row] = await db
      .select()
      .from(logSessions)
      .where(
        and(
          eq(logSessions.status, "scheduled"),
          gte(logSessions.scheduledTime, new Date())
        )
      )
      .orderBy(sql`${logSessions.scheduledTime} ASC`)
      .limit(1)
    return row || null
  }

  // 将数据库唯一约束冲突（一天一场台网）翻译为友好提示
  private scheduleConflictError(e: any): Error | null {
    const msg = (e?.message || e?.cause?.message || "") as string
    const code = e?.code || e?.cause?.code
    if (code === "23505" || msg.includes("log_sessions_one_per_day_idx")) {
      return new Error("该日期（北京时间）已存在台网或预告，一天仅允许一场，请更换日期或先删除已有记录")
    }
    return null
  }

  async createSchedule(data: InsertLogSession): Promise<LogSession> {
    const db = await getDb()
    const payload = insertLogSessionSchema.parse(data)
    try {
      const [session] = await db.insert(logSessions).values({ ...payload, status: "scheduled" }).returning()
      return session
    } catch (e: any) {
      const friendly = this.scheduleConflictError(e)
      if (friendly) throw friendly
      throw e
    }
  }

  async updateSchedule(id: string, data: UpdateLogSession): Promise<LogSession | null> {
    const db = await getDb()
    const validated = updateLogSessionSchema.parse(data)
    try {
      const [session] = await db
        .update(logSessions)
        .set(validated)
        .where(and(eq(logSessions.id, id), eq(logSessions.status, "scheduled")))
        .returning()
      return session || null
    } catch (e: any) {
      const friendly = this.scheduleConflictError(e)
      if (friendly) throw friendly
      throw e
    }
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const db = await getDb()
    const result = await db
      .delete(logSessions)
      .where(and(eq(logSessions.id, id), eq(logSessions.status, "scheduled")))
    return (result.rowCount ?? 0) > 0
  }

  // 到点一键开始台网：将预告（status='scheduled'）转为正式进行中（status='active'）
  async startScheduledSession(id: string): Promise<LogSession | null> {
    const db = await getDb()
    const now = new Date()
    const [session] = await db
      .update(logSessions)
      .set({ status: "active", sessionTime: now })
      .where(and(eq(logSessions.id, id), eq(logSessions.status, "scheduled")))
      .returning()
    return session || null
  }

  // LogRecord operations
  async createLogRecord(data: InsertLogRecord): Promise<LogRecord> {
    const db = await getDb()
    const validated = insertLogRecordSchema.parse(data)
    const [record] = await db.insert(logRecords).values(validated).returning()
    return record
  }

  async getLogRecordById(id: string): Promise<LogRecord | null> {
    const db = await getDb()
    const [record] = await db.select().from(logRecords).where(eq(logRecords.id, id))
    return record || null
  }

  async getLogRecordsBySessionId(sessionId: string, includeDeleted = false): Promise<LogRecord[]> {
    const db = await getDb()
    const conditions: SQL[] = [eq(logRecords.sessionId, sessionId)]
    if (!includeDeleted) conditions.push(isNull(logRecords.deletedAt))
    return db
      .select()
      .from(logRecords)
      .where(and(...conditions))
      .orderBy(logRecords.createdAt)
  }

  async updateLogRecord(
    id: string,
    data: UpdateLogRecord
  ): Promise<LogRecord | null> {
    const db = await getDb()
    const validated = updateLogRecordSchema.parse(data)
    const [record] = await db
      .update(logRecords)
      .set(validated)
      .where(eq(logRecords.id, id))
      .returning()
    return record || null
  }

  // 软删除单条记录（保留数据，记录审计）
  async softDeleteLogRecord(id: string, actor?: { userId?: string; username?: string }): Promise<boolean> {
    const db = await getDb()
    const [updated] = await db
      .update(logRecords)
      .set({ deletedAt: new Date() })
      .where(and(eq(logRecords.id, id), isNull(logRecords.deletedAt)))
      .returning()
    if (updated) {
      await this.writeAudit({
        userId: actor?.userId,
        username: actor?.username,
        action: "SOFT_DELETE",
        entityType: "record",
        entityId: id,
        detail: `软删除记录（${updated.callsign} @ session ${updated.sessionId}）`,
      })
    }
    return !!updated
  }

  async restoreLogRecord(id: string, actor?: { userId?: string; username?: string }): Promise<boolean> {
    const db = await getDb()
    const [updated] = await db
      .update(logRecords)
      .set({ deletedAt: null })
      .where(eq(logRecords.id, id))
      .returning()
    if (updated) {
      await this.writeAudit({
        userId: actor?.userId,
        username: actor?.username,
        action: "RESTORE",
        entityType: "record",
        entityId: id,
        detail: `恢复记录（${updated.callsign}）`,
      })
    }
    return !!updated
  }

  async deleteLogRecordsBySessionId(sessionId: string): Promise<number> {
    const db = await getDb()
    const result = await db.delete(logRecords).where(eq(logRecords.sessionId, sessionId))
    return result.rowCount ?? 0
  }

  // Get session with records
  async getSessionWithRecords(sessionId: string): Promise<{
    session: LogSession | null
    records: LogRecord[]
  }> {
    const session = await this.getLogSessionById(sessionId)
    const records = await this.getLogRecordsBySessionId(sessionId)
    return { session, records }
  }

  // Export data for Excel
  async getExportData(sessionId: string): Promise<{
    session: LogSession | null
    records: LogRecord[]
  }> {
    return this.getSessionWithRecords(sessionId)
  }

  // Search records by field for autocomplete
  async searchRecordsByField(field: string, query: string): Promise<LogRecord[]> {
    const db = await getDb()

    // 字段白名单，防止通过 field 注入任意列名
    const validFields = ["callsign", "qth", "equipment", "antenna", "power", "signal", "report", "remarks"]
    if (!validFields.includes(field)) {
      return []
    }

    // 使用 SQL 查询特定字段
    const condition = (logRecords as any)[field]

    // [v1.5.13 安全] 仅返回未软删的记录，避免公开接口泄露已删除数据。
    return db
      .select()
      .from(logRecords)
      .where(and(like(condition, `%${query}%`), isNull(logRecords.deletedAt)))
      .orderBy((logRecords as any)[field])
      .limit(50)
  }

  // Query records by callsign within one year
  async getRecordsByCallsignInOneYear(callsign: string): Promise<LogRecord[]> {
    const db = await getDb()

    // Calculate one year ago from now
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    // [v1.5.13 安全] 同时过滤一年内的记录与未软删的记录。
    return db
      .select()
      .from(logRecords)
      .where(
        and(
          eq(logRecords.callsign, callsign),
          // 直接在 SQL 层过滤一年内的记录，避免拉取全量历史再内存过滤
          gte(logRecords.createdAt, oneYearAgo),
          isNull(logRecords.deletedAt)
        )
      )
      .orderBy(desc(logRecords.createdAt))
  }

  /**
   * [个人中心] 某呼号的通联记录：JOIN 台网场次带出台网日期与名称，按场次时间倒序分页。
   * 只返回未软删的记录与场次，避免个人中心出现「已删除」的幽灵数据。
   */
  async getRecordsByCallsign(
    callsign: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{
    items: {
      id: string
      callsign: string
      qth: string | null
      equipment: string | null
      antenna: string | null
      power: string | null
      signal: string | null
      report: string | null
      remarks: string | null
      createdAt: Date
      sessionId: string
      sessionTime: Date
      sessionTitle: string | null
    }[]
    total: number
  }> {
    const { limit = 20, offset = 0 } = options
    const db = await getDb()
    const where = and(
      eq(logRecords.callsign, callsign),
      isNull(logRecords.deletedAt),
      isNull(logSessions.deletedAt)
    )

    const items = await db
      .select({
        id: logRecords.id,
        callsign: logRecords.callsign,
        qth: logRecords.qth,
        equipment: logRecords.equipment,
        antenna: logRecords.antenna,
        power: logRecords.power,
        signal: logRecords.signal,
        report: logRecords.report,
        remarks: logRecords.remarks,
        createdAt: logRecords.createdAt,
        sessionId: logSessions.id,
        sessionTime: logSessions.sessionTime,
        sessionTitle: logSessions.title,
      })
      .from(logRecords)
      .innerJoin(logSessions, eq(logRecords.sessionId, logSessions.id))
      .where(where)
      .orderBy(desc(logSessions.sessionTime))
      .limit(limit)
      .offset(offset)

    const [agg] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(logRecords)
      .innerJoin(logSessions, eq(logRecords.sessionId, logSessions.id))
      .where(where)

    return { items, total: agg?.count ?? 0 }
  }

  /**
   * [个人中心] 某呼号的参与统计：累计/本年度场次、首次与最近参与时间。
   * 按北京时间切年，避免 UTC 跨年把 12-31 的场次算到上一年。
   */
  async getCallsignStats(callsign: string): Promise<{
    sessions: number
    yearSessions: number
    firstTime: Date | null
    lastTime: Date | null
  }> {
    const db = await getDb()
    const result = await db.execute(sql`
      select
        count(distinct r.session_id)::int as sessions,
        count(distinct case
          when date_trunc('year', s.session_time at time zone 'Asia/Shanghai')
             = date_trunc('year', now() at time zone 'Asia/Shanghai')
          then r.session_id end)::int as year_sessions,
        min(s.session_time) as first_time,
        max(s.session_time) as last_time
      from log_records r
      join log_sessions s on s.id = r.session_id
      where r.callsign = ${callsign}
        and r.deleted_at is null
        and s.deleted_at is null
    `)
    const row = ((result as unknown as { rows?: Record<string, unknown>[] }).rows ?? [])[0] ?? {}
    const num = (v: unknown) => Number(v ?? 0) || 0
    const time = (v: unknown) => (v ? new Date(String(v)) : null)
    return {
      sessions: num(row.sessions),
      yearSessions: num(row.year_sessions),
      firstTime: time(row.first_time),
      lastTime: time(row.last_time),
    }
  }

  /** [个人中心] 最常出现的信号值（用于概览卡片） */
  async getCallsignTopSignal(callsign: string): Promise<string | null> {
    const db = await getDb()
    const [row] = await db
      .select({ signal: logRecords.signal, count: sql<number>`count(*)::int` })
      .from(logRecords)
      .where(
        and(
          eq(logRecords.callsign, callsign),
          isNull(logRecords.deletedAt),
          sql`${logRecords.signal} is not null and ${logRecords.signal} <> ''`
        )
      )
      .groupBy(logRecords.signal)
      .orderBy(sql`count(*) desc`)
      .limit(1)
    return row?.signal ?? null
  }

  /** [个人中心] 台网参与次数排名（同次数并列，按人次算 1 起） */
  async getCallsignRank(callsign: string): Promise<{ rank: number; total: number }> {
    const db = await getDb()
    const result = await db.execute(sql`
      with stats as (
        select r.callsign, count(distinct r.session_id)::int as c
        from log_records r
        join log_sessions s on s.id = r.session_id
        where r.deleted_at is null and s.deleted_at is null
        group by r.callsign
      )
      select
        (select count(*) + 1 from stats where c > coalesce((select c from stats where callsign = ${callsign}), 0))::int as rank,
        (select count(*) from stats)::int as total
    `)
    const row = ((result as unknown as { rows?: Record<string, unknown>[] }).rows ?? [])[0] ?? {}
    return {
      rank: Number(row.rank ?? 0) || 0,
      total: Number(row.total ?? 0) || 0,
    }
  }

  // 写入一条审计日志
  async writeAudit(data: {
    userId?: string
    username?: string
    action: string
    entityType: string
    entityId: string
    detail?: string
  }): Promise<void> {
    const db = await getDb()
    await db.insert(auditLogs).values({
      userId: data.userId ?? null,
      username: data.username ?? null,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      detail: data.detail ?? null,
    })
  }

  // 查询某个参与者的审计日志（档案/执照修改留痕）
  async getParticipantAuditLogs(
    entityIds: string[],
    limit = 50
  ): Promise<AuditLog[]> {
    if (entityIds.length === 0) return []
    const db = await getDb()
    return db
      .select()
      .from(auditLogs)
      .where(
        and(
          inArray(auditLogs.entityId, entityIds),
          eq(auditLogs.entityType, "participant")
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
  }

  // 查询审计日志（按时间倒序）
  async getAuditLogs(options: { skip?: number; limit?: number } = {}): Promise<AuditLog[]> {
    const { skip = 0, limit = 100 } = options
    const db = await getDb()
    return db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(skip)
  }

  // 回收站：列出已软删除的会话（含各自软删除的记录数）
  async getDeletedSessions(): Promise<{
    session: LogSession
    deletedRecordCount: number
  }[]> {
    const db = await getDb()
    const rows = await db
      .select()
      .from(logSessions)
      .where(sql`${logSessions.deletedAt} IS NOT NULL`)
      .orderBy(desc(logSessions.deletedAt))
    if (rows.length === 0) return []

    // [C2 修复] 原实现是「对每个会话各发一条 count 查询」（N+1）；改为一次 GROUP BY 聚合后在内存里合并。
    const grouped = await db
      .select({
        sessionId: logRecords.sessionId,
        c: sql<number>`count(*)::int`,
      })
      .from(logRecords)
      .where(sql`${logRecords.deletedAt} IS NOT NULL`)
      .groupBy(logRecords.sessionId)
    const countMap = new Map(grouped.map((g) => [g.sessionId, Number(g.c ?? 0)]))

    return rows.map((session) => ({
      session,
      deletedRecordCount: countMap.get(session.id) ?? 0,
    }))
  }
}

export const logManager = new LogManager()
