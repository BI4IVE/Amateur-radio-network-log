/**
 * 将本地时间转换为北京时间 ISO 格式字符串
 * @param date 可选的日期对象，默认为当前时间
 * @returns 北京时间的 ISO 格式字符串 (yyyy-MM-ddTHH:mm)
 */
export function toBeijingISOString(date: Date = new Date()): string {
  // 获取当前本地时间戳
  const localTimestamp = date.getTime()
  // 获取本地时区偏移（分钟），例如在北京时区是 -480
  const localOffset = date.getTimezoneOffset() * 60 * 1000
  // 计算 UTC 时间戳
  const utcTimestamp = localTimestamp + localOffset
  // 转换为北京时间（UTC+8）
  const beijingTimestamp = utcTimestamp + (8 * 60 * 60 * 1000)
  const beijingDate = new Date(beijingTimestamp)

  const year = beijingDate.getUTCFullYear()
  const month = (beijingDate.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = beijingDate.getUTCDate().toString().padStart(2, '0')
  const hours = beijingDate.getUTCHours().toString().padStart(2, '0')
  const minutes = beijingDate.getUTCMinutes().toString().padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * 格式化时间为 HH:mm 格式（北京时间 UTC+8）
 * @param dateString ISO格式的日期字符串
 * @returns HH:mm 格式的时间字符串
 */
export function formatTime(dateString: string | null): string {
  if (!dateString) return '-'

  // 解析日期（数据库返回的是 UTC 时间）
  const date = new Date(dateString)
  // 转换为北京时间（UTC+8）：直接在 UTC 时间戳上加 8 小时
  const beijingDate = new Date(date.getTime() + (8 * 60 * 60 * 1000))
  
  const hours = beijingDate.getUTCHours().toString().padStart(2, '0')
  const minutes = beijingDate.getUTCMinutes().toString().padStart(2, '0')

  return `${hours}:${minutes}`
}

/**
 * 格式化日期和时间为 yyyy-MM-dd HH:mm:ss 格式（北京时间 UTC+8）
 * @param dateString ISO格式的日期字符串
 * @returns 格式化的日期时间字符串
 */
export function formatDateTime(dateString: string): string {
  // 解析日期（数据库返回的是 UTC 时间）
  const date = new Date(dateString)
  // 转换为北京时间（UTC+8）：直接在 UTC 时间戳上加 8 小时
  const beijingDate = new Date(date.getTime() + (8 * 60 * 60 * 1000))
  
  const year = beijingDate.getUTCFullYear()
  const month = (beijingDate.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = beijingDate.getUTCDate().toString().padStart(2, '0')
  const hours = beijingDate.getUTCHours().toString().padStart(2, '0')
  const minutes = beijingDate.getUTCMinutes().toString().padStart(2, '0')
  const seconds = beijingDate.getUTCSeconds().toString().padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 格式化日期为 yyyy-MM-dd 格式（北京时间 UTC+8）
 * @param dateString ISO格式的日期字符串
 * @returns 格式化的日期字符串
 */
export function formatDate(dateString: string): string {
  // 解析日期（数据库返回的是 UTC 时间）
  const date = new Date(dateString)
  // 转换为北京时间（UTC+8）：直接在 UTC 时间戳上加 8 小时
  const beijingDate = new Date(date.getTime() + (8 * 60 * 60 * 1000))
  
  const year = beijingDate.getUTCFullYear()
  const month = (beijingDate.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = beijingDate.getUTCDate().toString().padStart(2, '0')

  return `${year}-${month}-${day}`
}
