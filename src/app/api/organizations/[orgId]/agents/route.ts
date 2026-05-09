import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"
import { profileManager, buildProfileName } from "@/lib/hermes"
import { createAgent, listOrgAgents } from "@/lib/agents/create-agent"
import { type CLevelRole, type WorkerSpecialization } from "@/lib/agents/types"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { orgId } = await params

    const membership = await prisma.organizationMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: session.user.id
        }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const agents = await prisma.agent.findMany({
      where: { orgId },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            roleType: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    const agentsWithStatus = agents.map((agent) => ({
      ...agent,
      hermesProfileSynced: agent.profileSyncedAt !== null,
    }))

    return NextResponse.json({ agents: agentsWithStatus })
  } catch (error) {
    console.error("Failed to fetch agents:", error)
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { orgId } = await params
    const body = await req.json()
    const { 
      name, 
      description, 
      hermesProfile,
      soulContent,
      skills,
      tools,
      toolsets,
      templateId,
      isActive = true,
      createHermesProfile = true,
      roleType = "worker",
      cLevelRole,
      specialization,
      mcpServers,
    } = body

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters" },
        { status: 400 }
      )
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, slug: true, objective: true },
    })

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: session.user.id
        }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    if (roleType === "ceo") {
      const existingCeo = await prisma.agent.findFirst({
        where: { orgId, hermesProfile: { startsWith: "ceo-" } },
      })
      if (existingCeo) {
        return NextResponse.json(
          { error: "This organization already has a CEO agent" },
          { status: 409 }
        )
      }
    }

    const resolvedRoleType = roleType as "ceo" | "c-level" | "worker"
    const resolvedProfile = hermesProfile || buildProfileName(org.slug, name, resolvedRoleType)

    const existingAgent = await prisma.agent.findUnique({
      where: { hermesProfile: resolvedProfile }
    })

    if (existingAgent) {
      return NextResponse.json(
        { error: "Hermes profile already exists" },
        { status: 409 }
      )
    }

    if (templateId) {
      const template = await prisma.agentTemplate.findFirst({
        where: {
          id: templateId,
          OR: [
            { orgId },
            { isPublic: true }
          ]
        }
      })
      if (!template) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        )
      }
    }

    const result = await createAgent({
      orgId,
      name,
      description,
      roleType: roleType as "ceo" | "c-level" | "worker",
      cLevelRole: cLevelRole as CLevelRole | undefined,
      specialization: specialization as WorkerSpecialization | undefined,
      soulContent,
      skills,
      tools,
      toolsets,
      templateId,
      mcpServers,
      isActive,
    })

    if (result.hermesProfileError && !result.agent.id) {
      return NextResponse.json({ error: result.hermesProfileError }, { status: 409 })
    }

    const status = result.agent.id ? 201 : 500
    return NextResponse.json(result, { status })
  } catch (error) {
    console.error("Failed to create agent:", error)
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    )
  }
}