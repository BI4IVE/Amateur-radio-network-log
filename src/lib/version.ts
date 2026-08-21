// @version v1.5.15
// 版本号兜底常量与比对工具。
//
// 设计原则（与后台策略一致）：
// - 真实的当前版本号以数据库 page_configs.version 为准（后台只读展示，不可手动改）。
// - 本文件仅提供「兜底版本号」：当数据库连接异常 / 未取到 version 时，
//   登录页与版本检测接口统一回退到 FALLBACK_VERSION，避免出现杂乱的硬编码字面量。
// - 升级成功后由在线升级逻辑回写数据库 version，本常量不会被程序自动改写。

// 兜底版本号（当数据库读不到 version 时使用）。当前与初始部署版本保持一致。
export const FALLBACK_VERSION = "1.1.0"

// 当前部署代码的版本号。
// 发版时请同步更新此值（与 public/version/upgrade-manifest.json 的 latest 保持一致）。
// 用途：检测接口比对时，若「数据库 version 落后于清单 latest」但「本次部署代码版本已 >= latest」，
// 说明管理员已把代码更新到与远程一致，则自动把数据库 version 回写为最新版，避免一直提示有新版本。
export const CODE_VERSION = "1.5.15"

/**
 * 比较版本号大小。
 * 返回 1 表示 a > b，返回 -1 表示 a < b，返回 0 表示相等。
 * 支持 主.次.修订 三段式，缺失段按 0 处理；忽略前缀 v。
 */
export function compareVersion(a: string, b: string): number {
  const normalize = (v: string) =>
    (v || "")
      .replace(/^v/i, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0)

  const av = normalize(a)
  const bv = normalize(b)

  for (let i = 0; i < Math.max(av.length, bv.length); i++) {
    const x = av[i] ?? 0
    const y = bv[i] ?? 0
    if (x > y) return 1
    if (x < y) return -1
  }
  return 0
}

// 判断 remote 是否为比 local 更新的版本
export function isNewerVersion(local: string, remote: string): boolean {
  return compareVersion(remote, local) > 0
}
