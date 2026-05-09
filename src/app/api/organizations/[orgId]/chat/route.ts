import { NextRequest } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { hermesClient, HermesAPIError, profileManager } from "@/lib/hermes"
import { kanbanTools, executeKanbanTool } from "@/lib/hermes/kanban-tools"

export const dynamic = "force-dynamic"

// Build a system message that teaches the agent how to use tools
function buildToolsSystemMessage(): { role: "system"; content: string } {
  const toolDescriptions = kanbanTools.map((t) => {
    const params = Object.entries(t.parameters.properties)
      .map(([name, prop]) => {
        const required = t.parameters.required.includes(name) ? " (required)" : " (optional)"
        const enumVals = prop.enum ? ` [${prop.enum.join(" | ")}]` : ""
        return `    - ${name}: ${prop.type}${enumVals} — ${prop.description}${required}`
      })
      .join("\n")
    return `### ${t.name}\n${t.description}\nParameters:\n${params || "    (none)"}`
  }).join("\n\n")

  return {
    role: "system",
    content: `You have access to Kanban and Agent management tools. When you need to create, read, update, or complete tasks, or manage agents, you MUST use the tool format below.

## Available Tools

${toolDescriptions}

## Tool Call Format

When you want to execute a tool, output ONLY a JSON block like this (nothing else before or after):

\`\`\`json
{"tool": "kanban_create", "arguments": {"title": "Example task", "body": "Description", "assignee": "ceo-inteliside", "priority": 0}}
\`\`\`

After executing the tool, you will receive the result and can respond to the user with a natural language summary.

## Agent Hiring Rules

1. **C-Level roles (CTO, CFO, CMO, COO)**: You can hire them DIRECTLY using \`agent_hire\` with role_type="c-level". No approval needed.
2. **Worker roles (specialists)**: You must request partner approval using \`agent_request\`. This creates a blocked task in the Kanban board that the partner must approve.
3. **Always use \`agents_list\` first** to verify which agents already exist and which roles are available before hiring or requesting.

### Quick reference:
- Need a C-Level? → \`agents_list\` then \`agent_hire\` with role_type="c-level"
- Need a worker? → \`agents_list\` then \`agent_request\` with role_type="worker"
- Assigning a task? → \`agents_list\` to get the correct profile name, then \`kanban_create\` with that assignee

Important rules:
- Use the EXACT tool names shown above
- Provide ALL required parameters
- Do NOT make up agent names — always use \`agents_list\` to verify the assignee exists
- Do NOT make up tasks that don't exist — always use \`kanban_show\` first to verify
- After creating tasks or agents, summarize what was created for the user`,
  }
}

// Parse tool calls from assistant response
function parseToolCalls(content: string): Array<{ tool: string; arguments: Record<string, unknown> }> {
  const calls: Array<{ tool: string; arguments: Record<string, unknown> }> = []
  // Match JSON code blocks
  const regex = /```json\s*([\s\S]*?)```/g
  let match
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim())
      if (parsed.tool && typeof parsed.tool === "string") {
        calls.push({ tool: parsed.tool, arguments: parsed.arguments || {} })
      }
    } catch {
      // skip malformed JSON
    }
  }
  return calls
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })
  }

  const { orgId } = await params

  const membership = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })
  if (!membership) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } })
  }

  const body = await req.json()
  const { messages, profile, stream: shouldStream, conversationId, agentId } = body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Messages are required" }), { status: 400, headers: { "Content-Type": "application/json" } })
  }

  const isAvailable = await hermesClient.health()
  if (!isAvailable) {
    return new Response(
      JSON.stringify({ error: "Hermes Gateway is not available. Start it with: hermes gateway start" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    )
  }

  // Handle conversation persistence
  let convId = conversationId as string | undefined
  let previousMessages: Array<{ role: string; content: string }> = []

  if (convId) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: convId, orgId, userId: session.user.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: { role: true, content: true },
        },
      },
    })
    if (conversation) {
      previousMessages = conversation.messages.map((m) => ({ role: m.role, content: m.content }))
    }
  } else if (agentId && profile) {
    const conversation = await prisma.conversation.create({
      data: {
        orgId,
        userId: session.user.id,
        agentId,
        profile,
        title: messages[messages.length - 1]?.content?.slice(0, 100) || "New conversation",
      },
    })
    convId = conversation.id
  }

  const fullMessages = [...previousMessages, ...messages]

  // Save user messages to DB
  if (convId) {
    const userMessages = messages.filter((m: { role: string }) => m.role === "user" || m.role === "system")
    if (userMessages.length > 0) {
      await prisma.chatMessage.createMany({
        data: userMessages.map((m: { role: string; content: string }) => ({
          conversationId: convId,
          role: m.role,
          content: m.content,
        })),
      })
      await prisma.conversation.update({ where: { id: convId }, data: { updatedAt: new Date() } })
    }
  }

  // Build enriched messages with SOUL.md and tools
  let enrichedMessages = fullMessages
  if (profile) {
    const soulContent = await profileManager.readProfileSoul(profile)
    if (soulContent) {
      const systemMessage = { role: "system" as const, content: soulContent }
      const toolsMessage = buildToolsSystemMessage()
      const existingSystemIdx = fullMessages.findIndex((m: { role: string }) => m.role === "system")
      if (existingSystemIdx >= 0) {
        enrichedMessages = [
          ...fullMessages.slice(0, existingSystemIdx),
          systemMessage,
          toolsMessage,
          ...fullMessages.slice(existingSystemIdx + 1),
        ]
      } else {
        enrichedMessages = [systemMessage, toolsMessage, ...fullMessages]
      }
    }
  }

  // ===== TOOL CALLING LOOP =====
  // We do max 3 rounds of tool calling to avoid infinite loops
  let finalContent = ""
  let currentMessages = enrichedMessages
  const MAX_TOOL_ROUNDS = 3

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // Get non-streaming response to check for tool calls
    const response = await hermesClient.chatCompletion({
      messages: currentMessages,
      profile,
      stream: false,
    })

    const assistantContent = response.choices?.[0]?.message?.content || ""
    const toolCalls = parseToolCalls(assistantContent)

    if (toolCalls.length === 0) {
      // No tool calls — this is the final response
      finalContent = assistantContent
      break
    }

    // Execute tool calls
    const toolResults: Array<{ tool: string; result: string; success: boolean }> = []
    for (const call of toolCalls) {
      const result = await executeKanbanTool(call.tool, call.arguments, orgId)
      toolResults.push({ tool: call.tool, result: result.result, success: result.success })
    }

    // Add assistant message and tool results to conversation
    currentMessages = [
      ...currentMessages,
      { role: "assistant", content: assistantContent },
      {
        role: "user",
        content: `Tool execution results:\n\n${toolResults
          .map((r) => `[${r.tool}] ${r.success ? "✓" : "✗"} ${r.result}`)
          .join("\n\n")}\n\nPlease provide a natural language summary for the user.`,
      },
    ]
  }

  // Save final assistant response
  if (convId && finalContent) {
    await prisma.chatMessage.create({
      data: {
        conversationId: convId,
        role: "assistant",
        content: finalContent,
      },
    })
    await prisma.conversation.update({ where: { id: convId }, data: { updatedAt: new Date() } })
  }

  // Stream the final response
  if (shouldStream) {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        try {
          // Stream word by word for a natural feel
          const words = finalContent.split(/(\s+)/)
          for (const word of words) {
            const event = `data: ${JSON.stringify({ type: "content", content: word })}\n\n`
            controller.enqueue(encoder.encode(event))
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
          controller.close()
        } catch (error) {
          const message = error instanceof Error ? error.message : "Stream error"
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Conversation-Id": convId || "",
      },
    })
  }

  return new Response(JSON.stringify({ content: finalContent, conversationId: convId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}
