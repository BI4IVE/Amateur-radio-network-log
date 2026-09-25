// @version v1.5.24
import { NextRequest, NextResponse } from "next/server"
import { buildAuthorizeUrl } from "@/lib/wechat/oauth"

/**
 * [v1.5.21 微信推送] GET /api/wechat/authorize-url
 *
 * 由服务端生成网页授权跳转链接（AppID 虽非机密，但统一由服务端拼装，
 * 便于后续调整 scope 或增加校验）。前端拿到后直接 location.href 跳转。
 */
export async function GET(request: NextRequest) {
  try {
    const redirectUri = request.nextUrl.searchParams.get("redirect_uri")
    if (!redirectUri) {
      return NextResponse.json({ error: "缺少 redirect_uri" }, { status: 400 })
    }

    let target: URL
    try {
      target = new URL(redirectUri)
    } catch {
      return NextResponse.json({ error: "redirect_uri 格式错误" }, { status: 400 })
    }

    // 反代（nginx）下 request.nextUrl.host 为上游地址（如 127.0.0.1:5000），
    // 会与浏览器端 origin（log.br4in.cn）不一致。需用真实外网 origin 校验。
    // 优先级：显式 WECHAT_SITE_ORIGIN 环境变量 > X-Forwarded 头 > nextUrl.origin
    const envOrigin = process.env.WECHAT_SITE_ORIGIN?.replace(/\/$/, "")
    const siteOrigin =
      envOrigin ||
      (() => {
        const proto =
          request.headers.get("x-forwarded-proto") ||
          (request.nextUrl.protocol === "https:" ? "https" : "http")
        const fwdHost =
          request.headers.get("x-forwarded-host") || request.nextUrl.host
        return `${proto}://${fwdHost}`
      })()

    if (target.origin !== siteOrigin) {
      return NextResponse.json(
        { error: "redirect_uri 必须为本站地址" },
        { status: 400 }
      )
    }

    const url = buildAuthorizeUrl(redirectUri)
    return NextResponse.json({ url })
  } catch (error) {
    console.error("Build authorize url error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成授权链接失败" },
      { status: 500 }
    )
  }
}
