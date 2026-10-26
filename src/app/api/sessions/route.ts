// @version v2.0.4
import { NextRequest, NextResponse } from "next/server"
import { logManager, userManager } from "@/storage/database"
import { getAuthUser, requireAuth } from "@/lib/auth"
import { isAdminRole } from "@/lib/permissions"
import { screenReadAuth, maskQthValue } from "@/lib/screenAccess"

export async function GET(request: NextRequest) {
  try {
    // 大屏数据公开控制：开放模式或已登录方可读取
    const access = await screenReadAuth(request)
    if (!access.ok) {
      return NextResponse.json({ error: "需要登录" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const controllerId = searchParams.get("controllerId") || undefined

    // [v2.0.3] 大屏 / 「加入进行中台网」只看「指定日期」（默认今天，北京时间）的台网。
    // 预告（status=scheduled）是未来场次，默认排除，避免被当成进行中会话（原实现按 6 小时过期过滤，
    // 未来时间永不过期 + 倒序排序，导致大屏永远显示最后创建的那场预告）。
    // date=YYYY-MM-DD 可指定日期（预留：以后做「按日期看历史大屏」）；
    // includeScheduled=true 供排期类页面按需包含预告。
    const dateParam = searchParams.get("date")
    const includeScheduled = searchParams.get("includeScheduled") === "true"
    const beijingDate = (value: Date | string) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value))

    const targetDate =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : beijingDate(new Date())

    const sessions = await logManager.getLogSessions({
      controllerId,
    })

    const activeSessions = sessions.filter((session) => {
      if (!includeScheduled && session.status === "scheduled") return false
      return beijingDate(session.sessionTime) === targetDate
    })

    // 「匿名 + 公开」组合下对 QTH 做服务端脱敏，防止直接调用 API 泄露完整位置
    const result = access.maskQth
      ? activeSessions.map((s) => ({ ...s, controllerQth: maskQthValue(s.controllerQth) }))
      : activeSessions
    return NextResponse.json({ sessions: result, date: targetDate })
  } catch (error) {
    console.error("Get sessions error:", error)
    return NextResponse.json(
      { error: "获取会话列表失败" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 使用服务端认证
    const user = await getAuthUser(request)
    const loginError = requireAuth(user)
    if (loginError.error) {
      return NextResponse.json({ error: loginError.error }, { status: 401 })
    }

    const body = await request.json()

    // [v1.5.13 安全] 强制会话归属：controllerId/controllerName 由服务端根据登录身份写入，
    // 不再信任请求体中的 controllerId（防止冒充他人为主控）。
    // 规则：
    //  - 普通用户：只能以自己身份创建（忽略 body.controllerId）。
    //  - 管理员：可显式指定 controllerId 代录，但必须校验该用户真实存在（拒绝伪造的 controllerId）。
    let controllerId: string
    let controllerName: string
    // [v2.0.3 修复] 原来只判断 role === "admin"，超管（superadmin）会掉进 else 分支，
    // 导致选了主控也仍以自己的账号名写库（显示成「管理员」）。统一走 isAdminRole。
    if (isAdminRole(user!.role) && body.controllerId) {
      const target = await userManager.getUserById(body.controllerId)
      if (!target) {
        return NextResponse.json({ error: "指定的主控用户不存在" }, { status: 400 })
      }
      controllerId = target.id
      controllerName = target.name || target.username
    } else {
      controllerId = user!.userId
      const me = await userManager.getUserById(user!.userId)
      controllerName = me?.name || me?.username || user!.username
    }

    // 仅提交白名单字段，controllerId/controllerName 强制覆盖为服务端身份
    const payload = {
      controllerEquipment: body.controllerEquipment,
      controllerAntenna: body.controllerAntenna,
      controllerQth: body.controllerQth,
      sessionTime: body.sessionTime,
      title: body.title,
      scheduledTime: body.scheduledTime,
      controllerId,
      controllerName,
    }

    // 一天仅允许一场台网：若当天（北京时间）已存在台网，则禁止新建，只能修改
    // [v1.5.13 安全] 此查重为应用层兜底；数据库已加唯一约束 (date_trunc('day', session_time AT TIME ZONE 'Asia/Shanghai'))
    // 防止并发 TOCTOU（见迁移脚本）。
    const sessionDate = body.sessionTime ? new Date(body.sessionTime) : new Date()
    const existing = await logManager.findSessionByBeijingDate(sessionDate)
    if (existing) {
      return NextResponse.json(
        {
          error: "今天已存在台网记录，无法重复录入。请到「台网历史管理」中修改已有的台网记录。",
          existingSessionId: existing.id,
        },
        { status: 409 }
      )
    }

    const session = await logManager.createLogSession(payload)

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "需要登录") {
      return NextResponse.json({ error: "需要登录" }, { status: 401 })
    }
    console.error("Create session error:", error)
    return NextResponse.json(
      { error: "创建会话失败" },
      { status: 500 }
    )
  }
}
