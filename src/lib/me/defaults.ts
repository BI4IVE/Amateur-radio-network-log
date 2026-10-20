// @version v2.0.1
import { pageConfigManager } from "@/storage/database"

/**
 * [v2.0.0] 会员档案默认值
 *
 * 发证机关这类字段各台网不同，不能在代码里写死。
 * 统一读 page_configs 的 `license_issuer_default`，后台「页面配置」可改；
 * 读不到就返回空串，前端保持空输入框，不会显示错误的地名。
 */

const TTL = 60_000
let cache: { value: string; at: number } | null = null

export async function getDefaultLicenseIssuer(): Promise<string> {
  if (cache && Date.now() - cache.at < TTL) return cache.value
  try {
    const config = await pageConfigManager.getConfigByKey(
      "license_issuer_default"
    )
    const value = config?.value?.trim() || ""
    cache = { value, at: Date.now() }
    return value
  } catch (error) {
    console.error("[me.defaults] 读取发证机关默认值失败:", error)
    return ""
  }
}

export function clearDefaultsCache(): void {
  cache = null
}
