// @version v2.0.2
import { NextRequest, NextResponse } from "next/server"
import { buildAuthorizeUrl } from "@/lib/wechat/oauth"
import { oauthStateCookie } from "@/lib/wechat/session"

/**
 * [v2.0.2 安全] GET /api/wechat/authorize
 *
 * 绑定页的网页授权入口（对齐个人中心 /api/me/authorize）：
 * 随机生成 state 并写入短期 Cookie，302 到微信静默授权页，
 * 回调时校验 state 防止授权码串用 / CSRF。
 */

function siteOrigin(request: NextRequest): string {
  const envOrigin = process.env.WECHAT_SITE_ORIGIN?.replace(/\/$/, "")
  if (envOrigin) return envOrigin
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (request.nextUrl.protocol === "https:" ? "https" : "http")
  const host = request.headers.get("x-forwarded-host") || request.nextUrl.host
  return `${proto}://${host}`
}

function randomState(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function GET(request: NextRequest) {
  try {
    const state = randomState()
    const redirectUri = `${siteOrigin(request)}/api/wechat/oauth-callback`
    const url = buildAuthorizeUrl(redirectUri, state)

    const response = NextResponse.redirect(url)
    response.headers.append("Set-Cookie", oauthStateCookie(state))
    return response
  } catch (error) {
    console.error("[wechat.authorize] 生成授权链接失败:", error)
    return NextResponse.redirect(
      new URL("/wechat/bind?error=authorize", siteOrigin(request))
    )
  }
}
