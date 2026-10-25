// @version v2.0.3
import { NextRequest, NextResponse } from "next/server"
import { buildAuthorizeUrl } from "@/lib/wechat/oauth"
import { oauthStateCookie } from "@/lib/wechat/session"

/**
 * [个人中心] GET /api/me/authorize
 *
 * 直接 302 到微信静默授权页（snsapi_base，用户无感）。
 * state 随机生成并存短期 Cookie，回调时比对，防止授权码被串用/CSRF。
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
    const redirectUri = `${siteOrigin(request)}/api/me/callback`
    const url = buildAuthorizeUrl(redirectUri, state)

    const response = NextResponse.redirect(url)
    response.headers.append("Set-Cookie", oauthStateCookie(state))
    return response
  } catch (error) {
    console.error("[me.authorize] 生成授权链接失败:", error)
    return NextResponse.redirect(
      new URL("/me?error=authorize", siteOrigin(request))
    )
  }
}
