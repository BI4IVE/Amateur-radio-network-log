// @version v2.0.4
import { NextRequest, NextResponse } from "next/server"
import { participantManager, wechatBindingsManager } from "@/storage/database"
import { getAuthUser } from "@/lib/auth"
import { checkPermission } from "@/lib/permissions-server"

/**
 * 会员档案（原「设备库」）
 *
 * GET    需要 member.view；带 includeBinding=1 时附上微信绑定状态
 * POST   需要 member.edit.profile
 * DELETE 需要 member.edit.profile
 */
export async function GET(request: NextRequest) {
  try {
    const authError = await checkPermission(request, "member.view")
    if (authError.error) {
      return NextResponse.json({ error: authError.error }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const callsign = searchParams.get("callsign") ?? undefined
    const name = searchParams.get("name") ?? undefined
    const limit = searchParams.get("limit")
    const includeBinding = searchParams.get("includeBinding") === "1"

    const participants = await participantManager.getParticipants({
      filters: { callsign, name },
      limit: limit ? parseInt(limit, 10) : undefined,
    })

    if (!includeBinding) {
      return NextResponse.json({ participants })
    }

    // 大量数据下也要一次查完再内存合并，避免 N+1
    const { items } = await wechatBindingsManager.list({ limit: 5000 })
    const bindingMap = new Map<string, { status: string; openid: string }>()
    for (const b of items) {
      const key = b.callsign.trim().toUpperCase()
      // 一个呼号可能有多个微信绑定：active 优先，其次 pending
      const prev = bindingMap.get(key)
      if (!prev || (prev.status !== "active" && b.status === "active")) {
        bindingMap.set(key, { status: b.status, openid: b.openid })
      }
    }

    const merged = participants.map((p) => {
      const binding = bindingMap.get(p.callsign.trim().toUpperCase())
      return {
        ...p,
        bindingStatus: binding?.status ?? null,
      }
    })

    const pendingCount = merged.filter((p) => p.bindingStatus === "pending").length

    // 已绑定微信、但通讯录里没有会员档案的呼号：
    // 这会导致「微信绑定 54 条」和「会员档案已绑定 45 条」对不上，
    // 单独返回给前端提示，由管理员一键补建档案（不自动写库）。
    const profileCallsigns = new Set(
      participants.map((p) => p.callsign.trim().toUpperCase())
    )
    const missingProfiles = Array.from(bindingMap.entries())
      .filter(([callsign, b]) => b.status === "active" && !profileCallsigns.has(callsign))
      .map(([callsign]) => callsign)
      .sort()

    return NextResponse.json({
      participants: merged,
      pendingCount,
      missingProfiles,
      activeBindingCount: Array.from(bindingMap.values()).filter(
        (b) => b.status === "active"
      ).length,
    })
  } catch (error) {
    console.error("Get participants error:", error)
    return NextResponse.json({ error: "获取会员列表失败" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await checkPermission(request, "member.edit.profile")
    if (authError.error) {
      return NextResponse.json({ error: authError.error }, { status: 403 })
    }

    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "需要登录" }, { status: 401 })
    }

    const body = await request.json()
    const { userRole: _, ...participantData } = body
    const participant = await participantManager.createParticipant(participantData)

    return NextResponse.json({ participant }, { status: 201 })
  } catch (error) {
    console.error("Create participant error:", error)
    return NextResponse.json({ error: "创建会员失败" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "缺少会员 ID" }, { status: 400 })
    }

    const authError = await checkPermission(request, "member.edit.profile")
    if (authError.error) {
      return NextResponse.json({ error: authError.error }, { status: 403 })
    }

    await participantManager.deleteParticipant(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete participant error:", error)
    return NextResponse.json({ error: "删除会员失败" }, { status: 500 })
  }
}
