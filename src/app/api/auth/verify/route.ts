// @version v1.5.8
import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: payload.userId,
        username: payload.username,
        role: payload.role,
        name: payload.name,
      },
    })
  } catch (error) {
    console.error("Verify error:", error)
    return NextResponse.json({ authenticated: false }, { status: 500 })
  }
}
