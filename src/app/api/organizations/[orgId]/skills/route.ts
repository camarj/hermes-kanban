import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"
import { listSkills, createSkill } from "@/lib/skills/queries"
import type { SkillSource } from "@prisma/client"

async function authorize(orgId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Unauthorized", status: 401 as const }

  const membership = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })
  if (!membership) return { error: "Forbidden", status: 403 as const }

  return { session, membership }
}

const VALID_SOURCES: SkillSource[] = ["custom", "github", "curated"]

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params
    const authResult = await authorize(orgId)
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const sourceParam = req.nextUrl.searchParams.get("source")
    const source =
      sourceParam && (VALID_SOURCES as string[]).includes(sourceParam)
        ? (sourceParam as SkillSource)
        : undefined

    const skills = await listSkills(orgId, source ? { source } : {})
    return NextResponse.json({ skills })
  } catch (err) {
    console.error("Failed to list skills:", err)
    return NextResponse.json({ error: "Failed to list skills" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params
    const authResult = await authorize(orgId)
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await req.json()
    const result = await createSkill(orgId, {
      name: body.name,
      files: body.files,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ skill: result.skill }, { status: 201 })
  } catch (err) {
    console.error("Failed to create skill:", err)
    return NextResponse.json({ error: "Failed to create skill" }, { status: 500 })
  }
}
