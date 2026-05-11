import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"
import { installCuratedSkill } from "@/lib/skills/install-curated"

async function authorize(orgId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Unauthorized", status: 401 as const }

  const membership = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })
  if (!membership) return { error: "Forbidden", status: 403 as const }

  return { session, membership }
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
    if (!body.skillId || typeof body.skillId !== "string") {
      return NextResponse.json({ error: "skillId required" }, { status: 400 })
    }

    const result = await installCuratedSkill(orgId, body.skillId)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }
    return NextResponse.json({ skill: result.skill, alreadyInstalled: result.alreadyInstalled })
  } catch (err) {
    console.error("Failed to install curated skill:", err)
    return NextResponse.json({ error: "Failed to install curated skill" }, { status: 500 })
  }
}
