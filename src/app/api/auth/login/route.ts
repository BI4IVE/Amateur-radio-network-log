// @version v1.5.9
import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database"
import { signToken } from "@/lib/auth"
import { verifyPassword, isPasswordHashed, hashPassword } from "@/lib/password"
import { RateLimiterMemory } from "rate-limiter-flexible"

// 速率限制：每分钟最多 10 次登录尝试
const rateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
})

export async function POST(request: NextRequest) {
  try {
    // 获取客户端 IP
    const ip = request.headers.get("x-forwarded-for") || 
               request.headers.get("x-real-ip") || 
               "unknown"

    // 检查速率限制
    try {
      await rateLimiter.consume(ip)
    } catch {
      return NextResponse.json(
        { error: "登录尝试次数过多，请稍后再试" },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      )
    }

    // userManager.getUserByUsername 内部已用 LOWER() 做大小写不敏感匹配，
    // 此处直接传原始用户名，避免大小写逻辑冲突
    const user = await userManager.getUserByUsername(username)

    if (!user) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      )
    }

    // 如果密码是明文，自动升级为哈希
    if (!isPasswordHashed(user.password)) {
      const hashedPassword = await hashPassword(password)
      await userManager.updateUser(user.id, { password: hashedPassword })
    }

    // 生成 JWT Token
    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    })

    // Return user info without password
    const { password: _, ...userWithoutPassword } = user

    // 创建响应并设置 httpOnly Cookie
    const response = NextResponse.json({
      user: userWithoutPassword,
      token,
    })

    // 设置 httpOnly Cookie（7天有效期）
    // 注意：站点当前通过 http 访问（Nginx 未启用 SSL），
    // 若设置 secure:true 浏览器在 http 下不会保存/发送该 cookie，
    // 会导致登录后立即被踢回登录页。故此处不强制 secure。
    const isHttps = (process.env.NODE_ENV === "production") &&       (process.env.FORCE_SECURE_COOKIE === "true")
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "登录失败" },
      { status: 500 }
    )
  }
}
