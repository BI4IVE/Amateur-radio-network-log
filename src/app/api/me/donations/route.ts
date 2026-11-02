// @version v2.0.6
import { NextRequest, NextResponse } from "next/server"
import { getMemberIdentity, isActiveMember } from "@/lib/me/identity"
import { computeDonationLevel } from "@/lib/me/donationTier"
import { donationManager } from "@/storage/database"

/**
 * [个人中心] GET /api/me/donations
 *
 * 返回本人支持记录：累计次数、档位、起始年、明细。
 * 只返回最近一年内的金额，更早的记录 amount 为 null（前端拿不到历史金额）。
 */
export async function GET(request: NextRequest) {
  try {
    const identity = await getMemberIdentity(request)
    if (!identity) {
      return NextResponse.json({ error: "未登录", needLogin: true }, { status: 401 })
    }
    if (!isActiveMember(identity)) {
      return NextResponse.json({ error: "会员未生效", needLogin: true }, { status: 401 })
    }

    const callsign = identity.callsign
    // 只统计个人捐助：汇总/其他收入（kind=aggregate）不进个人中心档位
    const records = await donationManager.listByCallsign(callsign, 200, "person")

    const now = Date.now()
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000
    const level = computeDonationLevel(records.length)

    const years = new Set<string>()
    let firstYear: number | null = null
    for (const r of records) {
      const y = r.donatedAt.slice(0, 4)
      if (y) years.add(y)
      const n = Number(y)
      if (Number.isFinite(n) && n > 0 && (firstYear === null || n < firstYear)) firstYear = n
    }

    const items = records.map((r) => {
      const at = new Date(`${r.donatedAt}T23:59:59+08:00`).getTime()
      const withinYear = Number.isFinite(at) ? at >= oneYearAgo : false
      return {
        id: r.id,
        date: r.donatedAt,
        channel: r.channel,
        note: r.note,
        anonymous: r.anonymous,
        // 一年内的记录才带金额；物资（amount 为空）保持 null
        amount: withinYear && r.amount !== null ? Number(r.amount) : null,
        withinYear,
      }
    })

    return NextResponse.json({
      count: records.length,
      firstYear,
      years: years.size,
      lastDate: records[0]?.donatedAt ?? null,
      level,
      items,
    })
  } catch (error) {
    console.error("Get my donations error:", error)
    return NextResponse.json({ error: "获取支持记录失败" }, { status: 500 })
  }
}
