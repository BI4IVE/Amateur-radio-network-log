// @version v2.0.2
import { NextRequest, NextResponse } from "next/server"
import { codeToOpenid } from "@/lib/wechat/oauth"
import {
  clearOauthStateCookie,
  parseCookieHeader,
  signWechatSession,
  wechatSessionCookie,
  WX_OAUTH_STATE_COOKIE,
} from "@/lib/wechat/session"

/**
 * [v2.0.2 安全] GET /api/wechat/oauth-callback
 *
 * 绑定页的网页授权回调（对齐个人中心 /api/me/callback）：
 * 校验 state → code 换 openid → 签发 90 天签名会话 → 回 /wechat/bind。
 * 未绑定用户同样签发会话，由页面提示「请先绑定呼号」。
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

export async function GET(request: NextRequest) {
  const origin = siteOrigin(request)

  try {
    const { searchParams } = request.nextUrl
    const code = searchParams.get("code") || ""
    const state = searchParams.get("state") || ""

    const cookies = parseCookieHeader(request.headers.get("cookie"))
    const expectedState = cookies[WX_OAUTH_STATE_COOKIE] || ""

    if (!code) {
      return NextResponse.redirect(new URL("/wechat/bind?error=nocode", origin))
    }
    // state 必须与发起授权时写入的一致，否则视为伪造/过期回调
    if (!state || !expectedState || state !== expectedState) {
      return NextResponse.redirect(new URL("/wechat/bind?error=state", origin))
    }

    const { openid } = await codeToOpenid(code)
    if (!openid) {
      return NextResponse.redirect(new URL("/wechat/bind?error=openid", origin))
    }

    const token = await signWechatSession(openid)
    const response = NextResponse.redirect(new URL("/wechat/bind", origin))
    response.headers.append("Set-Cookie", wechatSessionCookie(token))
    response.headers.append("Set-Cookie", clearOauthStateCookie())
    return response
  } catch (error) {
    console.error("[wechat.oauth-callback] 微信授权失败:", error)
    return NextResponse.redirect(new URL("/wechat/bind?error=login", origin))
  }
}
