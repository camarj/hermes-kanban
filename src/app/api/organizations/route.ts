import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"
import { profileManager, buildCEOProfile, isHermesAvailable } from "@/lib/hermes"
import { CEO_TEMPLATE } from "@/lib/agents/default-templates"

export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const { name, objective } = body

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Organization name must be at least 2 characters" },
        { status: 400 }
      )
    }

    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
    
    let slug = baseSlug
    let counter = 1
    
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const { organization, ceoAgent } = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: name.trim(),
          slug,
          objective: objective?.trim() || null,
          ownerId: session.user.id,
        }
      })

      await tx.organizationMember.create({
        data: {
          orgId: org.id,
          userId: session.user.id,
          role: "owner",
        }
      })

      const existingTemplate = await tx.agentTemplate.findFirst({
        where: { name: CEO_TEMPLATE.name, orgId: org.id }
      })

      if (!existingTemplate) {
        await tx.agentTemplate.create({
          data: {
            orgId: org.id,
            name: CEO_TEMPLATE.name,
            displayName: CEO_TEMPLATE.displayName,
            description: CEO_TEMPLATE.description,
            roleType: CEO_TEMPLATE.roleType,
            soulContent: null,
            defaultSkills: CEO_TEMPLATE.defaultSkills,
            defaultTools: CEO_TEMPLATE.defaultTools,
            defaultToolsets: CEO_TEMPLATE.defaultToolsets,
            isPublic: CEO_TEMPLATE.isPublic,
          }
        })
      }

      const ceoTemplateId = existingTemplate?.id

      const ceoProfileName = `ceo-${slug}`
      const agent = await tx.agent.create({
        data: {
          orgId: org.id,
          templateId: ceoTemplateId,
          hermesProfile: ceoProfileName,
          name: "CEO Agent",
          description: `Chief Executive Agent for ${org.name}`,
          soulContent: null,
          skills: CEO_TEMPLATE.defaultSkills,
          tools: CEO_TEMPLATE.defaultTools,
          toolsets: CEO_TEMPLATE.defaultToolsets,
          isActive: true,
          mcpServers: [],
          webhooks: [],
          apiIntegrations: [],
        },
        include: {
          template: {
            select: { id: true, name: true, roleType: true }
          }
        }
      })

      return { organization: org, ceoAgent: agent }
    })

    let hermesProfileCreated = false
    let hermesProfileError: string | null = null

    try {
      const gatewayAvailable = await isHermesAvailable()
      if (gatewayAvailable) {
        const profileInput = buildCEOProfile(
          organization.slug,
          organization.name,
          organization.objective || undefined,
          [],
        )
        const result = await profileManager.createProfile(profileInput)
        hermesProfileCreated = result.success
      } else {
        hermesProfileError = "Hermes Gateway not available. CEO profile will sync when gateway is online."
      }
    } catch (error) {
      hermesProfileError = error instanceof Error ? error.message : "Failed to create Hermes profile"
      console.error("Failed to create CEO Hermes profile:", error)
    }

    return NextResponse.json({
      organization,
      ceoAgent: {
        ...ceoAgent,
        hermesProfileSynced: hermesProfileCreated,
      },
      hermesProfileCreated,
      hermesProfileError,
    }, { status: 201 })
  } catch (error) {
    console.error("Failed to create organization:", error)
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    )
  }
}