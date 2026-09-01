// @version v1.5.20
// 极简 User-Agent 解析（不引入任何依赖）：只提取「系统 · 浏览器」，
// 用途是让管理员能一眼认出"这台设备是不是我的"，不追求精确。
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return "未知"

  const os = /iPad/.test(ua)
    ? "iPad"
    : /iPhone|iPod/.test(ua)
      ? "iPhone"
      : /Android/.test(ua)
        ? "Android"
        : /Windows NT 10/.test(ua)
          ? "Windows 10/11"
          : /Windows NT/.test(ua)
            ? "Windows"
            : /Mac OS X/.test(ua)
              ? "macOS"
              : /Linux/.test(ua)
                ? "Linux"
                : "未知系统"

  // 注意顺序：Edge/Chrome 的 UA 里也含 "Safari"，必须先判 Edge/Chrome
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : /PostmanRuntime|axios|node-fetch|curl|python-requests|WeChat/.test(ua)
              ? "程序/内置浏览器"
              : "未知浏览器"

  return `${os} · ${browser}`
}
