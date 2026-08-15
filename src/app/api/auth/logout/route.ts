// @version v1.5.10
import { NextRequest, NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ success: true })
  
  // 清除真正的 auth cookie（与登录时写入的 "token" 保持一致）
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.FORCE_SECURE_COOKIE === "true",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
  
  return response
}
