// @version v1.5.22
import { wechatBindingsManager, wechatPushLogManager } from "@/storage/database"
import { isWechatConfigured } from "./config"
import { getWechatSettings } from "./settings"
import { sendTemplateMessage } from "./template"

/**
 * [v1.5.21 微信推送] 推送编排
 *
 * 触发时机：主控台提交记录落库后（异步调用，不阻塞响应）。
 * 推送条件全部由后台设置控制（多中继台可各自配置）：
 *   1. pushEnabled      总开关
 *   2. pushOnlyToday    是否只推今天的场次（关掉则补录历史也会推）
 *   3. pushDedupe       同场次同呼号是否只推一次
 *   4. 该呼号存在「已生效(active)」的绑定
 *
 * 本函数**永不抛出**：推送是增值能力，任何失败都不能影响记录提交主流程。
 */

export type PushRecordParams = {
  sessionId: string
  recordId: string
  callsign: string
  qth?: string | null
  equipment?: string | null
  antenna?: string | null
  signal?: string | null
  report?: string | null
  sessionTime: Date | string
  /** 记录实际提交时间（log_records.createdAt），用于模板的「时间」字段，体现实时性 */
  recordTime?: Date | string | null
  /** 台网名称（log_sessions.title），用于模板的「会议名称/活动名称」字段 */
  title?: string | null
}

/** 判断给定时间按北京时间是否属于今天 */
function isTodayInBeijing(time: Date | string): boolean {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d)
  return fmt(new Date(time)) === fmt(new Date())
}

/** 格式化时间为北京时间 YYYY-MM-DD HH:MM（适配微信 time 类关键词，如 time11） */
function formatBeijingDateTime(time: Date | string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(time))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`
}

export async function pushRecordNotification(
  params: PushRecordParams
): Promise<void> {
  try {
    const settings = await getWechatSettings()

    // 1. 总开关
    if (!settings.pushEnabled) return
    // 2. 密钥是否配置（缺 AppID/Secret 时直接跳过，避免无意义报错）
    if (!isWechatConfigured()) return

    const callsign = params.callsign?.trim().toUpperCase()
    if (!callsign) return

    // 3. 是否只推今天的场次
    if (settings.pushOnlyToday && !isTodayInBeijing(params.sessionTime)) return

    // 4. 只推给「已生效」的绑定（待审核/已拒绝/已失效都不推）
    const bindings = await wechatBindingsManager.listActiveByCallsign(callsign)
    if (bindings.length === 0) return

    // 5. 同场次同呼号去重
    if (
      settings.pushDedupe &&
      (await wechatPushLogManager.hasPushed(params.sessionId, callsign))
    ) {
      return
    }

    // 时间字段取「记录实际提交时间」(recordTime)，体现实时性；
    // 缺失时回退到台网开网时间(sessionTime)，避免显示空白。
    const time = formatBeijingDateTime(params.recordTime ?? params.sessionTime)

    // 模板「会议名称」字段改为取后台「站点/组织名称」(wechat_site_name)，
    // 取不到时回退到本场台网名（session.title）。
    const meetingTitle = settings.siteName?.trim() || params.title || "-"

    for (const binding of bindings) {
      const result = await sendTemplateMessage(binding.openid, {
        callsign,
        qth: params.qth || "-",
        equipment: params.equipment || "-",
        antenna: params.antenna || "-",
        signal: params.signal || "-",
        report: params.report || undefined,
        title: meetingTitle,
        time,
      })

      await wechatPushLogManager.write({
        callsign,
        openid: binding.openid,
        sessionId: params.sessionId,
        recordId: params.recordId,
        status: result.ok ? "success" : "failed",
        errcode: result.errcode ?? null,
        errmsg: result.errmsg ?? null,
        msgid: result.msgid ?? null,
      })
    }
  } catch (error) {
    // 吞掉异常：推送失败绝不影响记录提交
    console.error("[wechatPush] 推送记录通知失败（已忽略）:", error)
  }
}
