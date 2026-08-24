// @version v1.5.16
import { eq, and, SQL, like, desc, gte, sql, isNull } from "drizzle-orm"
import { getDb } from "./db"
import {
  logSessions,
  insertLogSessionSchema,
  updateLogSessionSchema,
  logRecords,
  insertLogRecordSchema,
  updateLogRecordSchema,
  users,
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

  // 主控轮值统计：按 controllerId 聚合台网场次，并检测孤儿主控（controllerId 不在 users 表）
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

    // [v1.5.13 安全] 统计仅基于未软删的会话；排除 deletedAt 非空的记录。
    const rows = await db
      .select({
        controllerId: logSessions.controllerId,
        controllerName: logSessions.controllerName,
        sessionCount: sql<number>`count(*)::int`,
        lastSessionAt: sql<Date>`max(${logSessions.sessionTime})`,
      })
      .from(logSessions)
      .where(isNull(logSessions.deletedAt))
      .groupBy(logSessions.controllerId, logSessions.controllerName)

    // [v1.5.13 修复] 归并分组键：优先用 controllerId（强制身份后必存在且稳定），
    // 同名不同 id 的历史脏数据不再被错误合并；name 仅作为展示名兜底。
    type Agg = {
      controllerId: string | null
      controllerName: string
      sessionCount: number
      lastSessionAt: Date | null
      idSet: Set<string | null>
    }
    const merged = new Map<string, Agg>()
    for (const r of rows) {
      const idKey = (r.controllerId || "").trim()
      const key = idKey.length > 0 ? `id:${idKey}` : `name:${r.controllerName || "未知主控"}`
      const exist = merged.get(key)
      if (exist) {
        exist.sessionCount += Number(r.sessionCount)
        exist.idSet.add(r.controllerId)
        const t = r.lastSessionAt ? new Date(r.lastSessionAt).getTime() : 0
        const ct = exist.lastSessionAt ? new Date(exist.lastSessionAt).getTime() : 0
        if (t > ct) exist.lastSessionAt = r.lastSessionAt
        if (r.controllerName && !exist.controllerName) exist.controllerName = r.controllerName
      } else {
        merged.set(key, {
          controllerId:
            typeof r.controllerId === "string" && r.controllerId.length > 0
              ? r.controllerId
              : null,
          controllerName: r.controllerName || "未知主控",
          sessionCount: Number(r.sessionCount),
          lastSessionAt: r.lastSessionAt,
          idSet: new Set<string | null>([r.controllerId]),
        })
      }
    }

    // 收集所有 controllerId，批量取 users 真实用户名（无 FK，历史数据可能不规范）
    const controllerIds = Array.from(merged.values())
      .map((a) => a.controllerId)
      .filter((id): id is string => typeof id === "string" && id.length > 0)

    const userMap = new Map<string, string>()
    if (controllerIds.length > 0) {
      const matched = await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(sql`${users.id} in ${controllerIds}`)
      for (const m of matched) userMap.set(m.id, m.username)
    }

    const ranking = Array.from(merged.values()).map((a) => {
      const id = a.controllerId
      // 孤儿判定：若分组含有效 id 且全部都不在 users 表，则视为孤儿
      const hasValidId = a.idSet.has(id) && typeof id === "string" && id.length > 0
      const orphan = hasValidId && !userMap.has(id)
      // 名称兜底优先级：会话自带 controllerName > users.username > 未知主控
      const name =
        a.controllerName ||
        (typeof id === "string" && userMap.get(id)) ||
        (id ? id : "未知主控")
      return {
        controllerId: id,
        controllerName: name,
        sessionCount: a.sessionCount,
        lastSessionAt: a.lastSessionAt,
        orphan,
      }
    })
    ranking.sort((a, b) => b.sessionCount - a.sessionCount)

    const totalSessions = ranking.reduce((s, r) => s + r.sessionCount, 0)
    const orphanCount = ranking.filter((r) => r.orphan).reduce((s, r) => s + r.sessionCount, 0)

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

  async createSchedule(data: InsertLogSession): Promise<LogSession> {
    const db = await getDb()
    const payload = insertLogSessionSchema.parse({ ...data, status: "scheduled" })
    const [session] = await db.insert(logSessions).values(payload).returning()
    return session
  }

  async updateSchedule(id: string, data: UpdateLogSession): Promise<LogSession | null> {
    const db = await getDb()
    const validated = updateLogSessionSchema.parse(data)
    const [session] = await db
      .update(logSessions)
      .set(validated)
      .where(and(eq(logSessions.id, id), eq(logSessions.status, "scheduled")))
      .returning()
    return session || null
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
    const result: { session: LogSession; deletedRecordCount: number }[] = []
    for (const session of rows) {
      const [cnt] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(logRecords)
        .where(
          and(eq(logRecords.sessionId, session.id), sql`${logRecords.deletedAt} IS NOT NULL`)
        )
      result.push({ session, deletedRecordCount: Number(cnt?.c ?? 0) })
    }
    return result
  }
}

export const logManager = new LogManager()
