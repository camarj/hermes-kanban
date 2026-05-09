import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"
import { listAvailableTemplates } from "@/lib/agents/list-templates"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

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

    const templates = await listAvailableTemplates(orgId)
    return NextResponse.json({ templates })
  } catch (error) {
    console.error("Failed to fetch agent templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch agent templates" },
      { status: 500 }
    )
  }
}
