import { prisma } from "@/lib/db/prisma"

export type McpTransport = "stdio" | "http"

export interface McpInput {
  name: string
  transport: McpTransport
  command?: string
  url?: string
  envVars?: Record<string, string>
  toolsFilter?: string[]
}

export type ValidationResult = { ok: true } | { ok: false; error: string }

export function validateMcpInput(input: McpInput): ValidationResult {
  const name = input.name?.trim() ?? ""
  if (name.length < 2) return { ok: false, error: "Name must be at least 2 characters" }

  if (input.transport !== "stdio" && input.transport !== "http") {
    return { ok: false, error: "Transport must be stdio or http" }
  }

  if (input.transport === "stdio") {
    if (!input.command || !input.command.trim()) {
      return { ok: false, error: "Command is required for stdio transport" }
    }
  } else if (input.transport === "http") {
    if (!input.url || !input.url.trim()) {
      return { ok: false, error: "URL is required for http transport" }
    }
  }

  return { ok: true }
}

export async function listMcpServers(orgId: string) {
  return prisma.mcpServer.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  })
}

export async function getMcpServer(orgId: string, serverId: string) {
  return prisma.mcpServer.findFirst({
    where: { id: serverId, orgId },
  })
}

export async function createMcpServer(orgId: string, input: McpInput) {
  const validation = validateMcpInput(input)
  if (!validation.ok) return { ok: false as const, error: validation.error }

  const row = await prisma.mcpServer.create({
    data: {
      orgId,
      name: input.name.trim(),
      transport: input.transport,
      command: input.transport === "stdio" ? input.command!.trim() : null,
      url: input.transport === "http" ? input.url!.trim() : null,
      envVars: input.envVars ?? {},
      toolsFilter: input.toolsFilter ?? [],
    },
  })

  return { ok: true as const, server: row }
}

export async function updateMcpServer(
  orgId: string,
  serverId: string,
  input: Partial<McpInput>
) {
  const existing = await getMcpServer(orgId, serverId)
  if (!existing) return { ok: false as const, error: "Server not found" }

  const merged: McpInput = {
    name: input.name?.trim() ?? existing.name,
    transport: (input.transport ?? existing.transport) as McpTransport,
    command: input.command !== undefined ? input.command : existing.command ?? undefined,
    url: input.url !== undefined ? input.url : existing.url ?? undefined,
    envVars: (input.envVars ?? (existing.envVars as Record<string, string>)) || {},
    toolsFilter: input.toolsFilter ?? existing.toolsFilter,
  }

  const validation = validateMcpInput(merged)
  if (!validation.ok) return { ok: false as const, error: validation.error }

  const row = await prisma.mcpServer.update({
    where: { id: serverId },
    data: {
      name: merged.name,
      transport: merged.transport,
      command: merged.transport === "stdio" ? merged.command!.trim() : null,
      url: merged.transport === "http" ? merged.url!.trim() : null,
      envVars: merged.envVars ?? {},
      toolsFilter: merged.toolsFilter ?? [],
    },
  })

  return { ok: true as const, server: row }
}

export async function deleteMcpServer(orgId: string, serverId: string) {
  const existing = await getMcpServer(orgId, serverId)
  if (!existing) return { ok: false as const, error: "Server not found" }

  await prisma.mcpServer.delete({ where: { id: serverId } })
  return { ok: true as const }
}
