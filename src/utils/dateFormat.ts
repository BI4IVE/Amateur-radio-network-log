/**
 * 格式化时间为 HH:mm 格式
 * @param dateString ISO格式的日期字符串
 * @returns HH:mm 格式的时间字符串
 */
export function formatTime(dateString: string | null): string {
  if (!dateString) return '-'

  const date = new Date(dateString)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${hours}:${minutes}`
}

/**
 * 格式化日期和时间为 yyyy-MM-dd HH:mm:ss 格式
 * @param dateString ISO格式的日期字符串
 * @returns 格式化的日期时间字符串
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 格式化日期为 yyyy-MM-dd 格式
 * @param dateString ISO格式的日期字符串
 * @returns 格式化的日期字符串
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')

  return `${year}-${month}-${day}`
}
