// @version v2.0.6

/**
 * 支持档位（按"支持次数"分档，与金额完全脱钩）
 *
 * 同频 → 共振 → 长守 → 满格，是电台语境里的递进：
 * 想法一致 → 一起使劲 → 长期在场 → 信号最强。
 */
export type DonationTier = { label: string; min: number }

export const DONATION_TIERS: DonationTier[] = [
  { label: "同频", min: 1 },
  { label: "共振", min: 5 },
  { label: "长守", min: 10 },
  { label: "满格", min: 20 },
]

export type DonationLevel = {
  /** 当前档位名；未支持过为 null */
  label: string | null
  min: number | null
  /** 下一档；已到最高档为 null */
  nextLabel: string | null
  nextMin: number | null
  /** 距下一档还差几次 */
  remain: number | null
  /** 0-100 */
  progress: number
  /** 当前档位序号（0 起），未达标为 -1 */
  index: number
}

/** 按累计次数算当前档位与升级进度 */
export function computeDonationLevel(count: number): DonationLevel {
  const n = Math.max(0, Math.floor(count))
  let index = -1
  for (let i = 0; i < DONATION_TIERS.length; i += 1) {
    if (n >= DONATION_TIERS[i].min) index = i
  }

  const current = index >= 0 ? DONATION_TIERS[index] : null
  const next = index + 1 < DONATION_TIERS.length ? DONATION_TIERS[index + 1] : null

  if (!current) {
    // 还没支持过：按第一档算进度
    const first = DONATION_TIERS[0]
    return {
      label: null,
      min: null,
      nextLabel: first.label,
      nextMin: first.min,
      remain: first.min - n,
      progress: 0,
      index: -1,
    }
  }

  if (!next) {
    return {
      label: current.label,
      min: current.min,
      nextLabel: null,
      nextMin: null,
      remain: null,
      progress: 100,
      index,
    }
  }

  const span = next.min - current.min
  const done = n - current.min
  return {
    label: current.label,
    min: current.min,
    nextLabel: next.label,
    nextMin: next.min,
    remain: next.min - n,
    progress: Math.max(0, Math.min(100, Math.round((done / span) * 100))),
    index,
  }
}
