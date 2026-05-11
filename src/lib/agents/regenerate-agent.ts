import { prisma } from "@/lib/db/prisma"
import {
  profileManager,
  hermesClient,
  buildCEOProfile,
  buildCLevelProfile,
  buildWorkerProfile,
  type McpServerConfig,
  type SkillBundle,
  type CreateProfileInput,
} from "@/lib/hermes"
import type { CLevelRole, WorkerSpecialization } from "@/lib/agents/types"

export type RegenerateAgentResult =
  | { status: "regenerated"; profileName: string; method: "cli" | "filesystem" }
  | { status: "deferred"; jobId: string; reason: string }
  | { status: "error"; error: string }

export interface RegenerateOptions {
  reason: string
  forceImmediate?: boolean
}

export async function regenerateAgentProfile(
  agentId: string,
  options: RegenerateOptions,
): Promise<RegenerateAgentResult> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { template: { select: { id: true, name: true, roleType: true } } },
  })

  if (!agent) {
    return { status: "error", error: `Agent ${agentId} not found` }
  }

  const org = await prisma.organization.findUnique({
    where: { id: agent.orgId },
    select: { id: true, name: true, slug: true, objective: true },
  })

  if (!org) {
    return { status: "error", error: `Organization for agent ${agentId} not found` }
  }

  const roleType = (agent.template?.roleType ?? "worker") as "ceo" | "c-level" | "worker"

  if (roleType === "c-level" && !agent.cLevelRole) {
    return {
      status: "error",
      error: `Agent ${agentId} is c-level but has no cLevelRole stored; reseed via create flow.`,
    }
  }

  if (!options.forceImmediate) {
    const busy = await hermesClient.isProfileBusy(agent.hermesProfile)
    if (busy) {
      const job = await prisma.profileRegenJob.create({
        data: {
          agentId: agent.id,
          reason: options.reason,
          status: "deferred",
        },
      })
      return { status: "deferred", jobId: job.id, reason: options.reason }
    }
  }

  const skillRows =
    agent.skills.length > 0
      ? await prisma.skill.findMany({
          where: {
            name: { in: agent.skills },
            OR: [{ orgId: agent.orgId }, { isPublic: true }],
          },
          select: { name: true, files: true },
        })
      : []

  const skillBundles: SkillBundle[] = skillRows.map((row) => {
    const files = Array.isArray(row.files)
      ? (row.files as Array<{ path: string; content: string }>)
      : []
    return { name: row.name, files }
  })

  const mcpRows =
    agent.mcpServerIds.length > 0
      ? await prisma.mcpServer.findMany({
          where: { id: { in: agent.mcpServerIds }, orgId: agent.orgId },
        })
      : []

  const mcpConfigs: McpServerConfig[] = mcpRows.map((m) => ({
    name: m.name,
    transport: m.transport as "stdio" | "http",
    command: m.command ?? undefined,
    url: m.url ?? undefined,
    env: (m.envVars as Record<string, string> | null) ?? undefined,
    tools_filter: m.toolsFilter.length ? m.toolsFilter : undefined,
  }))

  const orgAgents = await prisma.agent.findMany({
    where: { orgId: agent.orgId, isActive: true },
    select: { name: true, hermesProfile: true, template: { select: { roleType: true } } },
  })
  const agentsList = orgAgents.map((a) => ({
    name: a.name,
    role: a.template?.roleType || "worker",
    profile: a.hermesProfile,
  }))
  const ceoAgent = orgAgents.find((a) => a.template?.roleType === "ceo")
  const ceoProfile = ceoAgent?.hermesProfile

  let profileInput: CreateProfileInput

  if (roleType === "ceo") {
    profileInput = buildCEOProfile(org.slug, org.name, org.objective || undefined, agentsList)
  } else if (roleType === "c-level") {
    profileInput = buildCLevelProfile(
      org.slug,
      agent.name,
      agent.cLevelRole as CLevelRole,
      org.name,
      org.objective || undefined,
      agentsList,
      ceoProfile,
    )
  } else {
    const spec = (agent.specialization as WorkerSpecialization | null) ?? "general"
    profileInput = buildWorkerProfile(
      org.slug,
      agent.name,
      spec,
      org.name,
      org.objective || undefined,
      mcpConfigs.length ? { mcpServers: mcpConfigs } : undefined,
      ceoProfile,
    )
  }

  profileInput.profileName = agent.hermesProfile
  if (agent.soulContent) {
    profileInput.soulContent = agent.soulContent
  }
  profileInput.skillBundles = skillBundles
  profileInput.config = {
    ...profileInput.config,
    skills: agent.skills.length ? agent.skills : profileInput.config.skills,
  }

  try {
    await profileManager.deleteProfile(agent.hermesProfile)
    const result = await profileManager.createProfile(profileInput)

    await prisma.agent.update({
      where: { id: agent.id },
      data: { profileSyncedAt: new Date() },
    })

    return {
      status: "regenerated",
      profileName: agent.hermesProfile,
      method: result.method,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown profile regeneration error"
    return { status: "error", error: message }
  }
}
