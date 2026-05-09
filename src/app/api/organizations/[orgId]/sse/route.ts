import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { addSSEClient, removeSSEClient } from "@/lib/sse-broadcast"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth.api.getSession({
    headers: req.headers,
  })

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orgId } = await params

  const membership = await prisma.organizationMember.findUnique({
    where: {
      orgId_userId: {
        orgId,
        userId: session.user.id,
      },
    },
  })

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const stream = new ReadableStream({
    start(controller) {
      addSSEClient(orgId, controller)

      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      )

      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`: heartbeat\n\n`))
        } catch {
          clearInterval(heartbeatInterval)
          removeSSEClient(orgId, controller)
        }
      }, 30000)

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval)
        removeSSEClient(orgId, controller)
        try {
          controller.close()
        } catch {}
      })
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
