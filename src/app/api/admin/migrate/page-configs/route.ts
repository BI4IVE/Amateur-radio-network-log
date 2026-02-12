import { NextResponse } from "next/server"
import { getDb } from "coze-coding-dev-sdk"
import { sql } from "drizzle-orm"

export async function POST() {
  try {
    const db = await getDb()

    // 创建页面配置表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS page_configs (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        description VARCHAR(255),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `)

    // 创建索引
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS page_configs_category_idx ON page_configs(category)
    `)

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS page_configs_key_idx ON page_configs(key)
    `)

    // 插入默认配置
    const defaultConfigs = [
      {
        key: 'site_title',
        value: '济南黄河业余无线电台网',
        category: 'general',
        description: '网站标题'
      },
      {
        key: 'version',
        value: '1.1.0',
        category: 'general',
        description: '系统版本号'
      },
      {
        key: 'contact_email',
        value: 'contact@bi4ive.org',
        category: 'general',
        description: '联系邮箱'
      },
      {
        key: 'contact_phone',
        value: '',
        category: 'general',
        description: '联系电话'
      },
      {
        key: 'login_title',
        value: '济南黄河业余无线电台<br/>台网主控日志',
        category: 'login',
        description: '登录页标题'
      },
      {
        key: 'login_subtitle',
        value: '登录系统',
        category: 'login',
        description: '登录页副标题'
      },
      {
        key: 'home_header_title',
        value: '济南黄河业余无线电台网主控日志',
        category: 'home',
        description: '首页页头标题'
      },
      {
        key: 'home_footer_text',
        value: 'v1.1.0 By BR4IN',
        category: 'home',
        description: '首页页脚文字'
      },
      {
        key: 'session_detail_title',
        value: '台网会话详情',
        category: 'session',
        description: '会话详情页标题'
      }
    ]

    for (const config of defaultConfigs) {
      await db.execute(sql`
        INSERT INTO page_configs (key, value, category, description)
        VALUES (${config.key}, ${config.value}, ${config.category}, ${config.description})
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          description = EXCLUDED.description,
          updated_at = NOW()
      `)
    }

    return NextResponse.json({ 
      message: "页面配置表创建成功，默认配置已初始化",
      count: defaultConfigs.length
    })
  } catch (error) {
    console.error("Create page configs table error:", error)
    return NextResponse.json(
      { error: "创建页面配置表失败" },
      { status: 500 }
    )
  }
}
