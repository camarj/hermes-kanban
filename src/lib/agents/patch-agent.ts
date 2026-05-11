import { prisma } from "@/lib/db/prisma"
import { regenerateAgentProfile, type RegenerateAgentResult } from "@/lib/agents/regenerate-agent"

const FORBIDDEN_FIELDS = [
  "templateId",
  "roleType",
  "cLevelRole",
  "specialization",
  "hermesProfile",
  "orgId",
  "id",
] as const

const REGEN_FIELDS = [
  "soulContent",
  "skills",
  "mcpServerIds",
  "mcpServers",
  "tools",
  "toolsets",
  "name",
  "description",
] as const

export interface PatchAgentBody {
  name?: string
  description?: string | null
  soulContent?: string | null
  skills?: string[]
  tools?: string[]
  toolsets?: string[]
  mcpServers?: unknown[]
  mcpServerIds?: string[]
  webhooks?: unknown[]
  apiIntegrations?: unknown[]
  isActive?: boolean
  [key: string]: unknown
}

export type PatchAgentResult =
  | {
      status: 200
      agent: {
        id: string
        name: string
        hermesProfile: string
        description: string | null
        isActive: boolean
      }
      regen?: RegenerateAgentResult
    }
  | { status: 400; error: string }
  | { status: 404; error: string }

export async function patchAgent(
  orgId: string,
  agentId: string,
  body: PatchAgentBody,
): Promise<PatchAgentResult> {
  for (const f of FORBIDDEN_FIELDS) {
    if (body[f] !== undefined) {
      return {
        status: 400,
        error: `Cannot change ${f} on an existing agent. Archive and recreate to change role/template.`,
      }
    }
  }

  const existing = await prisma.agent.findFirst({ where: { id: agentId, orgId } })
  if (!existing) {
    return { status: 404, error: "Agent not found" }
  }

  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) updateData.name = body.name.trim()
  if (body.description !== undefined) {
    const d = typeof body.description === "string" ? body.description.trim() : null
    updateData.description = d ? d : null
  }
  if (body.soulContent !== undefined) {
    const s = typeof body.soulContent === "string" ? body.soulContent.trim() : null
    updateData.soulContent = s ? s : null
  }
  if (body.skills !== undefined) updateData.skills = body.skills
  if (body.tools !== undefined) updateData.tools = body.tools
  if (body.toolsets !== undefined) updateData.toolsets = body.toolsets
  if (body.mcpServers !== undefined) updateData.mcpServers = body.mcpServers as object
  if (body.mcpServerIds !== undefined) updateData.mcpServerIds = body.mcpServerIds
  if (body.webhooks !== undefined) updateData.webhooks = body.webhooks as object
  if (body.apiIntegrations !== undefined) updateData.apiIntegrations = body.apiIntegrations as object
  if (body.isActive !== undefined) updateData.isActive = body.isActive

  const updated = await prisma.agent.update({
    where: { id: agentId },
    data: updateData,
    include: {
      template: { select: { id: true, name: true, roleType: true } },
    },
  })

  const needsRegen = REGEN_FIELDS.some((f) => body[f] !== undefined)
  let regen: RegenerateAgentResult | undefined
  if (needsRegen) {
    regen = await regenerateAgentProfile(agentId, { reason: "agent-edit" })
  }

  return {
    status: 200,
    agent: {
      id: updated.id,
      name: updated.name,
      hermesProfile: updated.hermesProfile,
      description: updated.description,
      isActive: updated.isActive,
    },
    regen,
  }
}
