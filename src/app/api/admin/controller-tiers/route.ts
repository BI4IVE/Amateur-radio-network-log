// @version v2.0.6
/**
 * 后台「主控等级」配置
 *
 * GET  → 读取当前等级表（配置缺失/写坏时返回默认值）
 * POST → 校验并保存到 page_configs.controller_tiers（JSON）
 *
 * 权限沿用页面配置：pageconfig.manage。
 * 保存后立即生效（个人中心每次请求都读配置，不缓存）。
 */

import { NextRequest, NextResponse } from "next/server"
import { pageConfigManager } from "@/storage/database"
import { requirePermission } from "@/lib/permissions-server"
import {
  CONTROLLER_TIERS,
  CONTROLLER_TIERS_KEY,
  parseControllerTiers,
  type ControllerTier,
} from "@/lib/me/controllerLevel"

const MAX_TIERS = 6
const MIN_TIERS = 2

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "pageconfig.manage")
    if ("error" in auth) return auth.error

    const config = await pageConfigManager.getConfigByKey(CONTROLLER_TIERS_KEY)
    const tiers = parseControllerTiers(config?.value)
    return NextResponse.json({
      tiers,
      isDefault: !config?.value?.trim(),
      defaults: CONTROLLER_TIERS,
    })
  } catch (error) {
    console.error("[controller-tiers] 读取失败:", error)
    return NextResponse.json({ error: "读取主控等级失败" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "pageconfig.manage")
    if ("error" in auth) return auth.error

    const body = (await request.json().catch(() => ({}))) as {
      tiers?: { label?: unknown; min?: unknown }[]
    }
    const input = Array.isArray(body.tiers) ? body.tiers : []

    if (input.length < MIN_TIERS || input.length > MAX_TIERS) {
      return NextResponse.json(
        { error: `等级数量需在 ${MIN_TIERS}–${MAX_TIERS} 之间` },
        { status: 400 }
      )
    }

    const tiers: ControllerTier[] = []
    for (const item of input) {
      const label = String(item?.label ?? "").trim()
      const minRaw = Number(item?.min)
      if (!label) {
        return NextResponse.json({ error: "等级名称不能为空" }, { status: 400 })
      }
      if (!Number.isFinite(minRaw) || minRaw < 1) {
        return NextResponse.json({ error: "场次必须为不小于 1 的整数" }, { status: 400 })
      }
      tiers.push({ key: `t${tiers.length + 1}`, label: label.slice(0, 8), min: Math.floor(minRaw) })
    }

    tiers.sort((a, b) => a.min - b.min)
    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i].min <= tiers[i - 1].min) {
        return NextResponse.json(
          { error: "场次必须严格递增（后一级要大于前一级）" },
          { status: 400 }
        )
      }
    }

    const value = JSON.stringify(tiers.map((t) => ({ label: t.label, min: t.min })))
    await pageConfigManager.upsertConfig({
      key: CONTROLLER_TIERS_KEY,
      value,
      category: "member",
      description: "主控成长线等级门槛（JSON 数组：label + min，场次严格递增）",
    })

    return NextResponse.json({ ok: true, tiers })
  } catch (error) {
    console.error("[controller-tiers] 保存失败:", error)
    return NextResponse.json({ error: "保存主控等级失败" }, { status: 500 })
  }
}
