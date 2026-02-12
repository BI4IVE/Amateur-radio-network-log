import { eq, and, SQL, sql } from "drizzle-orm"
import { getDb } from "coze-coding-dev-sdk"
import { pageConfigs, insertPageConfigSchema, updatePageConfigSchema } from "./shared/schema"
import type { PageConfig, InsertPageConfig, UpdatePageConfig } from "./shared/schema"

export class PageConfigManager {
  async createConfig(data: InsertPageConfig): Promise<PageConfig> {
    const db = await getDb()
    const validated = insertPageConfigSchema.parse(data)
    const [config] = await db.insert(pageConfigs).values(validated).returning()
    return config
  }

  async getConfigByKey(key: string): Promise<PageConfig | null> {
    const db = await getDb()
    const [config] = await db.select().from(pageConfigs).where(eq(pageConfigs.key, key))
    return config || null
  }

  async getConfigsByCategory(category: string): Promise<PageConfig[]> {
    const db = await getDb()
    return db.select().from(pageConfigs).where(eq(pageConfigs.category, category))
  }

  async getAllConfigs(): Promise<PageConfig[]> {
    const db = await getDb()
    return db.select().from(pageConfigs).orderBy(sql`category, key`)
  }

  async updateConfig(key: string, data: UpdatePageConfig): Promise<PageConfig | null> {
    const db = await getDb()
    const validated = updatePageConfigSchema.parse(data)
    const [config] = await db
      .update(pageConfigs)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(pageConfigs.key, key))
      .returning()
    return config || null
  }

  async upsertConfig(data: InsertPageConfig): Promise<PageConfig> {
    const db = await getDb()
    const existing = await this.getConfigByKey(data.key)
    
    if (existing) {
      return this.updateConfig(data.key, {
        value: data.value,
        description: data.description,
      }) as Promise<PageConfig>
    }
    
    return this.createConfig(data)
  }

  async deleteConfig(key: string): Promise<boolean> {
    const db = await getDb()
    const result = await db.delete(pageConfigs).where(eq(pageConfigs.key, key))
    return (result.rowCount ?? 0) > 0
  }

  /**
   * 批量初始化默认配置
   */
  async initializeDefaultConfigs(): Promise<void> {
    const defaultConfigs: InsertPageConfig[] = [
      // 通用配置
      {
        key: "site_title",
        value: "济南黄河业余无线电台网",
        category: "general",
        description: "网站标题",
      },
      {
        key: "version",
        value: "1.2.0",
        category: "general",
        description: "系统版本号",
      },
      {
        key: "contact_email",
        value: "contact@bi4ive.org",
        category: "general",
        description: "联系邮箱",
      },
      {
        key: "contact_phone",
        value: "",
        category: "general",
        description: "联系电话",
      },
      // 登录页配置
      {
        key: "login_title",
        value: "济南黄河业余无线电台<br/>台网主控日志",
        category: "login",
        description: "登录页标题",
      },
      {
        key: "login_subtitle",
        value: "登录系统",
        category: "login",
        description: "登录页副标题",
      },
      // 首页配置
      {
        key: "home_header_title",
        value: "济南黄河业余无线电台网主控日志",
        category: "home",
        description: "首页页头标题",
      },
      {
        key: "home_footer_text",
        value: "v1.0.2 By BR4IN",
        category: "home",
        description: "首页页脚文字",
      },
      // 会话详情页配置
      {
        key: "session_detail_title",
        value: "台网会话详情",
        category: "session",
        description: "会话详情页标题",
      },
    ]

    for (const config of defaultConfigs) {
      await this.upsertConfig(config)
    }
  }
}

export const pageConfigManager = new PageConfigManager()
