// @version v1.5.24
import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, requireAdmin } from "@/lib/auth"
import { wechatBindingsManager } from "@/storage/database"
import type { WechatBindStatus } from "@/storage/database/wechatBindingsManager"

/**
 * [v1.5.21 微信推送] 后台绑定管理
 *
 * GET  ?status=&callsign=&limit=&offset=  列表（不传 status 时按呼号模糊搜索全部）
 * POST { action, openid, callsign? }
 *      action = approve | reject | unbind | update-callsign
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const status = searchParams.get("status")
    const callsign = searchParams.get("callsign") || undefined
    const limit = Number(searchParams.get("limit") ?? 50) || 50
    const offset = Number(searchParams.get("offset") ?? 0) || 0

    if (status) {
      const result = await wechatBindingsManager.listByStatus(
        status as WechatBindStatus,
        { limit, offset, callsign }
      )
      return NextResponse.json(result)
    }

    const result = await wechatBindingsManager.list({ limit, offset, callsign })
    return NextResponse.json(result)
  } catch (error) {
    console.error("List wechat bindings error:", error)
    return NextResponse.json({ error: "获取绑定列表失败" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: string
      openid?: string
      callsign?: string
    }

    const { action, openid, callsign } = body
    if (!action || !openid) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 })
    }

    if (action === "approve" || action === "reject") {
      const ok = await wechatBindingsManager.review(openid, action === "approve")
      return NextResponse.json({ ok })
    }

    if (action === "unbind") {
      const ok = await wechatBindingsManager.unbind(openid)
      return NextResponse.json({ ok })
    }

    if (action === "update-callsign") {
      if (!callsign?.trim()) {
        return NextResponse.json({ error: "缺少呼号" }, { status: 400 })
      }
      const ok = await wechatBindingsManager.updateCallsign(openid, callsign)
      return NextResponse.json({ ok })
    }

    return NextResponse.json({ error: "未知的 action" }, { status: 400 })
  } catch (error) {
    console.error("Update wechat binding error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "操作失败" },
      { status: 500 }
    )
  }
}
