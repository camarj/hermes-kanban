import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { createHmac } from "crypto"

const WEBHOOK_SECRET = process.env.HERMES_WEBHOOK_SECRET || ""

function verifySignature(payload: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET) return true
  if (!signature) return false

  const expected = createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex")
  return signature === expected
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get("x-hermes-signature")

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const event = JSON.parse(rawBody)
    const { type, data, org_id } = event

    if (!org_id) {
      return NextResponse.json({ error: "Missing org_id" }, { status: 400 })
    }

    // Verify org exists
    const org = await prisma.organization.findFirst({
      where: { id: org_id },
    })
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    switch (type) {
      case "task_created": {
        await handleTaskCreated(data, org_id)
        break
      }
      case "task_completed": {
        await handleTaskCompleted(data, org_id)
        break
      }
      case "task_blocked": {
        await handleTaskBlocked(data, org_id)
        break
      }
      case "task_unblocked": {
        await handleTaskUnblocked(data, org_id)
        break
      }
      case "task_updated": {
        await handleTaskUpdated(data, org_id)
        break
      }
      case "agent_spawned": {
        // Log the event, no action needed yet
        await logEvent(org_id, type, data)
        break
      }
      default:
        console.warn(`Unknown Hermes event type: ${type}`)
    }

    // Store the event for audit
    await logEvent(org_id, type, data)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    )
  }
}

async function handleTaskCreated(data: Record<string, unknown>, orgId: string) {
  const hermesTaskId = data.task_id as string
  const existing = await prisma.task.findUnique({
    where: { hermesTaskId },
  })
  if (existing) return

  // Find a default project for this org
  const project = await prisma.project.findFirst({
    where: { orgId, status: "active" },
    orderBy: { createdAt: "asc" },
  })

  if (!project) return

  await prisma.task.create({
    data: {
      hermesTaskId,
      title: (data.title as string) || "Untitled",
      body: (data.body as string) || null,
      status: (data.status as string) || "triage",
      priority: (data.priority as number) || 0,
      assignee: (data.assignee as string) || null,
      projectId: project.id,
      orgId,
      workspaceType: (data.workspace_type as string) || "scratch",
      hermesMetadata: data as Record<string, unknown> as unknown as object,
    },
  })
}

async function handleTaskCompleted(data: Record<string, unknown>, orgId: string) {
  const hermesTaskId = data.task_id as string

  await prisma.task.updateMany({
    where: { hermesTaskId, orgId },
    data: {
      status: "done",
      completedAt: new Date(),
    },
  })

  // Notify board members
  await createNotification(orgId, hermesTaskId, "task_completed", data)
}

async function handleTaskBlocked(data: Record<string, unknown>, orgId: string) {
  const hermesTaskId = data.task_id as string

  await prisma.task.updateMany({
    where: { hermesTaskId, orgId },
    data: {
      status: "blocked",
      blockedReason: (data.reason as string) || null,
    },
  })

  await createNotification(orgId, hermesTaskId, "task_blocked", data)
}

async function handleTaskUnblocked(data: Record<string, unknown>, orgId: string) {
  const hermesTaskId = data.task_id as string

  await prisma.task.updateMany({
    where: { hermesTaskId, orgId },
    data: {
      status: "ready",
      blockedReason: null,
    },
  })
}

async function handleTaskUpdated(data: Record<string, unknown>, orgId: string) {
  const hermesTaskId = data.task_id as string

  const updateData: Record<string, unknown> = {}
  if (data.title) updateData.title = data.title
  if (data.body) updateData.body = data.body
  if (data.status) updateData.status = data.status
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.assignee) updateData.assignee = data.assignee

  await prisma.task.updateMany({
    where: { hermesTaskId, orgId },
    data: updateData,
  })
}

async function createNotification(
  orgId: string,
  hermesTaskId: string | undefined,
  type: string,
  data: Record<string, unknown>,
) {
  const task = hermesTaskId
    ? await prisma.task.findFirst({ where: { hermesTaskId } })
    : null

  if (!task) return

  // Get board members to notify
  const boardMembers = await prisma.organizationMember.findMany({
    where: { orgId, role: { in: ["owner", "board"] } },
  })

  await prisma.notification.createMany({
    data: boardMembers.map((member) => ({
      userId: member.userId,
      orgId,
      type,
      taskId: task.id,
      title: `Task ${type === "task_completed" ? "completed" : "blocked"}: ${task.title}`,
      body: (data.summary as string) || (data.reason as string) || null,
    })),
  })
}

async function logEvent(orgId: string, type: string, data: Record<string, unknown>) {
await prisma.webhookEvent.create({
    data: {
      orgId,
      eventType: type,
      payload: JSON.parse(JSON.stringify(data)),
    },
  })
}