import { NextResponse } from "next/server"
import { userManager } from "@/storage/database"
import { eq } from "drizzle-orm"
import { users } from "@/storage/database/shared/schema"

export async function POST() {
  try {
    const db = await (await import("coze-coding-dev-sdk")).getDb()

    // Try to find and update existing admin (case-insensitive)
    const existingAdmins = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin"))

    if (existingAdmins.length > 0) {
      // Update to uppercase
      await db
        .update(users)
        .set({
          username: "ADMIN",
          password: "ADMIN123",
          updatedAt: new Date(),
        })
        .where(eq(users.username, "admin"))

      return NextResponse.json({
        message: "管理员账号已更新为大写",
        username: "ADMIN",
        password: "ADMIN123",
      })
    }

    // Check if ADMIN already exists
    const adminAdmin = await userManager.getUserByUsername("ADMIN")
    if (adminAdmin) {
      return NextResponse.json({ message: "大写管理员账号已存在" })
    }

    // Create new admin with uppercase
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
      password: "ADMIN123",
    })
  } catch (error) {
    console.error("Reset admin error:", error)
    return NextResponse.json(
      { error: "重置失败" },
      { status: 500 }
    )
  }
}
