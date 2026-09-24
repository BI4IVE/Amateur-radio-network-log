// @version v1.5.22
import { getAccessToken } from "./accessToken"
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

  const accessToken = await getAccessToken()

  const body = {
    touser: openid,
    template_id: templateId,
    data: payload,
  }

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
    msgid?: string
  }

  if (json.errcode === 0) {
    return { ok: true, msgid: json.msgid }
  }
  return { ok: false, errcode: json.errcode, errmsg: json.errmsg }
}
