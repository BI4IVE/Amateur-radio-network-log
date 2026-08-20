// @version v1.5.13
import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database"

export async function POST(request: NextRequest) {
  try {
    // [v1.5.13 安全] 初始化接口必须携带与 .env 中 ADMIN_INIT_PASSWORD 一致的请求头凭证，
    // 防止无凭证的端口扫描/CSRF 触发管理员创建。
    const initToken = request.headers.get("x-init-token")
    const expected = process.env.ADMIN_INIT_PASSWORD
    if (!initToken || !expected || initToken !== expected) {
      return NextResponse.json({ error: "未授权" }, { status: 403 })
    }

    // 检查是否已有管理员
    const existingAdmin = await userManager.getUserByUsername("ADMIN")

    if (existingAdmin) {
      return NextResponse.json({ message: "管理员已存在" })
    }

    // 初始密码必须来自环境变量 ADMIN_INIT_PASSWORD
    // 不再使用随机密码：随机密码无法可靠地与数据库中的哈希对应，
    // 会导致用户拿到一个无法登录的密码。
    const initPassword = process.env.ADMIN_INIT_PASSWORD
    if (!initPassword) {
      return NextResponse.json(
        {
          error:
            "未设置初始管理员密码。请在 .env 中配置 ADMIN_INIT_PASSWORD 后重新调用本接口。",
        },
        { status: 400 }
      )
    }

    // 创建管理员用户（createUser 内部会通过 schema 自动对密码做 bcrypt 哈希）
    const admin = await userManager.createUser({
      username: "ADMIN",
      password: initPassword,
      name: "管理员",
      role: "admin",
      equipment: "默认设备",
      antenna: "默认天线",
      qth: "默认位置",
    })

    return NextResponse.json({
      message: "管理员账户创建成功",
      user: { id: admin.id, username: admin.username, name: admin.name },
      warning: "请使用 .env 中 ADMIN_INIT_PASSWORD 的值登录，并尽快修改密码。",
    })
  } catch (error) {
    console.error("Init error:", error)
    return NextResponse.json({ error: "初始化失败" }, { status: 500 })
  }
}
