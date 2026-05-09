import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"
import { syncCeoProfile, syncPendingCeoProfiles } from "@/lib/hermes/profile-sync"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orgId } = await params

  const membership = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
    select: { role: true },
  })

  if (!membership || !["owner", "board"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, slug: true, name: true, objective: true },
  })

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({})) as { agentId?: string }

  if (body.agentId) {
    const agent = await prisma.agent.findFirst({
      where: { id: body.agentId, orgId },
      include: { template: { select: { roleType: true } } },
    })

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    const result = await syncCeoProfile(agent, org)

    if (!result.gatewayAvailable) {
      return NextResponse.json(
        { error: "Hermes Gateway no está disponible. Reintenta cuando vuelva online." },
        { status: 503 },
      )
    }

    if (!result.synced) {
      return NextResponse.json(
        { synced: false, error: result.error },
        { status: 422 },
      )
    }

    return NextResponse.json({
      synced: true,
      alreadyExisted: result.alreadyExisted,
      agentId: agent.id,
    })
  }

  const bulk = await syncPendingCeoProfiles(org)

  if (!bulk.gatewayAvailable) {
    return NextResponse.json(
      { error: "Hermes Gateway no está disponible. Reintenta cuando vuelva online." },
      { status: 503 },
    )
  }

  return NextResponse.json(bulk)
}
