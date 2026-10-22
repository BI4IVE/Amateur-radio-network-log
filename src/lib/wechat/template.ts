// @version v2.0.2
import { getAccessToken, clearAccessTokenCache } from "./accessToken"
import { getWechatSettings } from "./settings"

/**
 * [v1.5.21 微信推送] 模板消息发送
 *
 * 字段映射不再硬编码：从后台设置 wechat_template_keywords 读取
 * （如 {"keyword1":"callsign","keyword2":"qth"}），不同中继台可选用各自模板。
 */

export type TemplateData = {
  callsign: string
  qth: string
  equipment: string
  antenna: string
  signal: string
  report?: string
  time: string
  /** 台网名称（对应 log_sessions.title），映射到模板的「会议名称/活动名称」类字段 */
  title?: string
}

export type SendResult = {
  ok: boolean
  errcode?: number
  errmsg?: string
  msgid?: string
}

/**
 * [v2.0.0] 模板消息点击跳转链接（指向个人中心）
 *
 * 微信的 url 是发送时参数，不需要改公众号模板。
 * 域名取 WECHAT_SITE_ORIGIN（绑定页授权一直在用）；没配就返回 undefined，
 * 此时不传 url —— 宁可没有跳转，也不能因为链接非法让整条推送失败。
 */
function buildMeUrl(): string | undefined {
  const origin = process.env.WECHAT_SITE_ORIGIN?.trim().replace(/\/+$/, "")
  if (!origin) return undefined
  return `${origin}/me`
}

export async function sendTemplateMessage(
  openid: string,
  data: TemplateData
): Promise<SendResult> {
  const settings = await getWechatSettings()
  const templateId = settings.templateId || process.env.WECHAT_TEMPLATE_ID || ""

  if (!templateId) {
    return {
      ok: false,
      errmsg: "未配置模板 ID（后台「微信推送 → 配置」填写，或设置 .env 的 WECHAT_TEMPLATE_ID）",
    }
  }

  // 按后台配置的 keyword 映射组装 data
  const source = data as unknown as Record<string, string | undefined>
  const payload: Record<string, { value: string }> = {}
  for (const [keyword, field] of Object.entries(settings.keywordMap)) {
    if (!keyword || !field) continue
    // 支持组合写法：field 可含 {字段} 占位符，如 "{equipment} / {signal}"
    // 不含占位符时按原一对一映射处理
    let value: string
    if (field.includes("{")) {
      value = field.replace(/\{(\w+)\}/g, (_m, name: string) =>
        String(source[name] ?? "-")
      )
    } else {
      value = String(source[field] ?? "-")
    }
    // 微信 thing 类关键词最长 20 字符，超出会被拒，统一截断保护
    if (keyword.startsWith("thing")) value = value.slice(0, 20)
    payload[keyword] = { value }
  }

  if (Object.keys(payload).length === 0) {
    return { ok: false, errmsg: "模板 keyword 映射为空，无法组装消息内容" }
  }

  // 点击消息跳个人中心（顺带成为会员补全执照信息的触达渠道）
  const linkUrl = buildMeUrl()

  let result = await postTemplate(openid, templateId, payload, linkUrl)

  // access_token 失效（40001 invalid credential / 42001 expired）：
  // 丢弃内存缓存并重试一次。旧逻辑不清缓存，token 被其他消费者刷新后
  // 会一直失败到缓存过期（最长 2 小时），只能靠重启进程恢复。
  if (!result.ok && (result.errcode === 40001 || result.errcode === 42001)) {
    clearAccessTokenCache()
    result = await postTemplate(openid, templateId, payload, linkUrl)
  }

  return result
}

async function postTemplate(
  openid: string,
  templateId: string,
  payload: Record<string, { value: string }>,
  url?: string
): Promise<SendResult> {
  const accessToken = await getAccessToken()

  const body: Record<string, unknown> = {
    touser: openid,
    template_id: templateId,
    data: payload,
  }
  // 微信要求 http/https 且不能带 #；这里指向个人中心，用户点整条消息即跳转
  if (url) body.url = url

  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  )

  const json = (await res.json()) as {
    errcode?: number
    errmsg?: string
    // 微信实际返回的是数字（int64），类型声明必须如实反映，
    // 否则写库时会被 Zod 按 varchar 校验失败（路径 msgid）。
    msgid?: string | number
  }

  if (json.errcode === 0) {
    // 统一转字符串：wechat_push_log.msgid 是 varchar，
    // 且推送日志 / 去重逻辑都依赖这条记录真正落库。
    return {
      ok: true,
      msgid: json.msgid != null ? String(json.msgid) : undefined,
    }
  }
  return { ok: false, errcode: json.errcode, errmsg: json.errmsg }
}
