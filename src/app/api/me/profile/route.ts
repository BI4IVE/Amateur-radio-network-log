// @version v2.0.2
import { NextRequest, NextResponse } from "next/server"
import { getMemberIdentity, isActiveMember } from "@/lib/me/identity"
import { daysBetween, isValidDateString } from "@/lib/me/license"
import { logManager, participantManager } from "@/storage/database"
import type { Participant } from "@/storage/database"

/**
 * [个人中心] GET /api/me/profile  读取自己的档案
 *              PUT /api/me/profile  保存自己的档案（含会员编号与执照信息）
 *
 * 安全约束：
 * 1. 呼号永远取自会话，请求体里的 callsign 会被忽略
 * 2. 只接受白名单字段，长度与格式严格校验
 * 3. 每次保存写一条 audit_logs（UPDATE_PROFILE），字段级 diff 可追溯
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

const FIELD_MAX: Record<string, number> = {
  memberNo: 5,
  name: 100,
  qth: 255,
  equipment: 255,
  antenna: 255,
  power: 50,
  licenseNo: 50,
  licenseType: 20,
  operatorClass: 30,
  licenseIssuer: 100,
  licenseIssueDate: 10,
  licenseExpireDate: 10,
}

const DATE_FIELDS = new Set(["licenseIssueDate", "licenseExpireDate"])

function normalize(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null
  const value = String(raw).trim()
  return value === "" ? null : value
}

/** 发证日期 + n 年（2/29 自动落到 2/28，与执照机关口径一致） */
function addYears(dateStr: string, years: number): Date {
  const base = new Date(`${dateStr}T00:00:00Z`)
  const target = new Date(base.getTime())
  target.setUTCFullYear(target.getUTCFullYear() + years)
  return target
}

function profileOf(participant: Participant | null) {
  return {
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
  }
}

async function requireActive(request: NextRequest) {
  const identity = await getMemberIdentity(request)
  if (!identity) {
    return { error: NextResponse.json({ error: "未登录", needLogin: true }, { status: 401 }) }
  }
  if (!isActiveMember(identity)) {
    return { error: NextResponse.json({ error: "尚未绑定呼号" }, { status: 403 }) }
  }
  return { identity, callsign: identity.callsign }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireActive(request)
    if ("error" in auth) return auth.error

    const participant = await participantManager.getParticipantByCallsign(auth.callsign)
    return NextResponse.json({
      callsign: auth.callsign,
      profile: profileOf(participant),
      updatedAt: participant?.updatedAt ?? null,
    })
  } catch (error) {
    console.error("[me.profile] 读取档案失败:", error)
    return NextResponse.json({ error: "读取档案失败" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireActive(request)
    if ("error" in auth) return auth.error
    const callsign = auth.callsign

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const existing = await participantManager.getParticipantByCallsign(callsign)
    const before: Record<string, string | null> = { ...profileOf(existing) }

    // 只挑白名单字段；未提交的字段保持原值
    const next: Record<string, string | null> = { ...before }
    for (const key of Object.keys(FIELD_LABELS)) {
      if (!(key in body)) continue
      const value = normalize(body[key])

      if (value !== null) {
        if (value.length > FIELD_MAX[key]) {
          return NextResponse.json(
            { error: `${FIELD_LABELS[key]}最多 ${FIELD_MAX[key]} 个字符` },
            { status: 400 }
          )
        }
        if (key === "memberNo" && !/^\d{1,5}$/.test(value)) {
          return NextResponse.json(
            { error: "编号只能是 1–5 位数字" },
            { status: 400 }
          )
        }
        if (DATE_FIELDS.has(key) && !isValidDateString(value)) {
          return NextResponse.json(
            { error: `${FIELD_LABELS[key]}格式应为 YYYY-MM-DD` },
            { status: 400 }
          )
        }
      }
      next[key] = value
    }

    // 执照日期组合校验：到期 > 发证，且不超过「发证 + 5 年 + 90 天」宽限
    const issue = next.licenseIssueDate
    const expire = next.licenseExpireDate
    if (issue && expire) {
      if (daysBetween(issue, expire) <= 0) {
        return NextResponse.json(
          { error: "到期日期必须晚于发证日期" },
          { status: 400 }
        )
      }
      const limit = addYears(issue, 5)
      limit.setUTCDate(limit.getUTCDate() + 90)
      if (Date.parse(`${expire}T00:00:00Z`) > limit.getTime()) {
        return NextResponse.json(
          { error: "到期日期超出「发证日期 + 5 年」的合理范围" },
          { status: 400 }
        )
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

    // 字段级 diff 留痕（只记真正变化的字段）
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
        username: callsign,
        action: "UPDATE_PROFILE",
        entityType: "participant",
        entityId: saved?.id ?? existing?.id ?? callsign,
        detail: JSON.stringify({ by: "member", callsign, changes }),
      })
    }

    return NextResponse.json({
      ok: true,
      changed: changes.length,
      profile: profileOf(saved),
      updatedAt: saved?.updatedAt ?? null,
    })
  } catch (error) {
    console.error("[me.profile] 保存档案失败:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "保存档案失败",
      },
      { status: 500 }
    )
  }
}
