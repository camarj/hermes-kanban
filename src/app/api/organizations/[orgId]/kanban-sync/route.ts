import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { kanbanSync } from "@/lib/hermes"

export const dynamic = "force-dynamic"

export async function POST(
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
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })

  if (!membership || (membership.role !== "owner" && membership.role !== "board")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Ensure we have a default project for synced tasks
  const defaultProject = await prisma.project.findFirst({
    where: { orgId, status: "active" },
    orderBy: { createdAt: "asc" },
  })

  if (!defaultProject) {
    return NextResponse.json(
      { error: "No active project found. Create a project first." },
      { status: 400 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const { board, dryRun } = body

  const result = await kanbanSync.pullFromHermes(orgId, {
    board,
    dryRun,
  })

  return NextResponse.json(result)
}

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
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const isGatewayRunning = await kanbanSync.isGatewayRunning()

  return NextResponse.json({
    gatewayAvailable: isGatewayRunning,
  })
}