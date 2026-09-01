// @version v1.5.20
import { NextRequest, NextResponse } from "next/server"
import { userManager, loginLogManager } from "@/storage/database"
import { signToken } from "@/lib/auth"
import { verifyPassword, isPasswordHashed, hashPassword } from "@/lib/password"
import { RateLimiterMemory } from "rate-limiter-flexible"

// [v1.5.13 安全] 获取真实客户端 IP。
// 信任顺序：X-Real-IP（由 Nginx 用 $remote_addr 覆写，客户端无法伪造）
//   → X-Forwarded-For 最左（仅当无 X-Real-IP 时作为兜底，仍可被伪造，故 Nginx 必须覆写 X-Real-IP）。
// 旧实现直接取 x-forwarded-for 全部由客户端可控，攻击者可随意伪造 IP 绕过限流。
function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    // X-Real-IP 应为单个 IP（Nginx 覆写），取第一段防注入
    return realIp.split(",")[0].trim()
  }
  const xff = request.headers.get("x-forwarded-for")
  if (xff) {
    // 取最左（最早代理）作为最接近客户端的公网 IP
    return xff.split(",")[0].trim()
  }
  return "unknown"
}

// 速率限制：每分钟最多 10 次登录尝试（按 IP）
const rateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
})

// [v1.5.13 安全] 用户名级失败锁定：同一账号连续失败 5 次锁定 15 分钟，
// 防止针对单账号的密码爆破（与 IP 限流互补）。
const accountLimiter = new RateLimiterMemory({
  points: 5,
  duration: 15 * 60,
})

export async function POST(request: NextRequest) {
  try {
    // 获取客户端真实 IP 与设备标识（用于登录日志）
    const ip = getClientIp(request)
    const userAgent = request.headers.get("user-agent") || ""

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
      // 账号不存在：仍按账号名消耗锁定额度，避免攻击者探测哪些账号存在
      try { await accountLimiter.consume(String(username).toLowerCase()) } catch { /* 锁定中 */ }
      // 记录"账号不存在"的尝试：连续探测不同账号是必须能看见的攻击信号
      await loginLogManager.write({
        userId: undefined,
        username: String(username),
        success: false,
        reason: "NO_SUCH_USER",
        ip,
        userAgent,
      })
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      // [v1.5.13 安全] 账号级失败计数，连续失败达上限锁定该账号
      try {
        await accountLimiter.consume(String(username).toLowerCase())
      } catch {
        await loginLogManager.write({
          userId: user.id,
          username: user.username,
          success: false,
          reason: "LOCKED",
          ip,
          userAgent,
        })
        return NextResponse.json(
          { error: "该账号已被临时锁定，请 15 分钟后再试" },
          { status: 429 }
        )
      }
      await loginLogManager.write({
        userId: user.id,
        username: user.username,
        success: false,
        reason: "WRONG_PASSWORD",
        ip,
        userAgent,
      })
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      )
    }

    // 登录成功：重置该账号的失败计数
    await accountLimiter.delete(String(username).toLowerCase())

    // 如果密码是明文，自动升级为哈希
    if (!isPasswordHashed(user.password)) {
      const hashedPassword = await hashPassword(password)
      await userManager.updateUser(user.id, { password: hashedPassword })
    }

    // 记录登录成功
    await loginLogManager.write({
      userId: user.id,
      username: user.username,
      success: true,
      ip,
      userAgent,
    })

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
