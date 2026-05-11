import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"

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
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params
    const authResult = await authorize(orgId)
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const statusFilter = req.nextUrl.searchParams.get("status")

    const jobs = await prisma.profileRegenJob.findMany({
      where: {
        agent: { orgId },
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        agent: { select: { id: true, name: true, hermesProfile: true } },
      },
    })

    return NextResponse.json({ jobs })
  } catch (err) {
    console.error("Failed to list regen jobs:", err)
    return NextResponse.json({ error: "Failed to list regen jobs" }, { status: 500 })
  }
}
