import { eq, and, SQL, like, desc } from "drizzle-orm"
import { getDb } from "coze-coding-dev-sdk"
import {
  logSessions,
  insertLogSessionSchema,
  updateLogSessionSchema,
  logRecords,
  insertLogRecordSchema,
  updateLogRecordSchema,
} from "./shared/schema"
import type {
  LogSession,
  InsertLogSession,
  UpdateLogSession,
  LogRecord,
  InsertLogRecord,
  UpdateLogRecord,
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

  async getLogSessions(options: {
    skip?: number
    limit?: number
    controllerId?: string
  } = {}): Promise<LogSession[]> {
    const { skip = 0, limit = 100, controllerId } = options
    const db = await getDb()

    const conditions: SQL[] = []
    if (controllerId !== undefined) {
      conditions.push(eq(logSessions.controllerId, controllerId))
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

  async deleteLogSession(id: string): Promise<boolean> {
    const db = await getDb()
    const result = await db.delete(logSessions).where(eq(logSessions.id, id))
    return (result.rowCount ?? 0) > 0
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

  async getLogRecordsBySessionId(sessionId: string): Promise<LogRecord[]> {
    const db = await getDb()
    return db
      .select()
      .from(logRecords)
      .where(eq(logRecords.sessionId, sessionId))
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

  async deleteLogRecord(id: string): Promise<boolean> {
    const db = await getDb()
    const result = await db.delete(logRecords).where(eq(logRecords.id, id))
    return (result.rowCount ?? 0) > 0
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

    // 使用 SQL 查询特定字段
    const condition = (logRecords as any)[field]

    return db
      .select()
      .from(logRecords)
      .where(like(condition, `%${query}%`))
      .orderBy((logRecords as any)[field])
      .limit(50)
  }

  // Query records by callsign within one year
  async getRecordsByCallsignInOneYear(callsign: string): Promise<LogRecord[]> {
    const db = await getDb()

    // Calculate one year ago from now
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    return db
      .select()
      .from(logRecords)
      .where(
        eq(logRecords.callsign, callsign)
      )
      .orderBy(desc(logRecords.createdAt))
  }
}

export const logManager = new LogManager()
