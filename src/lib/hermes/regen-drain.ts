import { prisma } from "@/lib/db/prisma"
import { regenerateAgentProfile } from "@/lib/agents/regenerate-agent"

let processing = false

export function __resetDrainStateForTests(): void {
  processing = false
}

export interface EnqueueResult {
  jobId?: string
  deduped: boolean
}

export async function enqueueRegenJob(input: {
  agentId: string
  reason: string
}): Promise<EnqueueResult> {
  try {
    const job = await prisma.profileRegenJob.create({
      data: {
        agentId: input.agentId,
        reason: input.reason,
        status: "pending",
      },
    })
    return { jobId: job.id, deduped: false }
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return { deduped: true }
    }
    throw err
  }
}

export async function processNextJob(): Promise<boolean> {
  if (processing) return false
  processing = true

  try {
    const job = await prisma.profileRegenJob.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    })
    if (!job) return false

    await prisma.profileRegenJob.update({
      where: { id: job.id },
      data: { status: "running", startedAt: new Date() },
    })

    try {
      const result = await regenerateAgentProfile(job.agentId, {
        reason: job.reason,
        forceImmediate: true,
      })

      if (result.status === "regenerated") {
        await prisma.profileRegenJob.update({
          where: { id: job.id },
          data: { status: "done", finishedAt: new Date() },
        })
      } else {
        const errorText =
          result.status === "error" ? result.error : `Unexpected result: ${result.status}`
        await prisma.profileRegenJob.update({
          where: { id: job.id },
          data: {
            status: "failed",
            error: errorText,
            attempts: (job.attempts ?? 0) + 1,
            finishedAt: new Date(),
          },
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown drain error"
      await prisma.profileRegenJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          error: message,
          attempts: (job.attempts ?? 0) + 1,
          finishedAt: new Date(),
        },
      })
    }

    return true
  } finally {
    processing = false
  }
}

export function kickRegenDrain(): void {
  void processNextJob().catch(() => {})
}
