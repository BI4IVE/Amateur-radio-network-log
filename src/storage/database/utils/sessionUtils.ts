// Session utility functions

/**
 * 检查会话是否过期（6小时）
 * @param sessionTime 会话时间（Date对象或ISO格式字符串）
 * @returns true 如果已过期，false 如果未过期
 */
export function isSessionExpired(sessionTime: Date | string): boolean {
  const sessionDate = sessionTime instanceof Date ? sessionTime : new Date(sessionTime)
  const now = new Date()
  const hoursDiff = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60)

  // 6小时及以后算过期
  return hoursDiff >= 6
}

/**
 * 获取会话剩余时间（小时）
 * @param sessionTime 会话时间（Date对象或ISO格式字符串）
 * @returns 剩余小时数，如果已过期返回 0
 */
export function getSessionRemainingHours(sessionTime: Date | string): number {
  const sessionDate = sessionTime instanceof Date ? sessionTime : new Date(sessionTime)
  const now = new Date()
  const hoursDiff = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60)

  return Math.max(0, 6 - hoursDiff)
}

/**
 * 获取会话剩余时间（格式化字符串）
 * @param sessionTime 会话时间（Date对象或ISO格式字符串）
 * @returns 剩余时间字符串，如 "2小时30分钟"
 */
export function getSessionRemainingTimeFormatted(sessionTime: Date | string): string {
  const hours = getSessionRemainingHours(sessionTime)

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
