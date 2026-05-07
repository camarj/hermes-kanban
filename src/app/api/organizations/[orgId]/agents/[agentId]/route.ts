import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; agentId: string }> }
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

    const { orgId, agentId } = await params

    // Verify user is member of organization
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

    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        orgId
      },
      include: {
        template: true
      }
    })

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ agent })
  } catch (error) {
    console.error("Failed to fetch agent:", error)
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; agentId: string }> }
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

    const { orgId, agentId } = await params
    const body = await req.json()
    const {
      name,
      description,
      soulContent,
      skills,
      tools,
      toolsets,
      mcpServers,
      webhooks,
      apiIntegrations,
      isActive
    } = body

    // Verify user is member of organization
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

    // Verify agent belongs to org
    const existingAgent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        orgId
      }
    })

    if (!existingAgent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (soulContent !== undefined) updateData.soulContent = soulContent?.trim() || null
    if (skills !== undefined) updateData.skills = skills
    if (tools !== undefined) updateData.tools = tools
    if (toolsets !== undefined) updateData.toolsets = toolsets
    if (mcpServers !== undefined) updateData.mcpServers = mcpServers
    if (webhooks !== undefined) updateData.webhooks = webhooks
    if (apiIntegrations !== undefined) updateData.apiIntegrations = apiIntegrations
    if (isActive !== undefined) updateData.isActive = isActive

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: updateData,
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

    return NextResponse.json({ agent })
  } catch (error) {
    console.error("Failed to update agent:", error)
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; agentId: string }> }
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

    const { orgId, agentId } = await params

    // Verify user is member of organization
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

    // Verify agent belongs to org
    const existingAgent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        orgId
      }
    })

    if (!existingAgent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      )
    }

    await prisma.agent.delete({
      where: { id: agentId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete agent:", error)
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 }
    )
  }
}