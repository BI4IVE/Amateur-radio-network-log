// @version v1.5.22
import { NextRequest, NextResponse } from "next/server"
import { codeToOpenid } from "@/lib/wechat/oauth"
import { getWechatSettings } from "@/lib/wechat/settings"
import { wechatBindingsManager } from "@/storage/database"

/**
 * [v1.5.21 微信推送] GET /api/wechat/status
 *
 * 除绑定状态外，一并返回 H5 页面渲染所需的配置：
 * bindMode（决定显示哪种表单）、siteName、bindNotice、allowSelfUnbind。
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const code = searchParams.get("code")
    const openidParam = searchParams.get("openid")

    let openid = openidParam?.trim() || ""
    if (!openid && code) {
      const result = await codeToOpenid(code)
      openid = result.openid
    }

    if (!openid) {
      return NextResponse.json(
        { error: "缺少 code 或 openid" },
        { status: 400 }
      )
    }

    const [binding, settings] = await Promise.all([
      wechatBindingsManager.getByOpenid(openid),
      getWechatSettings(),
    ])

    return NextResponse.json({
      openid,
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
