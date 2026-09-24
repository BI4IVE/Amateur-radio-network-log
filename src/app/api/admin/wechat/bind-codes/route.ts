// @version v1.5.22
import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, requireAdmin } from "@/lib/auth"
import { wechatBindCodesManager } from "@/storage/database"
import { getWechatSettings } from "@/lib/wechat/settings"

/**
 * [v1.5.21 微信推送] 后台一次性绑定码管理（绑定方式 = bindcode 时使用）
 *
 * GET    ?callsign=&status=&limit=&offset=  列表
 * POST   { callsigns: string[] }            批量生成（数量、有效期取自后台设置）
 * DELETE ?id=xxx                            作废
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const callsign = searchParams.get("callsign") || undefined
    const status = searchParams.get("status") || undefined
    const limit = Number(searchParams.get("limit") ?? 100) || 100
    const offset = Number(searchParams.get("offset") ?? 0) || 0

    const result = await wechatBindCodesManager.list({
      limit,
      offset,
      callsign,
      status,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("List bind codes error:", error)
    return NextResponse.json({ error: "获取绑定码列表失败" }, { status: 500 })
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
      callsigns?: string[]
    }

    const callsigns = Array.isArray(body.callsigns) ? body.callsigns : []
    if (callsigns.length === 0) {
      return NextResponse.json({ error: "请提供呼号列表" }, { status: 400 })
    }
    // 单次上限，避免误传超大列表拖垮接口
    if (callsigns.length > 500) {
      return NextResponse.json(
        { error: "单次最多生成 500 个绑定码" },
        { status: 400 }
      )
    }

    const settings = await getWechatSettings()
    const createdBy = (user as { userId?: string; id?: string } | null)?.userId ?? null

    const items = await wechatBindCodesManager.generateMany({
      callsigns,
      length: settings.bindCodeLength,
      hours: settings.bindCodeHours,
      createdBy: createdBy ?? undefined,
    })

    return NextResponse.json({ ok: true, items }, { status: 201 })
  } catch (error) {
    console.error("Generate bind codes error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成绑定码失败" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const id = request.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 })
    }

    const ok = await wechatBindCodesManager.disable(id)
    return NextResponse.json({ ok })
  } catch (error) {
    console.error("Disable bind code error:", error)
    return NextResponse.json({ error: "作废绑定码失败" }, { status: 500 })
  }
}
