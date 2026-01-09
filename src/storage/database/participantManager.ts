import { eq, and, SQL, like, sql } from "drizzle-orm"
import { getDb } from "coze-coding-dev-sdk"
import {
  participants,
  insertParticipantSchema,
  updateParticipantSchema,
} from "./shared/schema"
import type { Participant, InsertParticipant, UpdateParticipant } from "./shared/schema"

export class ParticipantManager {
  async createParticipant(data: InsertParticipant): Promise<Participant> {
    const db = await getDb()
    const validated = insertParticipantSchema.parse(data)
    const [participant] = await db.insert(participants).values(validated).returning()
    return participant
  }

  async getParticipantByCallsign(callsign: string): Promise<Participant | null> {
    const db = await getDb()
    const [participant] = await db
      .select()
      .from(participants)
      .where(eq(participants.callsign, callsign))
    return participant || null
  }

  async getParticipantById(id: string): Promise<Participant | null> {
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
    const db = await getDb()

    const conditions: SQL[] = []
    if (filters.callsign !== undefined) {
      conditions.push(like(participants.callsign, `%${filters.callsign}%`))
    }
    if (filters.name !== undefined) {
      conditions.push(like(participants.name || "", `%${filters.name}%`))
    }

    if (conditions.length > 0) {
      return db
        .select()
        .from(participants)
        .where(and(...conditions))
        .limit(limit)
        .offset(skip)
    }

    return db.select().from(participants).limit(limit).offset(skip)
  }

  async updateParticipant(
    id: string,
    data: UpdateParticipant
  ): Promise<Participant | null> {
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
    const db = await getDb()
    const result = await db.delete(participants).where(eq(participants.id, id))
    return (result.rowCount ?? 0) > 0
  }

  async getParticipantOptions(): Promise<
    { id: string; callsign: string; name: string | null; equipment: string | null }[]
  > {
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
}

export const participantManager = new ParticipantManager()
