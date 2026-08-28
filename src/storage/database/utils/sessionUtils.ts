// @version v1.5.18
// Session utility functions
import { pageConfigManager } from "../pageConfigManager"

/** 默认编辑时限（小时），当 page_configs 未配置时兜底 */
const DEFAULT_EDIT_HOURS = 6

/**
 * 读取后台配置的"台网结束后可编辑时限"（小时）。
 * 优先取 page_configs 的 session_edit_hours，缺失/非法时回退默认 6 小时。
 */
export async function getSessionEditHours(): Promise<number> {
  try {
    const config = await pageConfigManager.getConfigByKey("session_edit_hours")
    const value = config?.value
    if (value != null && value !== "") {
      const parsed = Number(value)
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed
      }
    }
  } catch {
    // 配置读取失败时回退默认值，避免影响正常编辑流程
  }
  return DEFAULT_EDIT_HOURS
}

/**
 * 检查会话是否过期（时限由后台配置，默认 6 小时）
 * @param sessionTime 会话时间（Date对象或ISO格式字符串）
 * @returns true 如果已过期，false 如果未过期
 */
export async function isSessionExpired(sessionTime: Date | string): Promise<boolean> {
  const sessionDate = sessionTime instanceof Date ? sessionTime : new Date(sessionTime)
  const now = new Date()
  const hoursDiff = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60)

  const limit = await getSessionEditHours()
  // 达到时限及以后算过期
  return hoursDiff >= limit
}

/**
 * 获取会话剩余时间（小时）
 * @param sessionTime 会话时间（Date对象或ISO格式字符串）
 * @returns 剩余小时数，如果已过期返回 0
 */
export async function getSessionRemainingHours(sessionTime: Date | string): Promise<number> {
  const sessionDate = sessionTime instanceof Date ? sessionTime : new Date(sessionTime)
  const now = new Date()
  const hoursDiff = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60)

  const limit = await getSessionEditHours()
  return Math.max(0, limit - hoursDiff)
}

/**
 * 获取会话剩余时间（格式化字符串）
 * @param sessionTime 会话时间（Date对象或ISO格式字符串）
 * @returns 剩余时间字符串，如 "2小时30分钟"
 */
export async function getSessionRemainingTimeFormatted(sessionTime: Date | string): Promise<string> {
  const hours = await getSessionRemainingHours(sessionTime)

  if (hours <= 0) {
    return "已过期"
  }

  const totalMinutes = Math.floor(hours * 60)
  const remainingHours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  if (remainingMinutes === 0) {
    return `${remainingHours}小时`
  }

  return `${remainingHours}小时${remainingMinutes}分钟`
}
