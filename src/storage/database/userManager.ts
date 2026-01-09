import { eq, and, SQL, like } from "drizzle-orm"
import { getDb } from "coze-coding-dev-sdk"
import { users, insertUserSchema, updateUserSchema } from "./shared/schema"
import type { User, InsertUser, UpdateUser } from "./shared/schema"

export class UserManager {
  async createUser(data: InsertUser): Promise<User> {
    const db = await getDb()
    const validated = insertUserSchema.parse(data)
    const [user] = await db.insert(users).values(validated).returning()
    return user
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const db = await getDb()
    const [user] = await db.select().from(users).where(eq(users.username, username))
    return user || null
  }

  async getUserById(id: string): Promise<User | null> {
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
    const db = await getDb()
    const result = await db.delete(users).where(eq(users.id, id))
    return (result.rowCount ?? 0) > 0
  }

  async verifyPassword(username: string, password: string): Promise<boolean> {
    const user = await this.getUserByUsername(username)
    if (!user) return false
    // Convert both passwords to uppercase for case-insensitive comparison
    return user.password.toUpperCase() === password.toUpperCase()
  }

  async getUserOptions(): Promise<
    { id: string; name: string; equipment: string | null; antenna: string | null; qth: string | null }[]
  > {
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
