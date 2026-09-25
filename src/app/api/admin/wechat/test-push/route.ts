// @version v1.5.25
import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, requireAdmin } from "@/lib/auth"
import {
  wechatBindingsManager,
  wechatPushLogManager,
} from "@/storage/database"
import { isWechatConfigured } from "@/lib/wechat/config"
import { sendTemplateMessage } from "@/lib/wechat/template"
import { clearAccessTokenCache } from "@/lib/wechat/accessToken"
import { formatDateTimeCN } from "@/utils/dateFormat"

/**
 * [v1.5.21 微信推送] POST /api/admin/wechat/test-push
 *
 * 联调关键接口：管理员可填 openid 或呼号试发一条模板消息，
 * 验证 AppID/AppSecret/模板ID 这条链路是否打通。结果写入 wechat_push_log。
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    if (!isWechatConfigured()) {
      return NextResponse.json(
        { error: "未配置 WECHAT_APPID / WECHAT_APPSECRET，无法推送" },
        { status: 400 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      openid?: string
      callsign?: string
    }

    let openid = body.openid?.trim() || ""
    let callsign = body.callsign?.trim() || ""

    // 只给了呼号时，取其第一个有效绑定（一个呼号可能被多个微信绑定）
    if (!openid && callsign) {
      const bindings = await wechatBindingsManager.listActiveByCallsign(callsign)
      if (bindings.length === 0) {
        return NextResponse.json(
          { error: `呼号 ${callsign} 暂无有效绑定` },
          { status: 404 }
        )
      }
      openid = bindings[0].openid
      callsign = bindings[0].callsign
    }

    if (!openid) {
      return NextResponse.json(
        { error: "请填写 openid 或呼号" },
        { status: 400 }
      )
    }

    const now = formatDateTimeCN(new Date())

    const result = await sendTemplateMessage(openid, {
      callsign: callsign || "TEST",
      qth: "测试 QTH",
      equipment: "测试设备",
      antenna: "测试天馈",
      signal: "59",
      time: now,
    })

    // access_token 失效（40001）时丢弃缓存，下次请求自动重新获取
    if (!result.ok && result.errcode === 40001) {
      clearAccessTokenCache()
    }

    await wechatPushLogManager.write({
      callsign: callsign || null,
      openid,
      status: result.ok ? "success" : "failed",
      errcode: result.errcode ?? null,
      errmsg: result.errmsg ?? null,
      msgid: result.msgid ?? null,
    })

    return NextResponse.json({
      ok: result.ok,
      errcode: result.errcode,
      errmsg: result.errmsg,
      msgid: result.msgid,
    })
  } catch (error) {
    console.error("Wechat test push error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "测试推送失败",
      },
      { status: 500 }
    )
  }
}
