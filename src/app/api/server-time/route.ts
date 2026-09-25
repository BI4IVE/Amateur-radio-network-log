// @version v1.5.24
import { NextRequest, NextResponse } from "next/server"
import { toBeijingISOString } from "@/utils/dateFormat"

export const dynamic = "force-dynamic"

// GET /api/server-time —— 返回「服务器当前北京时间」
//
// 设计要点：
// 1) 时间基准取**服务器时钟**（服务端 new Date()），前端只负责显示，不再用本机时钟，
//    因此主控身处哪个时区、本机时钟准不准，都不会影响入库时间。
// 2) 换算用「绝对时刻 + 固定 8 小时」的纯数学方式（复用 toBeijingISOString），
//    中国全境全年 UTC+8 且无夏令时，等效于 IANA Asia/Shanghai；
//    同时不依赖服务器本机时区设置，也不依赖 Node 的 ICU 数据
//    （small-icu 环境下 Intl 指定 timeZone 可能静默退回 UTC，正好差 8 小时，故刻意避开）。
export async function GET(request: NextRequest) {
  const now = new Date()

  return NextResponse.json(
    {
      // "yyyy-MM-ddTHH:mm"（北京时间），可直接赋给 datetime-local 输入框
      serverTime: toBeijingISOString(now),
      timestamp: now.getTime(),
      timezone: "Asia/Shanghai",
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  )
}
