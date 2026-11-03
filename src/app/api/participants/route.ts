// @version v2.0.5
import { NextRequest, NextResponse } from "next/server"
import { logManager, participantManager, wechatBindingsManager } from "@/storage/database"
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

    // [v2.0.6] 服务端搜索 + 分页：前端只取当前页，避免一次传几百 KB
    const paged = searchParams.get("paged") === "1"
    const page = Math.max(1, Number(searchParams.get("page")) || 1)
    const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize")) || 20))
    const keyword = (searchParams.get("q") ?? "").trim().toLowerCase()
    const bindingFilter = searchParams.get("binding") ?? "all"

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

    // [v2.0.5] 通联次数（设备参与 / 网络参与）：一次聚合，前端不再逐个查
    const includeCounts = searchParams.get("includeCounts") === "1"
    const split = includeCounts ? await logManager.getParticipationSplit() : null
    const totals = { total: 0, device: 0, network: 0 }

    const merged = participants.map((p) => {
      const binding = bindingMap.get(p.callsign.trim().toUpperCase())
      const c = split?.get(p.callsign.trim().toUpperCase())
      if (c) {
        const device = Math.max(0, c.total - c.network)
        totals.total += c.total
        totals.device += device
        totals.network += c.network
      }
      return {
        ...p,
        bindingStatus: binding?.status ?? null,
        counts: c
          ? {
              total: c.total,
              // 设备参与（真开了电台）
              device: Math.max(0, c.total - c.network),
              // 网络参与（TT / 抖音 / 滔滔 / 涛涛）
              network: c.network,
            }
          : null,
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

    // [v2.0.6] 服务端筛选 + 分页
    if (paged) {
      // 执照临期口径与前端一致：≤90 天内到期（含已过期）
      const isExpiring = (value: string | null | undefined) => {
        if (!value) return false
        const today = new Date()
        const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
        const t1 = Date.parse(`${value}T00:00:00Z`)
        if (Number.isNaN(t1)) return false
        const days = Math.round((t1 - t0) / 86400000)
        return days <= 90
      }

      const matched = merged.filter((p) => {
        if (keyword) {
          const hay = `${p.callsign ?? ""} ${p.name ?? ""} ${p.equipment ?? ""} ${p.memberNo ?? ""}`
          if (!hay.toLowerCase().includes(keyword)) return false
        }
        if (bindingFilter === "active") return p.bindingStatus === "active"
        if (bindingFilter === "pending") return p.bindingStatus === "pending"
        if (bindingFilter === "none") return !p.bindingStatus
        if (bindingFilter === "expiring") return isExpiring(p.licenseExpireDate)
        return true
      })

      const counts = {
        all: merged.length,
        active: merged.filter((p) => p.bindingStatus === "active").length,
        pending: merged.filter((p) => p.bindingStatus === "pending").length,
        none: merged.filter((p) => !p.bindingStatus).length,
        expiring: merged.filter((p) => isExpiring(p.licenseExpireDate)).length,
      }

      const total = matched.length
      const start = (page - 1) * pageSize
      const pageRows = matched.slice(start, start + pageSize)

      return NextResponse.json({
        participants: pageRows,
        total,
        page,
        pageSize,
        counts,
        pendingCount,
        missingProfiles,
        activeBindingCount: Array.from(bindingMap.values()).filter((b) => b.status === "active")
          .length,
        totals: includeCounts ? totals : null,
      })
    }

    return NextResponse.json({
      participants: merged,
      pendingCount,
      missingProfiles,
      activeBindingCount: Array.from(bindingMap.values()).filter(
        (b) => b.status === "active"
      ).length,
      // 全站汇总（会员中心四格数据）
      totals: includeCounts ? totals : null,
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
