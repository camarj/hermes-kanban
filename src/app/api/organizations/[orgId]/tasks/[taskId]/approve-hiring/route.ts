import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"
import { createAgent } from "@/lib/agents/create-agent"
import { C_LEVEL_ROLES, WORKER_SPECIALIZATIONS, type CLevelRole, type WorkerSpecialization } from "@/lib/agents/types"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { orgId, taskId } = await params

    const membership = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId, userId: session.user.id } },
    })
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const task = await prisma.task.findFirst({ where: { id: taskId, orgId } })
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    if (task.status !== "blocked") {
      return NextResponse.json({ error: "Task is not blocked" }, { status: 400 })
    }

    const meta = task.hermesMetadata as Record<string, string> | null
    if (!meta || meta.type !== "agent_request") {
      return NextResponse.json({ error: "Task is not an agent hiring request" }, { status: 400 })
    }

    const roleType = (meta.role_type || "worker") as "c-level" | "worker"
    const cLevelRole = meta.c_level_role as CLevelRole | undefined
    const specialization = meta.specialization as WorkerSpecialization | undefined
    const nameSuggestion = (meta.name_suggestion as string) || undefined

    const roleLabel = roleType === "c-level"
      ? C_LEVEL_ROLES[cLevelRole!]?.label || cLevelRole!
      : specialization
        ? WORKER_SPECIALIZATIONS[specialization!]?.label || specialization
        : "Worker"

    const agentName = nameSuggestion || `${roleLabel} Agent`

    const agent = await createAgent({
      orgId,
      name: agentName,
      roleType,
      cLevelRole,
      specialization,
    })

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "done",
        completedAt: new Date(),
        body: `${task.body || ""}\n\n--- Approved ---\nAgent "${agent.agent.name}" (@${agent.agent.hermesProfile}) has been created.`,
      },
    })

    return NextResponse.json({
      success: true,
      agent: agent.agent,
      message: `${roleLabel} agent "${agent.agent.name}" has been hired successfully.`,
    })
  } catch (error) {
    console.error("Failed to approve hiring:", error)
    const message = error instanceof Error ? error.message : "Failed to approve hiring"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}