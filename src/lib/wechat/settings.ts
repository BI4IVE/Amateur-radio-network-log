// @version v1.5.22
import { pageConfigManager } from "@/storage/database"

/**
 * [v1.5.21 微信推送] 微信业务设置（全部后台可改）
 *
 * 设计前提：本程序面向多个中继台/组织使用，因此**所有业务参数都必须可在后台修改**，
 * 不得在代码里硬编码任何站点专属内容（站点名称、认证方式、绑定码规则、模板字段映射等）。
 *
 * 存放：统一写入 page_configs（category = "wechat"），后台「微信推送 → 配置」页面修改后立即生效。
 * 例外：AppID / AppSecret / Token / AESKey / SALT 等密钥仍走 .env（见 config.ts），
 *       密钥变更需重启服务，且不应存入数据库。
 */

export type BindMode = "idcard" | "bindcode" | "manual"

export type WechatSettings = {
  /** 推送总开关：关闭时记录提交不触发任何推送 */
  pushEnabled: boolean
  /** 模板消息模板 ID（也可由 .env 的 WECHAT_TEMPLATE_ID 兜底） */
  templateId: string
  /** 绑定认证方式：idcard=身份证后六位 / bindcode=一次性绑定码 / manual=人工审核 */
  bindMode: BindMode
  /** 绑定码有效期（小时），0 表示长期有效 */
  bindCodeHours: number
  /** 绑定码长度（位） */
  bindCodeLength: number
  /** 是否允许用户自助解绑 */
  allowSelfUnbind: boolean
  /** 是否只推送「今天」的台网场次（关掉则补录历史也会推） */
  pushOnlyToday: boolean
  /** 同一场次同一呼号是否只推一次 */
  pushDedupe: boolean
  /** 站点/组织名称（H5 页面展示，通用化关键项） */
  siteName: string
  /** H5 绑定页说明文案 */
  bindNotice: string
  /**
   * 模板 keyword 映射：{ keyword1: "callsign", keyword2: "qth", ... }
   * 不同中继台可选用不同模板，因此在后台配置字段与 keyword 的对应关系。
   */
  keywordMap: Record<string, string>
}

export const DEFAULT_WECHAT_SETTINGS: WechatSettings = {
  pushEnabled: false,
  templateId: "",
  bindMode: "idcard",
  bindCodeHours: 24,
  bindCodeLength: 6,
  allowSelfUnbind: true,
  pushOnlyToday: true,
  pushDedupe: true,
  siteName: "业余无线电台网",
  bindNotice: "绑定呼号后，主控台提交您的参与记录时会自动收到微信回执。",
  keywordMap: {
    keyword1: "callsign",
    keyword2: "qth",
    keyword3: "equipment",
    keyword4: "antenna",
    keyword5: "signal",
    keyword6: "time",
  },
}

/** 设置项 → page_configs 的 key 映射 */
const SETTING_KEYS: Record<keyof WechatSettings, string> = {
  pushEnabled: "wechat_push_enabled",
  templateId: "wechat_template_id",
  bindMode: "wechat_bind_mode",
  bindCodeHours: "wechat_bind_code_hours",
  bindCodeLength: "wechat_bind_code_len",
  allowSelfUnbind: "wechat_allow_self_unbind",
  pushOnlyToday: "wechat_push_only_today",
  pushDedupe: "wechat_push_dedupe",
  siteName: "wechat_site_name",
  bindNotice: "wechat_bind_notice",
  keywordMap: "wechat_template_keywords",
}

/** 各设置的中文说明（写入 page_configs.description，便于后台查看） */
const SETTING_DESC: Record<keyof WechatSettings, string> = {
  pushEnabled: "微信模板消息推送总开关",
  templateId: "微信模板消息模板ID",
  bindMode: "绑定认证方式（idcard/bindcode/manual）",
  bindCodeHours: "绑定码有效期（小时，0=长期有效）",
  bindCodeLength: "绑定码长度（位）",
  allowSelfUnbind: "是否允许用户自助解绑",
  pushOnlyToday: "是否仅推送今天的台网场次",
  pushDedupe: "同一场次同一呼号是否只推一次",
  siteName: "站点/组织名称（H5 绑定页展示）",
  bindNotice: "H5 绑定页说明文案",
  keywordMap: "模板 keyword 与字段的映射（JSON）",
}

function toBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === "") return fallback
  return raw === "true" || raw === "1"
}

function toNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function toBindMode(raw: string | undefined): BindMode {
  if (raw === "bindcode" || raw === "manual" || raw === "idcard") return raw
  return DEFAULT_WECHAT_SETTINGS.bindMode
}

function toKeywordMap(raw: string | undefined): Record<string, string> {
  if (!raw) return { ...DEFAULT_WECHAT_SETTINGS.keywordMap }
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
  } catch {
    // 配置被写坏时回退默认映射，避免整个推送链路挂掉
  }
  return { ...DEFAULT_WECHAT_SETTINGS.keywordMap }
}

/**
 * 读取全部微信业务设置（一次查询 page_configs 全表后按 category 过滤）。
 * 任何异常都回退默认值，保证配置表异常时系统其余功能不受影响。
 */
export async function getWechatSettings(): Promise<WechatSettings> {
  try {
    const configs = await pageConfigManager.getAllConfigs()
    const map = new Map<string, string>()
    for (const c of configs) {
      if (c.category === "wechat") map.set(c.key, c.value ?? "")
    }

    const get = (field: keyof WechatSettings) => map.get(SETTING_KEYS[field])

    return {
      pushEnabled: toBool(get("pushEnabled"), DEFAULT_WECHAT_SETTINGS.pushEnabled),
      templateId: get("templateId") ?? DEFAULT_WECHAT_SETTINGS.templateId,
      bindMode: toBindMode(get("bindMode")),
      bindCodeHours: toNumber(get("bindCodeHours"), DEFAULT_WECHAT_SETTINGS.bindCodeHours),
      bindCodeLength: toNumber(get("bindCodeLength"), DEFAULT_WECHAT_SETTINGS.bindCodeLength),
      allowSelfUnbind: toBool(get("allowSelfUnbind"), DEFAULT_WECHAT_SETTINGS.allowSelfUnbind),
      pushOnlyToday: toBool(get("pushOnlyToday"), DEFAULT_WECHAT_SETTINGS.pushOnlyToday),
      pushDedupe: toBool(get("pushDedupe"), DEFAULT_WECHAT_SETTINGS.pushDedupe),
      siteName: get("siteName") || DEFAULT_WECHAT_SETTINGS.siteName,
      bindNotice: get("bindNotice") || DEFAULT_WECHAT_SETTINGS.bindNotice,
      keywordMap: toKeywordMap(get("keywordMap")),
    }
  } catch (error) {
    console.error("[wechat.settings] 读取微信设置失败，使用默认值:", error)
    return { ...DEFAULT_WECHAT_SETTINGS, keywordMap: { ...DEFAULT_WECHAT_SETTINGS.keywordMap } }
  }
}

/** 保存设置（只更新传入的字段，未传入的保持原值） */
export async function saveWechatSettings(
  patch: Partial<WechatSettings>
): Promise<WechatSettings> {
  const current = await getWechatSettings()
  const merged: WechatSettings = { ...current, ...patch }

  for (const field of Object.keys(patch) as (keyof WechatSettings)[]) {
    let value: string
    const v = merged[field]
    if (typeof v === "object") {
      value = JSON.stringify(v)
    } else if (typeof v === "boolean") {
      value = v ? "true" : "false"
    } else {
      value = String(v)
    }

    await pageConfigManager.upsertConfig({
      key: SETTING_KEYS[field],
      value,
      category: "wechat",
      description: SETTING_DESC[field],
    })
  }

  return merged
}
