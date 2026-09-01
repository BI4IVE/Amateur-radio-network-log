// @version v1.5.20
import { NextRequest, NextResponse } from "next/server"
import { loginLogManager } from "@/storage/database"
import { getAuthUser, requireAdmin } from "@/lib/auth"

// GET - 登录日志列表（管理员，倒序）
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500)
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0)
    const userId = searchParams.get("userId") || undefined
    const successParam = searchParams.get("success")
    const success = successParam === null ? undefined : successParam === "true"

    const result = await loginLogManager.list({ limit, offset, userId, success })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("Get login logs error:", error)
    return NextResponse.json({ error: "获取登录日志失败" }, { status: 500 })
  }
}

// DELETE - 清理 N 天前的记录（默认 90 天）
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const days = Number(searchParams.get("days")) || 90
    if (!Number.isFinite(days) || days < 1) {
      return NextResponse.json({ error: "保留天数必须大于 0" }, { status: 400 })
    }

    const deleted = await loginLogManager.purgeOlderThan(days)
    return NextResponse.json({ success: true, deleted })
  } catch (error) {
    console.error("Purge login logs error:", error)
    return NextResponse.json({ error: "清理登录日志失败" }, { status: 500 })
  }
}
