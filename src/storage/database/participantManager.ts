// @version v2.0.3
import { eq, and, SQL, like, sql } from "drizzle-orm"
import { getDb } from "./db"
import {
  participants,
  insertParticipantSchema,
  updateParticipantSchema,
} from "./shared/schema"
import type { Participant, InsertParticipant, UpdateParticipant } from "./shared/schema"

/**
 * [个人中心] participants 是早期就存在的表，项目用 tar 覆盖部署、没有 db:push 步骤，
 * 因此新增的「会员编号 / 执照」列必须在这里幂等补齐，否则线上查询会报列不存在。
 */
let ensurePromise: Promise<void> | null = null

async function ensureTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const db = await getDb()
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS participants (
          id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          callsign varchar(20) NOT NULL UNIQUE,
          name varchar(100),
          qth varchar(255),
          equipment varchar(255),
          antenna varchar(255),
          power varchar(50),
          signal varchar(50),
          report varchar(255),
          remarks text,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone
        )
      `)
      const columns = [
        "member_no varchar(10)",
        "license_no varchar(50)",
        "license_type varchar(20)",
        "operator_class varchar(30)",
        "license_issuer varchar(100)",
        "license_issue_date date",
        "license_expire_date date",
      ]
      for (const column of columns) {
        await db.execute(
          sql`ALTER TABLE participants ADD COLUMN IF NOT EXISTS ${sql.raw(column)}`
        )
      }
    })().catch((error) => {
      ensurePromise = null
      throw error
    })
  }
  return ensurePromise
}

export class ParticipantManager {
  async createParticipant(data: InsertParticipant): Promise<Participant> {
    await ensureTable()
    const db = await getDb()
    const validated = insertParticipantSchema.parse(data)
    const [participant] = await db.insert(participants).values(validated).returning()
    return participant
  }

  async getParticipantByCallsign(callsign: string): Promise<Participant | null> {
    await ensureTable()
    const db = await getDb()
    const [participant] = await db
      .select()
      .from(participants)
      .where(eq(participants.callsign, callsign))
    return participant || null
  }

  async getParticipantById(id: string): Promise<Participant | null> {
    await ensureTable()
    const db = await getDb()
    const [participant] = await db
      .select()
      .from(participants)
      .where(eq(participants.id, id))
    return participant || null
  }

  async getParticipants(options: {
    skip?: number
    limit?: number
    filters?: Partial<Pick<Participant, "callsign" | "name">>
  } = {}): Promise<Participant[]> {
    const { skip = 0, limit = 100, filters = {} } = options
    await ensureTable()
    const db = await getDb()

    const conditions: SQL[] = []
    if (filters.callsign !== undefined) {
      conditions.push(like(participants.callsign, `%${filters.callsign}%`))
    }
    if (filters.name !== undefined) {
      conditions.push(like(participants.name || "", `%${filters.name}%`))
    }

    // [v2.0.2 修复] 必须显式排序：Postgres 无 ORDER BY 时返回顺序不确定，
    // 更新过的行可能在物理位置上前后漂移，导致「limit 截断 + 前端本地搜索」时
    // 同一个会员有时能搜到、有时搜不到（BA4IGG 就是这样丢的）。
    if (conditions.length > 0) {
      return db
        .select()
        .from(participants)
        .where(and(...conditions))
        .orderBy(participants.callsign)
        .limit(limit)
        .offset(skip)
    }

    return db
      .select()
      .from(participants)
      .orderBy(participants.callsign)
      .limit(limit)
      .offset(skip)
  }

  async updateParticipant(
    id: string,
    data: UpdateParticipant
  ): Promise<Participant | null> {
    await ensureTable()
    const db = await getDb()
    const validated = updateParticipantSchema.parse(data)
    const [participant] = await db
      .update(participants)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(participants.id, id))
      .returning()
    return participant || null
  }

  async deleteParticipant(id: string): Promise<boolean> {
    await ensureTable()
    const db = await getDb()
    const result = await db.delete(participants).where(eq(participants.id, id))
    return (result.rowCount ?? 0) > 0
  }

  async getParticipantOptions(): Promise<
    { id: string; callsign: string; name: string | null; equipment: string | null }[]
  > {
    await ensureTable()
    const db = await getDb()
    return db
      .select({
        id: participants.id,
        callsign: participants.callsign,
        name: participants.name,
        equipment: participants.equipment,
      })
      .from(participants)
      .orderBy(participants.callsign)
  }
  async upsertParticipant(data: InsertParticipant): Promise<Participant> {
    await ensureTable()
    const db = await getDb()
    const validated = insertParticipantSchema.parse(data)
    const existing = await db.select().from(participants).where(eq(participants.callsign, validated.callsign)).limit(1)
    if (existing.length > 0) {
      const [updated] = await db.update(participants).set({ ...validated, updatedAt: new Date() }).where(eq(participants.id, existing[0].id)).returning()
      return updated
    }
    const [created] = await db.insert(participants).values({ ...validated, createdAt: new Date(), updatedAt: new Date() }).returning()
    return created
  }

}

export const participantManager = new ParticipantManager()
