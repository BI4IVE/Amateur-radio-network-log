// @version v1.5.17
import { eq, ilike, desc } from "drizzle-orm"
import { getDb } from "./db"
import {
  equipments,
  insertEquipmentSchema,
  updateEquipmentSchema,
  type InsertEquipment,
  type UpdateEquipment,
} from "./shared/schema"

export const equipmentManager = {
  // 获取设备列表
  async getEquipments(filters?: { name?: string }) {
    const db = await getDb()
    let query = db.select().from(equipments).$dynamic()

    if (filters?.name) {
      query = query.where(ilike(equipments.name, `%${filters.name}%`))
    }

    return await query.orderBy(desc(equipments.createdAt))
  },

  // 根据 ID 获取设备
  async getEquipmentById(id: string) {
    const db = await getDb()
    const result = await db
      .select()
      .from(equipments)
      .where(eq(equipments.id, id))
      .limit(1)
    return result[0] || null
  },

  // 根据名称获取设备
  async getEquipmentByName(name: string) {
    const db = await getDb()
    const result = await db
      .select()
      .from(equipments)
      .where(eq(equipments.name, name))
      .limit(1)
    return result[0] || null
  },

  // 创建设备
  async createEquipment(data: InsertEquipment) {
    const db = await getDb()
    const validated = insertEquipmentSchema.parse(data)
    const result = await db.insert(equipments).values(validated).returning()
    return result[0]
  },

  // 更新设备
  async updateEquipment(id: string, data: UpdateEquipment) {
    const db = await getDb()
    const validated = updateEquipmentSchema.parse(data)
    const result = await db
      .update(equipments)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(equipments.id, id))
      .returning()
    return result[0]
  },

  // 删除设备
  async deleteEquipment(id: string) {
    const db = await getDb()
    await db.delete(equipments).where(eq(equipments.id, id))
  },

  // 批量 upsert（基于名称去重）
  async upsertEquipments(items: Array<{ name: string; description?: string | null }>) {
    let created = 0
    let updated = 0
    const errors: string[] = []

    for (const item of items) {
      try {
        const existing = await this.getEquipmentByName(item.name)
        if (existing) {
          await this.updateEquipment(existing.id, { description: item.description })
          updated++
        } else {
          await this.createEquipment(item)
          created++
        }
      } catch (err) {
        errors.push(`${item.name}: ${(err as Error).message}`)
      }
    }

    return { created, updated, errors }
  },

  // 获取设备名称（用于下拉选择），支持按关键词过滤
  async getEquipmentNames(query?: string) {
    const db = await getDb()
    let result
    if (query && query.trim()) {
      result = await db
        .select({ name: equipments.name })
        .from(equipments)
        .where(ilike(equipments.name, `%${query.trim()}%`))
        .orderBy(equipments.name)
    } else {
      result = await db
        .select({ name: equipments.name })
        .from(equipments)
        .orderBy(equipments.name)
    }
    return result.map((r) => r.name)
  },

  /**
   * 自动同步设备到设备库（如果不存在则添加）
   * 用于台网录入时自动将新设备添加到设备库
   */
  async autoSyncEquipment(name: string): Promise<void> {
    if (!name || !name.trim()) return

    const trimmedName = name.trim()
    const db = await getDb()

    // 检查是否已存在
    const existing = await db
      .select({ id: equipments.id })
      .from(equipments)
      .where(eq(equipments.name, trimmedName))
      .limit(1)

    if (existing.length === 0) {
      // 不存在，自动添加
      await db.insert(equipments).values({ name: trimmedName })
    }
  },
}
