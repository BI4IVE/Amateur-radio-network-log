// @version v2.0.4
/**
 * [v2.0.4] 主控成长线：按「担任主控的已开台场次」分级
 *
 * 默认：1 初登场 → 10 见习主控 → 25 常任主控 → 50 资深主控 → 100 台网支柱
 * 门槛不写死：后台「主控等级」页可改，存 page_configs 的 controller_tiers（JSON），
 * 本文件负责解析、校验与兜底。
 *
 * 口径说明：
 * - 只统计已开台的场次（status <> 'scheduled'，预告未开台不计）；
 * - 呼号归一（去空格 + 大写）后按 controller_name 聚合。
 */

export type ControllerTier = {
  key: string
  label: string
  /** 达到该等级所需场次 */
  min: number
}

export const CONTROLLER_TIERS: ControllerTier[] = [
  { key: "t1", label: "初登场", min: 1 },
  { key: "t2", label: "见习主控", min: 10 },
  { key: "t3", label: "常任主控", min: 25 },
  { key: "t4", label: "资深主控", min: 50 },
  { key: "t5", label: "台网支柱", min: 100 },
]

/** 配置项在 page_configs 里的 key */
export const CONTROLLER_TIERS_KEY = "controller_tiers"

const MIN_TIERS = 2
const MAX_TIERS = 6

/**
 * 解析后台配置的等级表；任何不合法（坏 JSON / 空 / 不递增 / 越界）都回退默认值，
 * 保证统计链路不会因为配置写坏而崩掉。
 */
export function parseControllerTiers(raw?: string | null): ControllerTier[] {
  if (!raw || !raw.trim()) return CONTROLLER_TIERS
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return CONTROLLER_TIERS

    const tiers: ControllerTier[] = []
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue
      const label = String((item as { label?: unknown }).label ?? "").trim()
      const minRaw = Number((item as { min?: unknown }).min)
      if (!label) continue
      if (!Number.isFinite(minRaw)) continue
      const min = Math.floor(minRaw)
      if (min < 1) continue
      tiers.push({ key: `t${tiers.length + 1}`, label: label.slice(0, 8), min })
    }

    if (tiers.length < MIN_TIERS || tiers.length > MAX_TIERS) return CONTROLLER_TIERS
    tiers.sort((a, b) => a.min - b.min)
    // 门槛必须严格递增，否则分级会重叠
    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i].min <= tiers[i - 1].min) return CONTROLLER_TIERS
    }
    return tiers
  } catch {
    return CONTROLLER_TIERS
  }
}

export type ControllerLevelInfo = {
  /** 当前等级名称 */
  label: string
  /** 当前等级门槛 */
  min: number
  /** 距离下一级的场次数；已满级为 null */
  remain: number | null
  /** 下一级名称；已满级为 null */
  nextLabel: string | null
  /** 下一级门槛；已满级为 null */
  nextMin: number | null
  /** 当前等级区间内的进度（0–100），满级固定 100 */
  progress: number
}

/** 根据主控场次计算等级与进度 */
export function computeControllerLevel(
  sessions: number,
  tiers: ControllerTier[] = CONTROLLER_TIERS
): ControllerLevelInfo {
  const list = tiers.length >= MIN_TIERS ? tiers : CONTROLLER_TIERS
  const n = Math.max(0, Math.floor(Number(sessions) || 0))

  let index = 0
  for (let i = 0; i < list.length; i++) {
    if (n >= list[i].min) index = i
  }

  const current = list[index]
  const next = list[index + 1] ?? null

  if (!next) {
    return {
      label: current.label,
      min: current.min,
      remain: null,
      nextLabel: null,
      nextMin: null,
      progress: 100,
    }
  }

  const span = Math.max(1, next.min - current.min)
  const done = Math.max(0, n - current.min)
  return {
    label: current.label,
    min: current.min,
    remain: Math.max(0, next.min - n),
    nextLabel: next.label,
    nextMin: next.min,
    progress: Math.min(100, Math.round((done / span) * 100)),
  }
}
