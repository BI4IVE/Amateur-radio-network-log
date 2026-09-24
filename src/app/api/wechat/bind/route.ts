// @version v1.5.23
import { NextRequest, NextResponse } from "next/server"
import { codeToOpenid } from "@/lib/wechat/oauth"
import { performBind } from "@/lib/wechat/bindService"

/**
 * [v1.5.21 微信推送] POST /api/wechat/bind
 *
 * 具体认证方式由后台设置 wechat_bind_mode 决定（见 bindService）：
 *   idcard   → 需传 idLast6
 *   bindcode → 需传 bindCode
 *   manual   → 只传呼号，提交后进入待审核
 *
 * 安全要点：
 * - 认证失败统一返回「信息不匹配」，不提示哪一项错误
 * - 失败限频：同一 openid/IP 在 10 分钟内最多 5 次，防暴力尝试
 */

// 简易内存限频（多进程/集群下各进程独立计数，属降级防护，
// 目的是显著提高暴力枚举成本；更强的限制应放在网关层）
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 10 * 60 * 1000

function withinRateLimit(key: string): boolean {
  const now = Date.now()
  const rec = attempts.get(key)
  if (!rec || rec.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (rec.count >= MAX_ATTEMPTS) return false
  rec.count += 1
  return true
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      code?: string
      openid?: string
      callsign?: string
      idLast6?: string
      bindCode?: string
    }

    const callsign = body.callsign?.trim() || ""

    let openid = body.openid?.trim() || ""
    if (!openid && body.code) {
      const result = await codeToOpenid(body.code)
      openid = result.openid
    }
    if (!openid) {
      return NextResponse.json({ error: "无法识别用户身份" }, { status: 400 })
    }

    if (!callsign) {
      return NextResponse.json({ error: "请填写呼号" }, { status: 400 })
    }

    // 限频 key 优先用 openid，取不到时退回 IP
    const rateKey =
      openid || (request.headers.get("x-forwarded-for") ?? "unknown")
    if (!withinRateLimit(rateKey)) {
      return NextResponse.json(
        { error: "尝试次数过多，请稍后再试" },
        { status: 429 }
      )
    }

    const result = await performBind({
      openid,
      callsign,
      idLast6: body.idLast6,
      bindCode: body.bindCode,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      status: result.status,
      callsign: result.callsign,
    })
  } catch (error) {
    console.error("Wechat bind error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "绑定失败" },
      { status: 500 }
    )
  }
}
