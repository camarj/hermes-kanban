import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"
import { getSkill, updateSkill, deleteSkill } from "@/lib/skills/queries"
import { enqueueRegenJob, kickRegenDrain } from "@/lib/hermes/regen-drain"

async function authorize(orgId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Unauthorized", status: 401 as const }

  const membership = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })
  if (!membership) return { error: "Forbidden", status: 403 as const }

  return { session, membership }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; skillId: string }> },
) {
  try {
    const { orgId, skillId } = await params
    const authResult = await authorize(orgId)
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const skill = await getSkill(orgId, skillId)
    if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 })
    return NextResponse.json({ skill })
  } catch (err) {
    console.error("Failed to get skill:", err)
    return NextResponse.json({ error: "Failed to get skill" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; skillId: string }> },
) {
  try {
    const { orgId, skillId } = await params
    const authResult = await authorize(orgId)
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await req.json()
    const result = await updateSkill(orgId, skillId, { files: body.files })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Enqueue regen for every agent in the org that uses this skill
    const skill = await prisma.skill.findFirst({ where: { id: skillId, orgId } })
    let affectedAgents = 0
    if (skill) {
      const agents = await prisma.agent.findMany({
        where: { orgId, skills: { has: skill.name } },
        select: { id: true },
      })
      affectedAgents = agents.length
      for (const a of agents) {
        await enqueueRegenJob({ agentId: a.id, reason: `skill-edit:${skillId}` })
      }
      if (affectedAgents > 0) kickRegenDrain()
    }

    return NextResponse.json({ skill: result.skill, affectedAgents })
  } catch (err) {
    console.error("Failed to update skill:", err)
    return NextResponse.json({ error: "Failed to update skill" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; skillId: string }> },
) {
  try {
    const { orgId, skillId } = await params
    const authResult = await authorize(orgId)
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const result = await deleteSkill(orgId, skillId)
    if (!result.ok) {
      if (result.agentsUsing) {
        return NextResponse.json(
          { error: result.error, agentsUsing: result.agentsUsing },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: result.error }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Failed to delete skill:", err)
    return NextResponse.json({ error: "Failed to delete skill" }, { status: 500 })
  }
}
