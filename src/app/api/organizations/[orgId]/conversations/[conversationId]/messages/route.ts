import { NextRequest } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"

export const dynamic = "force-dynamic"

// GET /api/organizations/[orgId]/conversations/[conversationId]/messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; conversationId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orgId, conversationId } = await params

  const membership = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, orgId, userId: session.user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, createdAt: true },
      },
      agent: { select: { id: true, name: true, hermesProfile: true } },
    },
  })

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 })
  }

  return Response.json(conversation)
}

// POST /api/organizations/[orgId]/conversations/[conversationId]/messages
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; conversationId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orgId, conversationId } = await params

  const membership = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { role, content } = body

  if (!role || !content) {
    return Response.json({ error: "role and content are required" }, { status: 400 })
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, orgId, userId: session.user.id },
  })

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 })
  }

  const message = await prisma.chatMessage.create({
    data: { conversationId, role, content },
  })

  // Update conversation updatedAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  })

  return Response.json(message)
}
