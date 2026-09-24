// @version v1.5.23
import { NextRequest, NextResponse } from "next/server"
import { codeToOpenid } from "@/lib/wechat/oauth"
import { getWechatSettings } from "@/lib/wechat/settings"
import { wechatBindingsManager } from "@/storage/database"

/**
 * [v1.5.21 微信推送] POST /api/wechat/unbind
 *
 * 用户自助解绑。是否允许由后台设置 wechat_allow_self_unbind 控制
 * （关闭后只能由管理员在后台解绑）。
 * 解绑采用「置为失效」而非物理删除，便于追溯，重新绑定会覆盖回对应状态。
 */
export async function POST(request: NextRequest) {
  try {
    const settings = await getWechatSettings()
    if (!settings.allowSelfUnbind) {
      return NextResponse.json(
        { error: "当前不允许自助解绑，请联系管理员" },
        { status: 403 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      code?: string
      openid?: string
    }

    let openid = body.openid?.trim() || ""
    if (!openid && body.code) {
      const result = await codeToOpenid(body.code)
      openid = result.openid
    }

    if (!openid) {
      return NextResponse.json({ error: "无法识别用户身份" }, { status: 400 })
    }

    const ok = await wechatBindingsManager.unbind(openid)
    if (!ok) {
      return NextResponse.json({ error: "未找到该用户的绑定" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Wechat unbind error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "解绑失败" },
      { status: 500 }
    )
  }
}
