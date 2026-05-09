import { hermesClient } from "./client"
import { profileManager } from "./profiles"
import { type CreateProfileInput, type ProfileConfig } from "./profiles"
import { kanbanSync } from "./kanban-sync"
import { C_LEVEL_ROLES, WORKER_SPECIALIZATIONS, type CLevelRole, type WorkerSpecialization } from "@/lib/agents/types"

export { hermesClient, profileManager, kanbanSync }
export { HermesClient, HermesAPIError } from "./client"
export { ProfileManager } from "./profiles"
export { KanbanSync } from "./kanban-sync"
export { kanbanTools, executeKanbanTool } from "./kanban-tools"
export type { HermesConfig, ChatMessage, ChatCompletionRequest, ChatCompletionResponse, RunRequest, RunResponse } from "./client"
export type { ProfileConfig, McpServerConfig, CreateProfileInput } from "./profiles"
export type { KanbanTaskStatus, KanbanTask, KanbanSyncOptions } from "./kanban-sync"
export type { ToolDefinition } from "./kanban-tools"

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
  const prefix = roleType === "ceo" ? "ceo" : roleType === "c-level" ? "clevel" : "worker"
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

export function buildCLevelProfile(
  orgSlug: string,
  agentName: string,
  cLevelRole: CLevelRole,
  orgName: string,
  objective?: string,
  agents?: Array<{ name: string; role: string; profile: string }>,
  reportsTo?: string,
): CreateProfileInput {
  const profileName = buildProfileName(orgSlug, agentName, "c-level")
  const config = profileManager.generateCLevelConfig()
  const soulContent = profileManager.generateSOULContent("c-level", {
    name: agentName,
    orgName,
    objective,
    agents,
  }, { cLevelRole, reportsTo })

  return { profileName, soulContent, config }
}

export function buildWorkerProfile(
  orgSlug: string,
  agentName: string,
  specialization: WorkerSpecialization,
  orgName: string,
  objective?: string,
  mcpServers?: { mcpServers: ProfileConfig["mcp_servers"] },
  reportsTo?: string,
): CreateProfileInput {
  const profileName = buildProfileName(orgSlug, agentName, "worker")
  const config = profileManager.generateWorkerConfig(specialization, mcpServers)
  const soulContent = profileManager.generateSOULContent("worker", {
    name: agentName,
    orgName,
    objective,
  }, { specialization, reportsTo })

  return { profileName, soulContent, config }
}

export function getCLevelRoleLabel(role: string): string {
  return C_LEVEL_ROLES[role as CLevelRole]?.label || role.toUpperCase()
}

export function getWorkerSpecializationLabel(spec: string): string {
  return WORKER_SPECIALIZATIONS[spec as WorkerSpecialization]?.label || spec
}