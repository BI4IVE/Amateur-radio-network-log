// @version v1.5.18
import { pgTable, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod"

// 用户表 - 台网主控人员
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    username: varchar("username", { length: 50 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    equipment: varchar("equipment", { length: 255 }),
    antenna: varchar("antenna", { length: 255 }),
    qth: varchar("qth", { length: 255 }),
    role: varchar("role", { length: 20 }).notNull().default("user"), // admin or user
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    usernameIdx: sql`CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users (username)`,
  })
)

// 台网会话表
export const logSessions = pgTable(
  "log_sessions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    controllerId: varchar("controller_id", { length: 36 }).notNull(),
    controllerName: varchar("controller_name", { length: 100 }).notNull(),
    controllerEquipment: varchar("controller_equipment", { length: 255 }),
    controllerAntenna: varchar("controller_antenna", { length: 255 }),
    controllerQth: varchar("controller_qth", { length: 255 }),
    sessionTime: timestamp("session_time", { withTimezone: true }).notNull(),
    title: varchar("title", { length: 100 }),
    scheduledTime: timestamp("scheduled_time", { withTimezone: true }),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // [v1.5.13 安全] 一天仅允许一场台网：按北京时间以天为单位唯一。
    // 应用层 findSessionByBeijingDate 查重之外，再加数据库层唯一约束兜底，杜绝并发 TOCTOU。
    // 使用「部分唯一索引」仅约束未软删的记录：当日台网被删除（软删，deleted_at 非空）后可重新创建，
    // 同时仍防止同一活跃台网被并发重复插入。
    oneSessionPerDayIdx: sql`CREATE UNIQUE INDEX IF NOT EXISTS log_sessions_one_per_day_idx ON log_sessions (date_trunc('day', session_time AT TIME ZONE 'Asia/Shanghai')) WHERE deleted_at IS NULL`,
  })
)

// 台网记录明细表
export const logRecords = pgTable("log_records", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id", { length: 36 }).notNull(),
  callsign: varchar("callsign", { length: 20 }).notNull(),
  qth: varchar("qth", { length: 255 }),
  equipment: varchar("equipment", { length: 255 }),
  antenna: varchar("antenna", { length: 255 }),
  power: varchar("power", { length: 50 }),
  signal: varchar("signal", { length: 50 }),
  report: varchar("report", { length: 255 }),
  remarks: text("remarks"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// 审计日志表 - 记录删除/恢复等关键操作（软删除可追溯）
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }),
  username: varchar("username", { length: 50 }),
  action: varchar("action", { length: 30 }).notNull(), // SOFT_DELETE / RESTORE / CREATE / UPDATE / START
  entityType: varchar("entity_type", { length: 20 }).notNull(), // session / record
  entityId: varchar("entity_id", { length: 36 }).notNull(),
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// 审计日志类型（显式导出，供 logManager / 页面复用）
export type AuditLog = typeof auditLogs.$inferSelect

// 参与人员信息表
export const participants = pgTable("participants", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  callsign: varchar("callsign", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }),
  qth: varchar("qth", { length: 255 }),
  equipment: varchar("equipment", { length: 255 }),
  antenna: varchar("antenna", { length: 255 }),
  power: varchar("power", { length: 50 }),
  signal: varchar("signal", { length: 50 }),
  report: varchar("report", { length: 255 }),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
})

// 设备库表 - 仅存储设备名称
export const equipments = pgTable("equipments", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
})

// 页面配置表
export const pageConfigs = pgTable("page_configs", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // general, login, home, etc.
  description: varchar("description", { length: 255 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// 使用 createSchemaFactory 配置 date coercion
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
})

// User schemas
export const insertUserSchema = createCoercedInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  equipment: true,
  antenna: true,
  qth: true,
  role: true,
})

export const updateUserSchema = createCoercedInsertSchema(users)
  .pick({
    name: true,
    equipment: true,
    antenna: true,
    qth: true,
    password: true,
    role: true,
  })
  .partial()

// LogSession schemas
// [v1.5.13 安全] insertLogSessionSchema 收敛为白名单字段，禁止整表 schema 注入。
// controllerId/controllerName 虽在 schema 中保留（createLogSession 写库需要），
// 但其取值由服务端在路由层强制覆盖为登录身份，请求体传入值不可信、会被覆盖（见 sessions/route.ts / admin/sessions/route.ts）。
// id/createdAt/deletedAt/status 等系统字段一律不允许从请求体传入。
export const insertLogSessionSchema = createCoercedInsertSchema(logSessions)
  .pick({
    controllerId: true,
    controllerName: true,
    controllerEquipment: true,
    controllerAntenna: true,
    controllerQth: true,
    sessionTime: true,
    title: true,
    scheduledTime: true,
  })
export const updateLogSessionSchema = createCoercedInsertSchema(logSessions)
  .pick({
    controllerName: true,
    controllerEquipment: true,
    controllerAntenna: true,
    controllerQth: true,
    sessionTime: true,
    title: true,
    scheduledTime: true,
  })
  .partial()

// LogRecord schemas
export const insertLogRecordSchema = createCoercedInsertSchema(logRecords)
export const updateLogRecordSchema = createCoercedInsertSchema(logRecords)
  .pick({
    callsign: true,
    qth: true,
    equipment: true,
    antenna: true,
    power: true,
    signal: true,
    report: true,
    remarks: true,
  })
  .partial()

// Participant schemas
export const insertParticipantSchema = createCoercedInsertSchema(participants)
export const updateParticipantSchema = createCoercedInsertSchema(participants)
  .pick({
    callsign: true,
    name: true,
    qth: true,
    equipment: true,
    antenna: true,
    power: true,
    signal: true,
    report: true,
    remarks: true,
  })
  .partial()

// Equipment schemas
export const insertEquipmentSchema = createCoercedInsertSchema(equipments).pick({
  name: true,
  description: true,
})
export const updateEquipmentSchema = createCoercedInsertSchema(equipments)
  .pick({
    name: true,
    description: true,
  })
  .partial()

// PageConfig schemas
export const insertPageConfigSchema = createCoercedInsertSchema(pageConfigs).pick({
  key: true,
  value: true,
  category: true,
  description: true,
})
export const updatePageConfigSchema = createCoercedInsertSchema(pageConfigs)
  .pick({
    value: true,
    description: true,
  })
  .partial()

// TypeScript types
export type User = typeof users.$inferSelect
export type InsertUser = z.infer<typeof insertUserSchema>
export type UpdateUser = z.infer<typeof updateUserSchema>

export type LogSession = typeof logSessions.$inferSelect
export type InsertLogSession = z.infer<typeof insertLogSessionSchema>
export type UpdateLogSession = z.infer<typeof updateLogSessionSchema>

export type LogRecord = typeof logRecords.$inferSelect
export type InsertLogRecord = z.infer<typeof insertLogRecordSchema>
export type UpdateLogRecord = z.infer<typeof updateLogRecordSchema>

export type Participant = typeof participants.$inferSelect
export type InsertParticipant = z.infer<typeof insertParticipantSchema>
export type UpdateParticipant = z.infer<typeof updateParticipantSchema>

export type Equipment = typeof equipments.$inferSelect
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>
export type UpdateEquipment = z.infer<typeof updateEquipmentSchema>

export type PageConfig = typeof pageConfigs.$inferSelect
export type InsertPageConfig = z.infer<typeof insertPageConfigSchema>
export type UpdatePageConfig = z.infer<typeof updatePageConfigSchema>




