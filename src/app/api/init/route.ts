import { NextResponse } from "next/server"
import { userManager } from "@/storage/database"

export async function POST() {
  try {
    // Check if admin user already exists (use uppercase for consistency)
    const existingAdmin = await userManager.getUserByUsername("ADMIN")

    if (existingAdmin) {
      return NextResponse.json({ message: "管理员已存在" })
    }

    // Create admin user with uppercase username and password
    const admin = await userManager.createUser({
      username: "ADMIN",
      password: "ADMIN123",
      name: "管理员",
      role: "admin",
      equipment: "默认设备",
      antenna: "默认天线",
      qth: "默认位置",
    })

    return NextResponse.json({
      message: "管理员账户创建成功",
      user: { id: admin.id, username: admin.username, name: admin.name },
    })
  } catch (error) {
    console.error("Init error:", error)
    return NextResponse.json(
      { error: "初始化失败" },
      { status: 500 }
    )
  }
}
