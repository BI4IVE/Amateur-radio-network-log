// @version v1.5.11
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { getAuthUser, requireAdmin } from "@/lib/auth"

// GET - 审计日志列表（按时间倒序）
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const logs = await logManager.getAuditLogs({ limit: 200 })
    return NextResponse.json({ success: true, logs })
  } catch (error) {
    console.error("Admin audit error:", error)
    return NextResponse.json({ error: "获取审计日志失败" }, { status: 500 })
  }
}
