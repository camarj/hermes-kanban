import { prisma } from "@/lib/db/prisma"
import { kickRegenDrain } from "@/lib/hermes/regen-drain"

export interface PropagateResult {
  affectedAgents: number
  dedupedJobs: number
}

export async function propagateMcpUpdate(
  orgId: string,
  serverId: string,
): Promise<PropagateResult> {
  const agents = await prisma.agent.findMany({
    where: { orgId, mcpServerIds: { has: serverId }, isActive: true },
    select: { id: true },
  })

  let dedupedJobs = 0
  for (const a of agents) {
    try {
      await prisma.profileRegenJob.create({
        data: {
          agentId: a.id,
          reason: `mcp-edit:${serverId}`,
          status: "pending",
        },
      })
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
        dedupedJobs += 1
        continue
      }
      throw err
    }
  }

  if (agents.length > 0) {
    kickRegenDrain()
  }

  return { affectedAgents: agents.length, dedupedJobs }
}
