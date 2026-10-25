// @version v2.0.3
/**
 * [个人中心] 执照到期计算
 *
 * 全部按北京时间比较「日期」，不涉及时分秒：
 * 执照到期日当天仍算有效，次日起为已过期。
 */

export type LicenseState = "none" | "ok" | "soon" | "urgent" | "expired"

export type LicenseInfo = {
  state: LicenseState
  daysLeft: number | null
  /** 剩余比例（0-100），用于进度条；已过期固定 100 */
  progress: number | null
}

/** 北京时间的今天，格式 YYYY-MM-DD */
export function todayInBeijing(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

/** 两个 YYYY-MM-DD 之间的整天差（b - a） */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)
  if (Number.isNaN(ms)) return 0
  return Math.round(ms / 86400000)
}

/** 是否为合法的 YYYY-MM-DD */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = Date.parse(`${value}T00:00:00Z`)
  if (Number.isNaN(time)) return false
  // 排除 2026-02-31 这类「格式对但日期不存在」
  return new Date(time).toISOString().slice(0, 10) === value
}

export function computeLicenseInfo(
  issueDate: string | null | undefined,
  expireDate: string | null | undefined
): LicenseInfo {
  if (!expireDate || !isValidDateString(expireDate)) {
    return { state: "none", daysLeft: null, progress: null }
  }

  const today = todayInBeijing()
  const daysLeft = daysBetween(today, expireDate)

  let progress: number | null = null
  if (issueDate && isValidDateString(issueDate)) {
    const total = daysBetween(issueDate, expireDate)
    if (total > 0) {
      const used = daysBetween(issueDate, today)
      progress = Math.min(100, Math.max(0, Math.round((used / total) * 100)))
    }
  }

  const state: LicenseState =
    daysLeft < 0 ? "expired" : daysLeft <= 30 ? "urgent" : daysLeft <= 90 ? "soon" : "ok"

  return { state, daysLeft, progress: state === "expired" ? 100 : progress }
}

/** 中文状态文案（个人中心与后台共用） */
export const LICENSE_STATE_LABEL: Record<LicenseState, string> = {
  none: "未填写",
  ok: "有效",
  soon: "即将到期",
  urgent: "即将到期",
  expired: "已过期",
}
