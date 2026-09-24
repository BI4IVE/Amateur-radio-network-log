// @version v1.5.22
import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, requireAdmin } from "@/lib/auth"
import {
  getWechatEnv,
  isWechatConfigured,
  isPushEnabled,
  getTemplateId,
} from "@/lib/wechat/config"

/**
 * [v1.5.21 微信推送] GET /api/admin/wechat/status
 *
 * 返回微信配置的「健全性检查」结果，**只回布尔值、绝不返回密钥明文**，
 * 供后台配置页在联调阶段判断 .env 是否配置齐全。
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const env = getWechatEnv()
    const templateId = await getTemplateId()
    const pushEnabled = await isPushEnabled()

    return NextResponse.json({
      env: {
        appId: Boolean(env.appId),
        appSecret: Boolean(env.appSecret),
        token: Boolean(env.token),
        encodingAesKey: Boolean(env.encodingAesKey),
        memberIdSalt: Boolean(env.memberIdSalt),
        templateIdEnv: Boolean(process.env.WECHAT_TEMPLATE_ID),
      },
      pushEnabled,
      templateId,
      // ready = 密钥齐全 + 模板ID 已配置，两者具备才可能真的发出消息
      ready: isWechatConfigured() && Boolean(templateId),
    })
  } catch (error) {
    console.error("Get wechat status error:", error)
    return NextResponse.json(
      { error: "获取微信配置状态失败" },
      { status: 500 }
    )
  }
}
