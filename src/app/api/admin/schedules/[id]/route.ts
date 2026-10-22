// @version v2.0.2
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { requirePermission } from "@/lib/permissions-server"

export const dynamic = "force-dynamic"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // [v1.5.29 权限] 主控可管理台网预告
  const auth = await requirePermission(req, "ops.schedule")
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: "无此操作权限" }, { status: 403 })
  }
  const { id } = await params
  try {
    const body = await req.json()
    const data: any = {}
    if (typeof body.title === "string") data.title = body.title.trim()
    if (body.scheduledTime) {
      const t = new Date(body.scheduledTime)
      if (!isNaN(t.getTime())) {
        data.scheduledTime = t
        data.sessionTime = t
      }
    }
    if (typeof body.controllerId === "string") data.controllerId = body.controllerId
    if (typeof body.controllerName === "string") data.controllerName = body.controllerName
    const updated = await logManager.updateSchedule(id, data)
    if (!updated) {
      return NextResponse.json({ success: false, error: "预告不存在或已结束" }, { status: 404 })
    }
    return NextResponse.json({ success: true, schedule: updated })
  } catch (error: any) {
    console.error("更新预告失败:", error)
    const msg = error?.message || "更新预告失败"
    const conflict = msg.includes("已存在")
    return NextResponse.json(
      { success: false, error: conflict ? msg : "更新预告失败: " + msg },
      { status: conflict ? 409 : 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // [v1.5.29 权限] 主控可管理台网预告
  const auth = await requirePermission(req, "ops.schedule")
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: "无此操作权限" }, { status: 403 })
  }
  const { id } = await params
  try {
    const ok = await logManager.deleteSchedule(id)
    if (!ok) {
      return NextResponse.json({ success: false, error: "预告不存在或已结束" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("删除预告失败:", error)
    return NextResponse.json({ success: false, error: "删除预告失败" }, { status: 500 })
  }
}
