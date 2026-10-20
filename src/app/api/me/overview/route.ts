// @version v2.0.1
import { NextRequest, NextResponse } from "next/server"
import { getMemberIdentity, isActiveMember } from "@/lib/me/identity"
import { computeLicenseInfo, LICENSE_STATE_LABEL } from "@/lib/me/license"
import { getDefaultLicenseIssuer } from "@/lib/me/defaults"
import { getWechatSettings } from "@/lib/wechat/settings"
import {
  logManager,
  participantManager,
  wechatBindingsManager,
} from "@/storage/database"

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

    const [participant, stats, topSignal, rank, binding, defaultLicenseIssuer] =
      await Promise.all([
        participantManager.getParticipantByCallsign(callsign),
        logManager.getCallsignStats(callsign),
        logManager.getCallsignTopSignal(callsign),
        logManager.getCallsignRank(callsign),
        wechatBindingsManager.getByOpenid(identity.openid),
        getDefaultLicenseIssuer(),
      ])

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
        topSignal,
        rank: rank.rank,
        // 不返回全站活跃人数：这是服务器侧统计，不应暴露给普通会员
      },
    })
  } catch (error) {
    console.error("[me.overview] 获取个人中心数据失败:", error)
    return NextResponse.json({ error: "获取个人数据失败" }, { status: 500 })
  }
}
