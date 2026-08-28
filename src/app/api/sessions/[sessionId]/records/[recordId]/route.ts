// @version v1.5.18
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { broadcastToSession } from "@/app/api/sse/session/[sessionId]/subscribe/route"
import { isSessionExpired } from "@/storage/database/utils/sessionUtils"
import { getAuthUser, requireLogin } from "@/lib/auth"

// [v1.5.13 安全] 校验当前用户是否有权操作该会话下的记录：
// 管理员无限制；普通用户仅可操作「自己作为主控」的会话（防止越权篡改他人台网记录）。
function assertCanMutate(user: { userId: string; role: string } | null, session: { controllerId: string }): { error?: string } {
  if (!user) return { error: "需要登录" }
  if (user.role === "admin") return {}
  if (user.role === "user" && session.controllerId === user.userId) return {}
  return { error: "您没有权限操作此台网记录" }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; recordId: string }> }
) {
  try {
    const { sessionId, recordId } = await params
    const body = await request.json()

    // 验证登录状态
    const user = await getAuthUser(request)
    const loginError = requireLogin(user)
    if (loginError.error) {
      return NextResponse.json({ error: loginError.error }, { status: 401 })
    }

    // 检查会话是否存在
    const session = await logManager.getLogSessionById(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      )
    }

    // [v1.5.13 安全] 归属校验：非管理员只能修改自己主控会话的记录
    const perm = assertCanMutate(user, session)
    if (perm.error) {
      return NextResponse.json({ error: perm.error }, { status: 403 })
    }

    // 检查会话是否已过期（时限由后台配置，默认 6 小时）
    if (await isSessionExpired(session.sessionTime)) {
      return NextResponse.json(
        { error: "该会话已过期，无法更新记录" },
        { status: 403 }
      )
    }

    const record = await logManager.updateLogRecord(recordId, body)

    if (!record) {
      return NextResponse.json(
        { error: "记录不存在" },
        { status: 404 }
      )
    }

    // 广播记录更新
    broadcastToSession(sessionId, {
      type: "record_updated",
      record,
    })

    return NextResponse.json({ record })
  } catch (error) {
    console.error("Update record error:", error)
    return NextResponse.json(
      { error: "更新记录失败" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; recordId: string }> }
) {
  try {
    const { sessionId, recordId } = await params

    // 验证登录状态
    const user = await getAuthUser(request)
    const loginError = requireLogin(user)
    if (loginError.error) {
      return NextResponse.json({ error: loginError.error }, { status: 401 })
    }

    // 检查会话是否存在
    const session = await logManager.getLogSessionById(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      )
    }

    // [v1.5.13 安全] 归属校验：非管理员只能删除自己主控会话的记录
    const perm = assertCanMutate(user, session)
    if (perm.error) {
      return NextResponse.json({ error: perm.error }, { status: 403 })
    }

    // 检查会话是否已过期（时限由后台配置，默认 6 小时）
    if (await isSessionExpired(session.sessionTime)) {
      return NextResponse.json(
        { error: "该会话已过期，无法删除记录" },
        { status: 403 }
      )
    }

    const success = await logManager.softDeleteLogRecord(recordId, {
      userId: user?.userId,
      username: user?.username,
    })

    if (!success) {
      return NextResponse.json(
        { error: "记录不存在" },
        { status: 404 }
      )
    }

    // 广播记录删除（软删，带 deletedAt 标记便于前端隐藏）
    broadcastToSession(sessionId, {
      type: "record_deleted",
      recordId,
      deletedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete record error:", error)
    return NextResponse.json(
      { error: "删除记录失败" },
      { status: 500 }
    )
  }
}
