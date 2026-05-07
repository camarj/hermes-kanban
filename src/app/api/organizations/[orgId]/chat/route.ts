import { NextRequest } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { hermesClient, HermesAPIError } from "@/lib/hermes"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth.api.getSession({
    headers: req.headers,
  })

  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const { orgId } = await params

  const membership = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })

  if (!membership) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  const body = await req.json()
  const { messages, profile, stream: shouldStream } = body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Messages are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Check if Hermes Gateway is available
  const isAvailable = await hermesClient.health()
  if (!isAvailable) {
    return new Response(
      JSON.stringify({
        error: "Hermes Gateway is not available. Start it with: hermes gateway start",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    )
  }

  if (shouldStream) {
    // Streaming response using SSE
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await hermesClient.chatCompletionStream(
            {
              messages,
              profile,
              stream: true,
            },
            (chunk) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "content", content: chunk })}\n\n`),
              )
            },
            () => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
              controller.close()
            },
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : "Stream error"
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`),
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  }

  // Non-streaming response
  try {
    const response = await hermesClient.chatCompletion({
      messages,
      profile,
      stream: false,
    })

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat completion failed"
    const status = error instanceof HermesAPIError ? error.statusCode : 500

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  }
}