/**
 * 将当前时间转换为北京时间 ISO 格式字符串（用于 datetime-local 输入框默认值）
 * @param date 可选的日期对象，默认为当前时间
 * @returns 北京时间的 ISO 格式字符串 (yyyy-MM-ddTHH:mm)
 */
export function toBeijingISOString(date: Date = new Date()): string {
  // 直接使用 UTC 时间，加 8 小时得到北京时间
  const beijingTimestamp = date.getTime() + (8 * 60 * 60 * 1000)
  const beijingDate = new Date(beijingTimestamp)

  const year = beijingDate.getUTCFullYear()
  const month = (beijingDate.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = beijingDate.getUTCDate().toString().padStart(2, '0')
  const hours = beijingDate.getUTCHours().toString().padStart(2, '0')
  const minutes = beijingDate.getUTCMinutes().toString().padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * 将UTC时间字符串转换为北京时间格式字符串（用于 datetime-local 输入框）
 * @param utcString UTC时间字符串
 * @returns 北京时间格式字符串 (yyyy-MM-ddTHH:mm)
 */
export function utcToBeijingLocalString(utcString: string): string {
  const date = new Date(utcString)
  // 转换为北京时间（UTC+8）
  const beijingTimestamp = date.getTime() + (8 * 60 * 60 * 1000)
  const beijingDate = new Date(beijingTimestamp)

  const year = beijingDate.getUTCFullYear()
  const month = (beijingDate.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = beijingDate.getUTCDate().toString().padStart(2, '0')
  const hours = beijingDate.getUTCHours().toString().padStart(2, '0')
  const minutes = beijingDate.getUTCMinutes().toString().padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * 将北京时间字符串转换为 UTC ISO 格式字符串（用于存储到数据库）
 * @param beijingString 北京时间字符串，格式为 yyyy-MM-ddTHH:mm
 * @returns UTC 的 ISO 格式字符串 (yyyy-MM-ddTHH:mm:ss.sssZ)
 */
export function beijingToUTCISOString(beijingString: string): string {
  // 解析北京时间字符串
  const [datePart, timePart] = beijingString.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)

  // 创建 UTC 时间的 Date 对象（将北京时间减去8小时）
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours - 8, minutes))

  return utcDate.toISOString()
}

/**
 * 将本地时间转换为 UTC ISO 格式字符串（用于存储到数据库）
 * @param date 日期对象
 * @returns UTC 的 ISO 格式字符串 (yyyy-MM-ddTHH:mm:ss.sssZ)
 */
export function toUTCISOString(date: Date): string {
  return date.toISOString()
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
