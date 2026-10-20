// @version v2.0.0
import { eq, and, SQL, like, sql } from "drizzle-orm"
import { getDb } from "./db"
import { users, insertUserSchema, updateUserSchema } from "./shared/schema"
import type { User, InsertUser, UpdateUser } from "./shared/schema"

/**
 * [v1.5.29 权限] users 表加 permissions 列。
 * 项目用 tar 覆盖部署、没有 db:push 步骤，必须在运行时幂等补齐。
 */
let ensurePromise: Promise<void> | null = null

async function ensureTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const db = await getDb()
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
          id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          username varchar(50) NOT NULL UNIQUE,
          password varchar(255) NOT NULL,
          name varchar(100) NOT NULL,
          equipment varchar(255),
          antenna varchar(255),
          qth varchar(255),
          role varchar(20) NOT NULL DEFAULT 'user',
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone
        )
      `)
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions text`
      )
    })().catch((error) => {
      ensurePromise = null
      throw error
    })
  }
  return ensurePromise
}

export class UserManager {
  async createUser(data: InsertUser): Promise<User> {
    await ensureTable()
    const db = await getDb()
    const validated = insertUserSchema.parse(data)
    const [user] = await db.insert(users).values(validated).returning()
    return user
  }

  async getUserByUsername(username: string): Promise<User | null> {
    await ensureTable()
    const db = await getDb()
    const [user] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${username})`)
    return user || null
  }

  async getUserById(id: string): Promise<User | null> {
    await ensureTable()
    const db = await getDb()
    const [user] = await db.select().from(users).where(eq(users.id, id))
    return user || null
  }

  async getUsers(options: {
    skip?: number
    limit?: number
    filters?: Partial<Pick<User, "role">>
  } = {}): Promise<User[]> {
    const { skip = 0, limit = 100, filters = {} } = options
    await ensureTable()
    const db = await getDb()

    const conditions: SQL[] = []
    if (filters.role !== undefined) {
      conditions.push(eq(users.role, filters.role))
    }

    if (conditions.length > 0) {
      return db
        .select()
        .from(users)
        .where(and(...conditions))
        .limit(limit)
        .offset(skip)
    }

    return db.select().from(users).limit(limit).offset(skip)
  }

  async updateUser(id: string, data: UpdateUser): Promise<User | null> {
    await ensureTable()
    const db = await getDb()
    const validated = updateUserSchema.parse(data)
    const [user] = await db
      .update(users)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()
    return user || null
  }

  async deleteUser(id: string): Promise<boolean> {
    await ensureTable()
    const db = await getDb()
    const result = await db.delete(users).where(eq(users.id, id))
    return (result.rowCount ?? 0) > 0
  }

  async getUserOptions(): Promise<
    { id: string; name: string; equipment: string | null; antenna: string | null; qth: string | null }[]
  > {
    await ensureTable()
    const db = await getDb()
    return db
      .select({
        id: users.id,
        name: users.name,
        equipment: users.equipment,
        antenna: users.antenna,
        qth: users.qth,
      })
      .from(users)
      .orderBy(users.name)
  }
}

export const userManager = new UserManager()
