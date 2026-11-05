// @version v2.0.6
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
    // [v2.0.4] 按「去空格 + 大写」匹配：历史数据里存在小写呼号，
    // 用精确匹配会查不到而走新建，进而撞 participants_callsign_unique。
    const [participant] = await db
      .select()
      .from(participants)
      .where(sql`upper(trim(${participants.callsign})) = upper(${callsign.trim()})`)
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

  /**
   * [v2.0.4] 呼号联想：在 SQL 里筛选 + 排序 + 截断，只取需要的列。
   *
   * 旧实现是「先把 2000 名会员全查出来（约 266KB）→ 在 JS 里 includes 过滤」，
   * 主控每打一个字就传一次整表，手机微信里明显卡顿；而且排序是纯字母序，
   * 「BI4」命中 148 条时用户要的人常被挤到第 11 位之后，看着就像"候选不对"。
   *
   * 现在：前缀命中优先 → 最近参与优先 → 字母序，只回 limit 条。
   */
  async searchByCallsign(callsign: string, limit = 10): Promise<Participant[]> {
    await ensureTable()
    const q = callsign.trim()
    if (q.length < 2) return []

    const db = await getDb()
    const like = `%${q}%`
    const prefix = `${q}%`

    const result = await db.execute(sql`
      with last_seen as (
        -- 先把每位呼号的最近参与时间聚合一次（全表 5k 行 ≈ 5ms），
        -- 不能写成每行一次的关联子查询：148 次 × 3ms 会让一次联想变成 500ms。
        select upper(trim(r.callsign)) as cs, max(s.session_time) as lt
        from log_records r
        join log_sessions s on r.session_id = s.id
        where r.deleted_at is null and s.deleted_at is null
        group by 1
      )
      select p.id, p.callsign, p.name, p.qth, p.equipment, p.antenna,
             p.power, p.signal, p.report, p.remarks
      from participants p
      left join last_seen l on l.cs = upper(trim(p.callsign))
      where upper(p.callsign) like upper(${like})
      order by
        case when upper(p.callsign) like upper(${prefix}) then 0 else 1 end,
        l.lt desc nulls last,
        p.callsign
      limit ${limit}
    `)

    const rows = (result as unknown as { rows?: Record<string, unknown>[] }).rows ?? []
    return rows as unknown as Participant[]
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
