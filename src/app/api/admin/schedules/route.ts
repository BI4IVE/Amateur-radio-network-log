// @version v1.5.20
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { getAuthUser, requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const authCheck = requireAdmin(user)
  if (authCheck.error) {
    return NextResponse.json({ success: false, error: authCheck.error }, { status: 401 })
  }
  try {
    const schedules = await logManager.getSchedules()
    return NextResponse.json({ success: true, schedules })
  } catch (error: any) {
    console.error("获取预告列表失败:", error)
    return NextResponse.json({ success: false, error: "获取预告列表失败" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const authCheck = requireAdmin(user)
  if (authCheck.error) {
    return NextResponse.json({ success: false, error: authCheck.error }, { status: 401 })
  }
  try {
    const body = await req.json()
    const title = (body.title || "").toString().trim()
    const scheduledTime = body.scheduledTime ? new Date(body.scheduledTime) : null
    if (!title) {
      return NextResponse.json({ success: false, error: "预告标题不能为空" }, { status: 400 })
    }
    if (!scheduledTime || isNaN(scheduledTime.getTime())) {
      return NextResponse.json({ success: false, error: "预告时间无效" }, { status: 400 })
    }
    // sessionTime 为 schema 必填，预告阶段取 scheduledTime；主控待定时用占位
    const session = await logManager.createSchedule({
      title,
      scheduledTime,
      sessionTime: scheduledTime,
      controllerId: (body.controllerId || "").toString(),
      controllerName: (body.controllerName || "待定").toString(),
    } as any)
    return NextResponse.json({ success: true, schedule: session }, { status: 201 })
  } catch (error: any) {
    console.error("创建预告失败:", error)
    const msg = error?.message || "创建预告失败"
    const conflict = msg.includes("已存在")
    return NextResponse.json(
      { success: false, error: conflict ? msg : "创建预告失败: " + msg },
      { status: conflict ? 409 : 500 }
    )
  }
}
