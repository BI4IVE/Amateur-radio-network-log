// @version v2.0.1
import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/permissions-server"
import { computeLicenseInfo, LICENSE_STATE_LABEL, isValidDateString } from "@/lib/me/license"
import { getDefaultLicenseIssuer } from "@/lib/me/defaults"
import {
  logManager,
  participantManager,
  wechatBindingsManager,
  wechatPushLogManager,
} from "@/storage/database"

/**
 * [个人中心] 后台用户详情
 *
 * GET /api/admin/participants/[callsign]  档案 + 统计 + 绑定 + 推送 + 修改记录
 * PUT /api/admin/participants/[callsign]  管理员保存档案（写 UPDATE_PROFILE_ADMIN 留痕）
 *
 * 路径在 middleware 的 /api/admin 保护范围内，仅 admin 可访问。
 */

const FIELD_LABELS: Record<string, string> = {
  memberNo: "编号",
  name: "姓名",
  qth: "所在地",
  equipment: "常用设备",
  antenna: "常用天线",
  power: "发射功率",
  licenseNo: "执照编号",
  licenseType: "电台类别",
  operatorClass: "操作证书",
  licenseIssuer: "发证机关",
  licenseIssueDate: "发证日期",
  licenseExpireDate: "到期日期",
}

const DATE_FIELDS = new Set(["licenseIssueDate", "licenseExpireDate"])

function normalize(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null
  const value = String(raw).trim()
  return value === "" ? null : value
}

/**
 * [v2.0.0] 权限点接入
 *
 * 之前这里只判断「是不是管理员」，导致超管在用户管理里取消勾选
 * 「会员详情 / 修改档案」也不生效 —— 逐项权限在会员模块等于是半失效的。
 * 现在读走 member.detail，写走 member.edit.profile，
 * 与会员列表的 member.view 保持同一套口径。
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callsign: string }> }
) {
  try {
    const auth = await requirePermission(request, "member.detail")
    if ("error" in auth) return auth.error

    const { callsign: raw } = await params
    const callsign = decodeURIComponent(raw || "").trim().toUpperCase()
    if (!callsign) {
      return NextResponse.json({ error: "缺少呼号" }, { status: 400 })
    }

    const [participant, stats, rank, topSignal, bindings, pushLogs] =
      await Promise.all([
        participantManager.getParticipantByCallsign(callsign),
        logManager.getCallsignStats(callsign),
        logManager.getCallsignRank(callsign),
        logManager.getCallsignTopSignal(callsign),
        wechatBindingsManager.listByCallsign(callsign),
        wechatPushLogManager.list({ callsign, limit: 10 }),
      ])

    const auditLogs = await logManager.getParticipantAuditLogs(
      [participant?.id, callsign].filter(Boolean) as string[],
      50
    )

    const license = computeLicenseInfo(
      participant?.licenseIssueDate ?? null,
      participant?.licenseExpireDate ?? null
    )

    return NextResponse.json({
      callsign,
      participant,
      defaults: {
        licenseIssuer: await getDefaultLicenseIssuer(),
      },
      license: {
        ...license,
        label: LICENSE_STATE_LABEL[license.state],
      },
      stats: {
        ...stats,
        topSignal,
        rank: rank.rank,
        rankedTotal: rank.total,
      },
      bindings: bindings.map((b) => ({
        id: b.id,
        openid: b.openid,
        status: b.status,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
      pushLogs: pushLogs.logs.map((log) => ({
        id: log.id,
        status: log.status,
        errcode: log.errcode,
        errmsg: log.errmsg,
        createdAt: log.createdAt,
      })),
      auditLogs: auditLogs.map((log) => {
        let changes: { field: string; label: string; from: string | null; to: string | null }[] = []
        let by: "member" | "admin" = log.action === "UPDATE_PROFILE_ADMIN" ? "admin" : "member"
        try {
          const detail = log.detail ? JSON.parse(log.detail) : null
          if (detail?.changes) changes = detail.changes
          if (detail?.by === "admin" || detail?.by === "member") by = detail.by
        } catch {
          // 历史数据可能不是 JSON，忽略即可
        }
        return {
          id: log.id,
          action: log.action,
          by,
          username: log.username,
          changes,
          detail: log.detail,
          createdAt: log.createdAt,
        }
      }),
    })
  } catch (error) {
    console.error("[admin.participant] 获取用户详情失败:", error)
    return NextResponse.json({ error: "获取用户详情失败" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ callsign: string }> }
) {
  try {
    const auth = await requirePermission(request, "member.edit.profile")
    if ("error" in auth) return auth.error

    const { callsign: raw } = await params
    const callsign = decodeURIComponent(raw || "").trim().toUpperCase()
    if (!callsign) {
      return NextResponse.json({ error: "缺少呼号" }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const existing = await participantManager.getParticipantByCallsign(callsign)

    const before: Record<string, string | null> = {}
    const next: Record<string, string | null> = {}
    for (const key of Object.keys(FIELD_LABELS)) {
      before[key] = (existing as unknown as Record<string, string | null>)?.[key] ?? null
      next[key] = key in body ? normalize(body[key]) : before[key]
    }

    for (const key of DATE_FIELDS) {
      if (next[key] && !isValidDateString(next[key] as string)) {
        return NextResponse.json(
          { error: `${FIELD_LABELS[key]}格式应为 YYYY-MM-DD` },
          { status: 400 }
        )
      }
    }
    if (next.licenseIssueDate && next.licenseExpireDate) {
      if (
        Date.parse(`${next.licenseExpireDate}T00:00:00Z`) <=
        Date.parse(`${next.licenseIssueDate}T00:00:00Z`)
      ) {
        return NextResponse.json({ error: "到期日期必须晚于发证日期" }, { status: 400 })
      }
    }

    const payload = {
      memberNo: next.memberNo,
      name: next.name,
      qth: next.qth,
      equipment: next.equipment,
      antenna: next.antenna,
      power: next.power,
      licenseNo: next.licenseNo,
      licenseType: next.licenseType,
      operatorClass: next.operatorClass,
      licenseIssuer: next.licenseIssuer,
      licenseIssueDate: next.licenseIssueDate,
      licenseExpireDate: next.licenseExpireDate,
    }

    const saved = existing
      ? await participantManager.updateParticipant(existing.id, payload)
      : await participantManager.upsertParticipant({ callsign, ...payload })

    const changes = Object.keys(FIELD_LABELS)
      .filter((key) => (before[key] ?? null) !== (next[key] ?? null))
      .map((key) => ({
        field: key,
        label: FIELD_LABELS[key],
        from: before[key] ?? null,
        to: next[key] ?? null,
      }))

    if (changes.length > 0) {
      await logManager.writeAudit({
        userId: auth.user?.userId,
        username: auth.user?.username,
        action: "UPDATE_PROFILE_ADMIN",
        entityType: "participant",
        entityId: saved?.id ?? existing?.id ?? callsign,
        detail: JSON.stringify({
          by: "admin",
          callsign,
          operator: auth.user?.username,
          changes,
        }),
      })
    }

    return NextResponse.json({ ok: true, changed: changes.length, participant: saved })
  } catch (error) {
    console.error("[admin.participant] 保存档案失败:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存档案失败" },
      { status: 500 }
    )
  }
}
