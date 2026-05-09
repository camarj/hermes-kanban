import { NextRequest } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { kanbanSync } from "@/lib/hermes"

export const dynamic = "force-dynamic"

// POST /api/organizations/[orgId]/kanban-sync
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orgId } = await params

  const membership = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { board, dryRun } = body

  try {
    const result = await kanbanSync.pullFromHermes(orgId, { board, dryRun })
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed"
    return Response.json({ error: message }, { status: 500 })
  }
}
