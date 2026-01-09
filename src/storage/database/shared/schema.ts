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
export const logSessions = pgTable("log_sessions", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  controllerId: varchar("controller_id", { length: 36 }).notNull(),
  controllerName: varchar("controller_name", { length: 100 }).notNull(),
  controllerEquipment: varchar("controller_equipment", { length: 255 }),
  controllerAntenna: varchar("controller_antenna", { length: 255 }),
  controllerQth: varchar("controller_qth", { length: 255 }),
  sessionTime: timestamp("session_time", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

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
  })
  .partial()

// LogSession schemas
export const insertLogSessionSchema = createCoercedInsertSchema(logSessions)
export const updateLogSessionSchema = createCoercedInsertSchema(logSessions)
  .pick({
    controllerName: true,
    controllerEquipment: true,
    controllerAntenna: true,
    controllerQth: true,
    sessionTime: true,
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




