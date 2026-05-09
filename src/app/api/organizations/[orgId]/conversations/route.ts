import { NextRequest } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"

export const dynamic = "force-dynamic"

// GET /api/organizations/[orgId]/conversations
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orgId } = await params

  const membership = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const conversations = await prisma.conversation.findMany({
    where: { orgId, userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      agent: { select: { id: true, name: true, hermesProfile: true } },
      _count: { select: { messages: true } },
    },
  })

  return Response.json(conversations)
}

// POST /api/organizations/[orgId]/conversations
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orgId } = await params

  const membership = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { agentId, profile, title } = body

  if (!agentId || !profile) {
    return Response.json({ error: "agentId and profile are required" }, { status: 400 })
  }

  const conversation = await prisma.conversation.create({
    data: {
      orgId,
      userId: session.user.id,
      agentId,
      profile,
      title: title || null,
    },
  })

  return Response.json(conversation)
}
