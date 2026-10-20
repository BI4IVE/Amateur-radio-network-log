// @version v2.0.1
import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/permissions-server"
import { participantManager, wechatBindingsManager } from "@/storage/database"

/**
 * [v2.0.0] 为「已绑定微信但没有会员档案」的呼号补建空档案
 *
 * 背景：会员档案以 participants 为准，而微信绑定是另一张表。
 * 存在只绑定了微信、从未参与过台网的会员，导致「绑定 54 条 / 档案已绑定 45 条」对不上。
 * 这里由管理员显式点击补建，不做自动写入。
 */
export async function POST(request: NextRequest) {
  try {
    const authError = await checkPermission(request, "member.edit.profile")
    if (authError.error) {
      return NextResponse.json({ error: authError.error }, { status: 403 })
    }

    const { items } = await wechatBindingsManager.list({ limit: 5000 })
    const callsigns = Array.from(
      new Set(
        items
          .filter((b) => b.status === "active")
          .map((b) => b.callsign.trim().toUpperCase())
          .filter(Boolean)
      )
    )

    const existing = await participantManager.getParticipants({ limit: 5000 })
    const existingSet = new Set(
      existing.map((p) => p.callsign.trim().toUpperCase())
    )

    const created: string[] = []
    for (const callsign of callsigns) {
      if (existingSet.has(callsign)) continue
      await participantManager.createParticipant({ callsign })
      created.push(callsign)
    }

    return NextResponse.json({ ok: true, created: created.length, callsigns: created })
  } catch (error) {
    console.error("[backfill-bindings] 补建会员档案失败:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "补建失败" },
      { status: 500 }
    )
  }
}
