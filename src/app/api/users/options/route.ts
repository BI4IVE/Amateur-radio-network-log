import { NextResponse } from "next/server"
import { userManager } from "@/storage/database"

export async function GET() {
  try {
    const users = await userManager.getUserOptions()
    return NextResponse.json({ users })
  } catch (error) {
    console.error("Get user options error:", error)
    return NextResponse.json(
      { error: "获取用户选项失败" },
      { status: 500 }
    )
  }
}
