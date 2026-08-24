// @version v1.5.16
import { NextRequest, NextResponse } from "next/server"
import { logManager, userManager } from "@/storage/database"
import { getAuthUser, requireAdmin } from "@/lib/auth"

// GET - 获取所有会话（管理员专用，不过滤过期会话）
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get("skip") || "0")
    const limit = parseInt(searchParams.get("limit") || "200")

    const sessions = await logManager.getLogSessions({ skip, limit })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("Admin get sessions error:", error)
    return NextResponse.json(
      { error: "获取会话列表失败" },
      { status: 500 }
    )
  }
}

// POST - 创建指定日期的会话（管理员专用）
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const body = await request.json()
    const { controllerId, controllerEquipment, controllerAntenna, controllerQth, sessionTime } = body

    if (!controllerId || !sessionTime) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      )
    }

    // [v1.5.13 安全] controllerId 必须为真实存在的用户；controllerName 强制取自该用户，
    // 不再信任请求体传入的 controllerName（防止伪造主控姓名显示）。
    const target = await userManager.getUserById(controllerId)
    if (!target) {
      return NextResponse.json({ error: "指定的主控用户不存在" }, { status: 400 })
    }
    const controllerName = target.name || target.username

    // 一天仅允许一场台网：若当天（北京时间）已存在台网，则禁止新建，只能修改
    const existing = await logManager.findSessionByBeijingDate(new Date(sessionTime))
    if (existing) {
      return NextResponse.json(
        {
          error: "该日期台网已存在，无法重复录入。请到「台网历史管理」中修改已有的台网记录。",
          existingSessionId: existing.id,
        },
        { status: 409 }
      )
    }

    const session = await logManager.createLogSession({
      controllerId,
      controllerName,
      controllerEquipment,
      controllerAntenna,
      controllerQth,
      sessionTime: new Date(sessionTime),
    })

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error("Admin create session error:", error)
    return NextResponse.json(
      { error: "创建会话失败" },
      { status: 500 }
    )
  }
}
