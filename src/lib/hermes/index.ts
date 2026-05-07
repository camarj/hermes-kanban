import { hermesClient } from "./client"
import { profileManager } from "./profiles"
import { type CreateProfileInput } from "./profiles"
import { kanbanSync } from "./kanban-sync"

export { hermesClient, profileManager, kanbanSync }
export { HermesClient, HermesAPIError } from "./client"
export { ProfileManager } from "./profiles"
export { KanbanSync } from "./kanban-sync"
export type { HermesConfig, ChatMessage, ChatCompletionRequest, ChatCompletionResponse, RunRequest, RunResponse } from "./client"
export type { ProfileConfig, McpServerConfig, CreateProfileInput } from "./profiles"
export type { KanbanTaskStatus, KanbanTask, KanbanSyncOptions } from "./kanban-sync"

export async function isHermesAvailable(): Promise<boolean> {
  return hermesClient.health()
}

export async function ensureKanbanInitialized(): Promise<boolean> {
  const running = await hermesClient.health()
  if (!running) return false
  return kanbanSync.initKanban()
}

export function buildProfileName(orgSlug: string, agentName: string, roleType: string): string {
  const sanitizedOrg = orgSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-")
  const sanitizedAgent = agentName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
  const prefix = roleType === "ceo" ? "ceo" : roleType === "orchestrator" ? "orch" : "worker"
  return `${prefix}-${sanitizedOrg}-${sanitizedAgent}`
}

export function buildCEOProfile(
  orgSlug: string,
  orgName: string,
  objective?: string,
  agents?: Array<{ name: string; role: string; profile: string }>,
): CreateProfileInput {
  const profileName = `ceo-${orgSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`
  const config = profileManager.generateCEOConfig()
  const soulContent = profileManager.generateSOULContent("ceo", {
    name: "CEO",
    orgName,
    objective,
    agents,
  })

  return { profileName, soulContent, config }
}

export function buildWorkerProfile(
  orgSlug: string,
  agentName: string,
  specialization: "backend" | "frontend" | "research" | "general",
  orgName: string,
  objective?: string,
  mcpServers?: Parameters<typeof profileManager.generateWorkerConfig>[1],
): CreateProfileInput {
  const profileName = buildProfileName(orgSlug, agentName, "worker")
  const config = profileManager.generateWorkerConfig(specialization, mcpServers)
  const soulContent = profileManager.generateSOULContent("worker", {
    name: agentName,
    orgName,
    objective,
  })

  return { profileName, soulContent, config }
}