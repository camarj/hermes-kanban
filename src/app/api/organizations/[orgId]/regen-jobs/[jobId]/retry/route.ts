import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"
import { kickRegenDrain } from "@/lib/hermes/regen-drain"

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
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; jobId: string }> },
) {
  try {
    const { orgId, jobId } = await params
    const authResult = await authorize(orgId)
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const job = await prisma.profileRegenJob.findFirst({
      where: { id: jobId, agent: { orgId } },
    })
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }
    if (job.status === "running" || job.status === "pending") {
      return NextResponse.json({ error: "Job already in progress" }, { status: 409 })
    }

    await prisma.profileRegenJob.update({
      where: { id: jobId },
      data: { status: "pending", error: null, startedAt: null, finishedAt: null },
    })
    kickRegenDrain()

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Failed to retry regen job:", err)
    return NextResponse.json({ error: "Failed to retry regen job" }, { status: 500 })
  }
}
