// @version v2.0.2
import { NextRequest, NextResponse } from "next/server"
import { codeToOpenid } from "@/lib/wechat/oauth"
import { wechatBindingsManager } from "@/storage/database"
import {
  clearOauthStateCookie,
  parseCookieHeader,
  signWechatSession,
  wechatSessionCookie,
  WX_OAUTH_STATE_COOKIE,
} from "@/lib/wechat/session"

/**
 * [个人中心] GET /api/me/callback
 *
 * 微信授权回调：校验 state → code 换 openid → 查绑定 → 签发 90 天会话 → 回 /me。
 * 未绑定的用户同样签发会话，由页面提示「请先绑定呼号」，而不是直接报错。
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
      return NextResponse.redirect(new URL("/me?error=nocode", origin))
    }
    // state 必须与发起授权时写入的一致，否则视为伪造/过期回调
    if (!state || !expectedState || state !== expectedState) {
      return NextResponse.redirect(new URL("/me?error=state", origin))
    }

    const { openid } = await codeToOpenid(code)
    if (!openid) {
      return NextResponse.redirect(new URL("/me?error=openid", origin))
    }

    // 提前查一次绑定，仅用于日志；页面会再查实时状态
    const binding = await wechatBindingsManager.getByOpenid(openid)
    console.log(
      `[me.callback] 登录成功 openid=${openid.slice(0, 8)}*** 绑定=${binding?.status ?? "none"}`
    )

    const token = await signWechatSession(openid)
    const response = NextResponse.redirect(new URL("/me", origin))
    response.headers.append("Set-Cookie", wechatSessionCookie(token))
    response.headers.append("Set-Cookie", clearOauthStateCookie())
    return response
  } catch (error) {
    console.error("[me.callback] 微信登录失败:", error)
    return NextResponse.redirect(new URL("/me?error=login", origin))
  }
}
