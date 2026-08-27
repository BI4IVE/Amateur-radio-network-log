// @version v1.5.17
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"

export const dynamic = "force-dynamic"

// 公开接口：返回最近一条尚未开始的台网预告（供首页 /live 倒计时）
export async function GET(req: NextRequest) {
  try {
    const schedule = await logManager.getUpcomingSchedule()
    return NextResponse.json({ success: true, schedule: schedule || null })
  } catch (error: any) {
    console.error("获取预告失败:", error)
    return NextResponse.json({ success: false, error: "获取预告失败" }, { status: 500 })
  }
}
