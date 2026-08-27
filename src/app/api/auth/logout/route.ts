// @version v1.5.17
import { NextRequest, NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ success: true })
  
  // 清除真正的 auth cookie（与登录时写入的 "token" 保持一致，
  // secure 必须和 login 写入时完全一致，否则浏览器不认这条删除指令）
  const isHttps =
    process.env.NODE_ENV === "production" &&
    process.env.FORCE_SECURE_COOKIE === "true"
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
  
  return response
}
