// @version v1.5.18
import { eq, and, SQL, sql } from "drizzle-orm"
import { getDb } from "./db"
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
   * 默认配置（模块级常量，供缺失检测与初始化共用）
   */
  // 默认配置 key 列表（静态，供缺失检测使用，不依赖 initializeDefaultConfigs 是否已执行）
  private static readonly DEFAULT_CONFIGS: InsertPageConfig[] = [
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
    {
      key: "session_edit_hours",
      value: "6",
      category: "session",
      description: "台网结束后可编辑时限（小时，0 表示不限制）",
    },
    // 证书配置（[v1.5.10] 参与证书生成页可配置项）
    {
      key: "cert_sign_unit",
      value: "济南黄河业余无线电台网活动",
      category: "certificate",
      description: "参与证书-签发单位（证书标题处）",
    },
    {
      key: "cert_sign_org",
      value: "济南黄河业余无线电中继台",
      category: "certificate",
      description: "参与证书-底部签发机构",
    },
    // 大屏配置（[v1.5.14] 实况大屏可配置项）
    {
      key: "screen_title",
      value: "济南黄河业余无线电中继台BR4IN台网大屏",
      category: "screen",
      description: "大屏顶部名称",
    },
    {
      key: "screen_rx_freq",
      value: "439.110",
      category: "screen",
      description: "接收频率",
    },
    {
      key: "screen_tx_freq",
      value: "434.110",
      category: "screen",
      description: "发射频率",
    },
    {
      key: "screen_tone",
      value: "88.5",
      category: "screen",
      description: "亚音",
    },
  ]

  // 返回所有默认配置的 key（静态列表，用于检测缺失项并自愈补齐）
  getDefaultConfigKeys(): string[] {
    return PageConfigManager.DEFAULT_CONFIGS.map((c) => c.key);
  }

  async initializeDefaultConfigs(): Promise<void> {
    for (const config of PageConfigManager.DEFAULT_CONFIGS) {
      await this.upsertConfig(config)
    }
  }
}

export const pageConfigManager = new PageConfigManager()
