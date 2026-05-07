export interface Agent {
  id: string
  name: string
  description: string | null
  hermesProfile: string
  soulContent: string | null
  skills: string[]
  tools: string[]
  toolsets: string[]
  mcpServers: unknown[]
  webhooks: unknown[]
  apiIntegrations: unknown[]
  isActive: boolean
  createdAt: string
  templateId: string | null
  template: {
    id: string
    name: string
    roleType: string
  } | null
}

export interface AgentTemplate {
  id: string
  name: string
  displayName: string | null
  description: string | null
  roleType: "ceo" | "orchestrator" | "worker"
  soulContent: string | null
  defaultSkills: string[]
  defaultTools: string[]
  defaultToolsets: string[]
  isPublic: boolean
}

export const ROLE_TYPES = {
  ceo: { label: "CEO", color: "#2D9AA5", description: "Strategic leader and decision maker" },
  orchestrator: { label: "Orchestrator", color: "#3B82F6", description: "Coordinates multiple agents" },
  worker: { label: "Worker", color: "#6B6560", description: "Executes specific tasks" },
} as const

export type RoleType = keyof typeof ROLE_TYPES