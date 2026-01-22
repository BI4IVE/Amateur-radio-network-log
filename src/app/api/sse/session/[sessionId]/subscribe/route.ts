import { NextRequest } from "next/server"

// 存储活跃的 SSE 连接
const activeConnections = new Map<string, Set<ReadableStreamDefaultController>>()

// 广播消息给指定会话的所有订阅者
export function broadcastToSession(sessionId: string, data: any) {
  const controllers = activeConnections.get(sessionId)
  if (controllers) {
    const message = `data: ${JSON.stringify(data)}\n\n`
    controllers.forEach((controller) => {
      try {
        controller.enqueue(new TextEncoder().encode(message))
      } catch (error) {
        console.error("Failed to send message to controller:", error)
      }
    })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params

  // 创建 SSE 流
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // 添加连接到活跃连接列表
      if (!activeConnections.has(sessionId)) {
        activeConnections.set(sessionId, new Set())
      }
      activeConnections.get(sessionId)!.add(controller)

      // 发送初始连接确认
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`))

      // 心跳保持连接
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"))
        } catch (error) {
          clearInterval(heartbeat)
        }
      }, 30000)

      // 清理连接
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        const controllers = activeConnections.get(sessionId)
        if (controllers) {
          controllers.delete(controller)
          if (controllers.size === 0) {
            activeConnections.delete(sessionId)
          }
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
