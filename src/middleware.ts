// @version v1.5.16
import { NextResponse } from "next/server"



import type { NextRequest } from "next/server"



import { verifyToken } from "@/lib/auth"







// 需要登录的路径



const protectedPaths = [



  "/api/users",



  "/api/sessions",



  "/api/participants",



  "/api/records",



  "/api/admin",



  "/api/sse",



  "/api/page-configs",



  "/admin",



]







// 需要管理员权限的路径



const adminPaths = [



  "/api/users",



  "/api/admin",



  "/api/page-configs",



  "/admin",



]







// 公开路径（不需要认证）



const publicPaths = [



  "/api/auth/login",



  "/api/auth/logout",



  "/api/init",



  "/api/page-configs",



  "/api/participants/options",



  "/api/participants/search",



  "/api/users/options",



  "/api/admin/equipments/names",



  "/api/records/search",



  "/api/records/callsign-stats",



  "/api/sessions/*/export",



]







export async function middleware(request: NextRequest) {



  const { pathname } = request.nextUrl







  // 检查是否是公开路径



  const isPublicPath = publicPaths.some(pattern => {



    if (pattern.includes("*")) {



      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$")



      return regex.test(pathname)



    }



    return pathname === pattern || pathname.startsWith(pattern + "/")



  })







  // 公开路径直接放行



  if (isPublicPath) {



    return NextResponse.next()



  }







  // 检查是否是受保护路径



  const isProtectedPath = protectedPaths.some(path => 



    pathname === path || pathname.startsWith(path + "/")



  )







  if (!isProtectedPath) {



    return NextResponse.next()



  }







  // 验证 token：优先 Authorization: Bearer <token>，其次回退到 cookie(名为 token)


  const authHeader = request.headers.get("authorization")


  let token = null





  if (authHeader && authHeader.startsWith("Bearer ")) {


    token = authHeader.substring(7)


  } else {


    const cookieHeader = request.headers.get("cookie")


    if (cookieHeader) {


      const cookies: Record<string, string> = {}


      cookieHeader.split(";").forEach((c) => {


        const idx = c.indexOf("=")


        if (idx > -1) {


          const k = c.slice(0, idx).trim()


          const v = c.slice(idx + 1).trim()


          cookies[k] = decodeURIComponent(v)


        }


      })


      token = cookies["token"] || null


    }


  }





  // 区分页面路由(/admin 等)与 API 路由：

  // 页面未认证 -> 重定向到 /login（避免浏览器直接打开后台页时出现空白/401 JSON）；

  // API 未认证 -> 返回 401 JSON（供前端 fetch 判断）。

  const isPagePath = !pathname.startsWith("/api")

  const loginUrl = new URL("/login", request.url)



  if (!token) {

    if (isPagePath) {

      return NextResponse.redirect(loginUrl)

    }

    console.log(`[Middleware] ${pathname} - No token (Bearer or cookie), returning 401`)

    return NextResponse.json({ error: "需要登录" }, { status: 401 })

  }



  const payload = await verifyToken(token)



  if (!payload) {

    if (isPagePath) {

      return NextResponse.redirect(loginUrl)

    }

    console.log(`[Middleware] ${pathname} - Token verification failed, returning 401`)

    return NextResponse.json({ error: "登录已过期，请重新登录" }, { status: 401 })

  }





  // 检查管理员权限



  const isAdminPath = adminPaths.some(path => 



    pathname === path || pathname.startsWith(path + "/")



  )







  if (isAdminPath && payload.role !== "admin") {
    // API 路径：返回 JSON 403，由前端处理
    if (pathname.startsWith("/api/")) {
      console.log(`[Middleware] ${pathname} - Admin required but user role is ${payload.role}, returning 403`)
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 })
    }
    // 页面路径：已登录但非管理员，重定向回首页，避免浏览器直接渲染裸 JSON「无权限进入」
    console.log(`[Middleware] ${pathname} - Admin required but user role is ${payload.role}, redirect to /`)
    return NextResponse.redirect(new URL("/", request.url))
  }







  // 将用户信息附加到请求头，传递给路由处理器



  const requestHeaders = new Headers(request.headers)



  requestHeaders.set("x-user-id", payload.userId)



  requestHeaders.set("x-user-role", payload.role)



  requestHeaders.set("x-user-username", payload.username)







  console.log(`[Middleware] ${pathname} - Authenticated as ${payload.username} (${payload.role})`)







  const response = NextResponse.next({



    request: {



      headers: requestHeaders,



    },



  })







  // 添加安全响应头



  response.headers.set("X-Content-Type-Options", "nosniff")



  response.headers.set("X-Frame-Options", "DENY")



  response.headers.set("X-XSS-Protection", "1; mode=block")



  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")



  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

  // [v1.5.10] 前台页面（非 /api）禁止缓存，避免后台配置修改后证书等页面仍显示旧版
  if (!pathname.startsWith("/api")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
  }







  return response



}







export const config = {



  matcher: [



    "/api/:path*",



    "/admin/:path*",
    "/query/:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)",



  ],



}



