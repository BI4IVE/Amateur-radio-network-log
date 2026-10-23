// @version v2.0.2
import { NextRequest, NextResponse } from "next/server"
import { getMemberIdentity, isActiveMember } from "@/lib/me/identity"
import { computeLicenseInfo, LICENSE_STATE_LABEL } from "@/lib/me/license"
import { getDefaultLicenseIssuer } from "@/lib/me/defaults"
import { getWechatSettings } from "@/lib/wechat/settings"
import {
  logManager,
  pageConfigManager,
  participantManager,
  wechatBindingsManager,
} from "@/storage/database"

/** 会员规则默认文案：配置项 member_rules 为空时兜底，避免首次弹窗空白 */
const DEFAULT_MEMBER_RULES = [
  "台网活动时间：每日 20:30--21:30，节假日另行预告。",
  "参与方式：主控点名时按顺序应答，报呼号、QTH、设备与信号。",
  "执照要求：需持有效电台执照，执照信息可在「档案」中自行维护。",
  "到场确认：参与后会自动收到微信回执，点开可查看本次记录。",
  "联系方式：如需变更呼号、补录历史场次、恢复误删记录，请联系值班主控。",
].join("\n")

/**
 * [个人中心] GET /api/me/overview
 *
 * 一次返回页面首屏所需的全部数据：身份、档案、执照状态、参与统计。
 * 身份只来自会话 Cookie；未绑定时返回 bound:false，由页面引导绑定。
 */
export async function GET(request: NextRequest) {
  try {
    const identity = await getMemberIdentity(request)
    if (!identity) {
      return NextResponse.json(
        { error: "未登录", needLogin: true },
        { status: 401 }
      )
    }

    const settings = await getWechatSettings()
    const siteName = settings.siteName

    if (!isActiveMember(identity)) {
      return NextResponse.json({
        siteName,
        bound: false,
        binding: {
          status: identity.status,
          callsign: identity.callsign,
        },
      })
    }

    const callsign = identity.callsign

    const [
      participant,
      stats,
      streak,
      rank,
      monthlyRank,
      controller,
      binding,
      defaultLicenseIssuer,
      rulesConfig,
    ] = await Promise.all([
      participantManager.getParticipantByCallsign(callsign),
      logManager.getCallsignStats(callsign),
      logManager.getCallsignStreak(callsign),
      logManager.getCallsignRank(callsign),
      logManager.getCallsignMonthlyRank(callsign),
      logManager.getControllerStats(callsign),
      wechatBindingsManager.getByOpenid(identity.openid),
      getDefaultLicenseIssuer(),
      pageConfigManager.getConfigByKey("member_rules"),
    ])

    // 名次变化：正数 = 上升（名次数字变小），任一月无数据则为 null
    const rankTrend =
      monthlyRank.current !== null && monthlyRank.previous !== null
        ? monthlyRank.previous - monthlyRank.current
        : null

    const license = computeLicenseInfo(
      participant?.licenseIssueDate ?? null,
      participant?.licenseExpireDate ?? null
    )

    return NextResponse.json({
      siteName,
      bound: true,
      binding: {
        status: identity.status,
        callsign,
        boundAt: binding?.createdAt ?? null,
      },
      defaults: {
        licenseIssuer: defaultLicenseIssuer,
      },
      profile: {
        callsign,
        memberNo: participant?.memberNo ?? null,
        name: participant?.name ?? null,
        qth: participant?.qth ?? null,
        equipment: participant?.equipment ?? null,
        antenna: participant?.antenna ?? null,
        power: participant?.power ?? null,
        licenseNo: participant?.licenseNo ?? null,
        licenseType: participant?.licenseType ?? null,
        operatorClass: participant?.operatorClass ?? null,
        licenseIssuer: participant?.licenseIssuer ?? null,
        licenseIssueDate: participant?.licenseIssueDate ?? null,
        licenseExpireDate: participant?.licenseExpireDate ?? null,
        updatedAt: participant?.updatedAt ?? null,
      },
      license: {
        ...license,
        label: LICENSE_STATE_LABEL[license.state],
        issueDate: participant?.licenseIssueDate ?? null,
        expireDate: participant?.licenseExpireDate ?? null,
      },
      stats: {
        sessions: stats.sessions,
        yearSessions: stats.yearSessions,
        firstTime: stats.firstTime,
        lastTime: stats.lastTime,
        // [v2.0.3] 台网改为每日开台、数据自 2026-07 下旬起才完整，
        // 统计口径改为月度：本月出席 / 本月开台总数（月度台网率）/ 上月出席（环比）
        monthSessions: stats.monthSessions,
        prevMonthSessions: stats.prevMonthSessions,
        monthTotal: stats.monthTotal,
        prevMonthTotal: stats.prevMonthTotal,
        // [v2.0.3] 连续参与由「周」改为按开台场次计算的天数
        streakDays: streak.days,
        thisMonth: streak.thisMonth,
        rank: rank.rank,
        // [v2.0.2] 本月名次与较上月变化；不含全站总人数
        rankCurrent: monthlyRank.current,
        rankTrend,
      },
      // [v2.0.2] 主控卡：没有主控过场次时返回 null，前端不显示
      controller:
        controller.sessions > 0
          ? {
              sessions: controller.sessions,
              records: controller.records,
              lastTime: controller.lastTime,
            }
          : null,
      // [v2.0.2] 台网规则：首次进入弹前 3 行，点更多查看全部
      rules: rulesConfig?.value?.trim() || DEFAULT_MEMBER_RULES,
    })
  } catch (error) {
    console.error("[me.overview] 获取个人中心数据失败:", error)
    return NextResponse.json({ error: "获取个人数据失败" }, { status: 500 })
  }
}
