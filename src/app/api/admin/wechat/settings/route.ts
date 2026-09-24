// @version v1.5.22
import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, requireAdmin } from "@/lib/auth"
import {
  getWechatSettings,
  saveWechatSettings,
  type WechatSettings,
} from "@/lib/wechat/settings"

/** GET /api/admin/wechat/settings - 读取全部微信业务设置 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const settings = await getWechatSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Get wechat settings error:", error)
    return NextResponse.json(
      { error: "获取微信设置失败" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/wechat/settings - 保存设置（只更新传入的字段）
 * 面向多中继台使用：所有业务参数均可在此修改，无需改代码或改 .env。
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const body = (await request.json().catch(() => ({}))) as Partial<WechatSettings>

    // 只接受已知字段，避免把任意数据写进配置表
    const allowed: (keyof WechatSettings)[] = [
      "pushEnabled",
      "templateId",
      "bindMode",
      "bindCodeHours",
      "bindCodeLength",
      "allowSelfUnbind",
      "pushOnlyToday",
      "pushDedupe",
      "siteName",
      "bindNotice",
      "keywordMap",
    ]
    const patch: Partial<WechatSettings> = {}
    const patchRecord = patch as Record<string, unknown>
    const bodyRecord = body as Record<string, unknown>
    for (const key of allowed) {
      if (key in bodyRecord) {
        patchRecord[key] = bodyRecord[key]
      }
    }

    // 认证方式取值校验，防止写入非法值导致绑定流程异常
    if (patch.bindMode && !["idcard", "bindcode", "manual"].includes(patch.bindMode)) {
      return NextResponse.json(
        { error: "bindMode 取值非法" },
        { status: 400 }
      )
    }

    const settings = await saveWechatSettings(patch)
    return NextResponse.json({ ok: true, settings })
  } catch (error) {
    console.error("Save wechat settings error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存微信设置失败" },
      { status: 500 }
    )
  }
}
