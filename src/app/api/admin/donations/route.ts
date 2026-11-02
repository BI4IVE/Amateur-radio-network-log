// @version v2.0.6
import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/permissions-server"
import { donationManager } from "@/storage/database"

/**
 * 后台支持记录
 *
 * GET  需要 donation.view：列出最近记录（金额在这里是可以看到的，供对账）
 * POST 需要 donation.manage：录入一条支持记录
 */
export async function GET(request: NextRequest) {
  const guard = await requirePermission(request, "donation.view")
  if (guard.error) return guard.error

  try {
    const limitParam = request.nextUrl.searchParams.get("limit")
    const limit = Math.min(500, Math.max(20, Number(limitParam) || 200))
    const items = await donationManager.listRecent(limit)

    // 汇总（仅后台可见）：次数与金额合计
    let amountTotal = 0
    for (const it of items) {
      if (it.amount) amountTotal += Number(it.amount)
    }

    return NextResponse.json({
      items: items.map((it) => ({
        ...it,
        amount: it.amount === null ? null : Number(it.amount),
      })),
      count: items.length,
      amountTotal,
    })
  } catch (error) {
    console.error("List donations error:", error)
    return NextResponse.json({ error: "读取支持记录失败" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const guard = await requirePermission(request, "donation.manage")
  if (guard.error) return guard.error

  try {
    const body = await request.json()
    const callsign = String(body?.callsign ?? "").trim().toUpperCase()
    const donatedAt = String(body?.donatedAt ?? "").slice(0, 10)

    if (!callsign) {
      return NextResponse.json({ error: "请填写呼号" }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(donatedAt)) {
      return NextResponse.json({ error: "请选择支持日期" }, { status: 400 })
    }

    const rawAmount = body?.amount
    let amount: number | null = null
    if (rawAmount !== null && rawAmount !== undefined && String(rawAmount).trim() !== "") {
      const n = Number(rawAmount)
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: "金额需为不小于 0 的数字" }, { status: 400 })
      }
      amount = Math.round(n * 100) / 100
    }

    const kind = body?.kind === "aggregate" ? "aggregate" : "person"

    const record = await donationManager.create({
      callsign,
      amount,
      donatedAt,
      channel: body?.channel ? String(body.channel).slice(0, 30) : null,
      note: body?.note ? String(body.note).slice(0, 120) : null,
      anonymous: Boolean(body?.anonymous),
      kind,
      createdBy: guard.user.username ?? null,
    })

    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    console.error("Create donation error:", error)
    return NextResponse.json({ error: "录入支持记录失败" }, { status: 500 })
  }
}
