// @version v2.0.3
import { NextRequest, NextResponse } from "next/server"
import { getWechatSettings } from "@/lib/wechat/settings"
import { getMemberIdentity } from "@/lib/me/identity"
import { wechatBindingsManager } from "@/storage/database"

/**
 * [v1.5.21 微信推送] GET /api/wechat/status
 *
 * 除绑定状态外，一并返回 H5 页面渲染所需的配置：
 * bindMode（决定显示哪种表单）、siteName、bindNotice、allowSelfUnbind。
 *
 * [v2.0.2 安全] 身份只来自签名会话（wx_session），不接受客户端传入的 openid/code，
 * 否则任何人拿到 openid 就能查绑定信息。
 */
export async function GET(request: NextRequest) {
  try {
    const identity = await getMemberIdentity(request)
    if (!identity) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const [binding, settings] = await Promise.all([
      wechatBindingsManager.getByOpenid(identity.openid),
      getWechatSettings(),
    ])

    return NextResponse.json({
      openid: identity.openid,
      status: binding?.status ?? null, // active / pending / rejected / inactive / null(未绑定)
      callsign: binding?.callsign ?? null,
      bindMode: settings.bindMode,
      siteName: settings.siteName,
      bindNotice: settings.bindNotice,
      allowSelfUnbind: settings.allowSelfUnbind,
    })
  } catch (error) {
    console.error("Get wechat bind status error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "查询绑定状态失败",
      },
      { status: 500 }
    )
  }
}
