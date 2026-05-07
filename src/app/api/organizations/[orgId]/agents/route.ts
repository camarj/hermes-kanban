import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"
import { profileManager, hermesClient, buildProfileName, buildCEOProfile, buildWorkerProfile } from "@/lib/hermes"

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

    // Enrich with Hermes profile status
    const agentsWithStatus = await Promise.all(
      agents.map(async (agent) => {
        const profileExists = await profileManager.profileExists(agent.hermesProfile)
        return {
          ...agent,
          hermesProfileSynced: profileExists,
        }
      })
    )

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

    // Generate profile name if not provided
    const resolvedProfile = hermesProfile || buildProfileName(org.slug, name, roleType)

    // Check profile uniqueness
    const existingAgent = await prisma.agent.findUnique({
      where: { hermesProfile: resolvedProfile }
    })

    if (existingAgent) {
      return NextResponse.json(
        { error: "Hermes profile already exists" },
        { status: 409 }
      )
    }

    // If templateId provided, verify it exists
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

    // Create agent in DB
    const agent = await prisma.agent.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        hermesProfile: resolvedProfile,
        soulContent: soulContent?.trim() || null,
        skills: skills || [],
        tools: tools || [],
        toolsets: toolsets || [],
        orgId,
        templateId: templateId || null,
        isActive,
        mcpServers: mcpServers || [],
        webhooks: [],
        apiIntegrations: []
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            roleType: true
          }
        }
      }
    })

    // Create Hermes profile if requested and gateway is available
    let hermesProfileCreated = false
    let hermesProfileError: string | null = null

    if (createHermesProfile) {
      const gatewayAvailable = await hermesClient.health()

      if (gatewayAvailable) {
        try {
          // Get all org agents for CEO soul content
          const orgAgents = await prisma.agent.findMany({
            where: { orgId, isActive: true },
            select: { name: true, hermesProfile: true, template: { select: { roleType: true } } },
          })

          const agentsList = orgAgents.map(a => ({
            name: a.name,
            role: a.template?.roleType || "worker",
            profile: a.hermesProfile,
          }))

          let profileInput
          if (roleType === "ceo") {
            profileInput = buildCEOProfile(
              org.slug,
              org.name,
              org.objective || undefined,
              agentsList,
            )
          } else {
            profileInput = buildWorkerProfile(
              org.slug,
              name,
              (specialization as "backend" | "frontend" | "research" | "general") || "general",
              org.name,
              org.objective || undefined,
              mcpServers?.length ? { mcpServers } : undefined,
            )
          }

          // Override with user-provided soul content if given
          if (soulContent) {
            profileInput.soulContent = soulContent
          }

          // Override profile name with resolved value
          profileInput.profileName = resolvedProfile

          const result = await profileManager.createProfile(profileInput)
          hermesProfileCreated = result.success
        } catch (error) {
          hermesProfileError = error instanceof Error ? error.message : "Failed to create Hermes profile"
          console.error("Failed to create Hermes profile:", error)
        }
      } else {
        hermesProfileError = "Hermes Gateway not available. Profile will need to be created manually."
      }
    }

    return NextResponse.json({
      agent,
      hermesProfileCreated,
      hermesProfileError,
    }, { status: 201 })
  } catch (error) {
    console.error("Failed to create agent:", error)
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    )
  }
}