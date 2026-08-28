// @version v1.5.18
import { NextRequest, NextResponse } from "next/server"
import { logManager, userManager } from "@/storage/database"
import { isSessionExpired } from "@/storage/database/utils/sessionUtils"
import { getAuthUser, requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const controllerId = searchParams.get("controllerId") || undefined

    const sessions = await logManager.getLogSessions({
      controllerId,
    })

    // 过滤掉已过期的会话（时限由后台配置，默认 6 小时）
    const activeSessions = []
    for (const session of sessions) {
      if (!(await isSessionExpired(session.sessionTime))) {
        activeSessions.push(session)
      }
    }

    return NextResponse.json({ sessions: activeSessions })
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
    if (user!.role === "admin" && body.controllerId) {
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
