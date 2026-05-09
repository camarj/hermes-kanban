export interface Agent {
  id: string
  name: string
  description: string | null
  hermesProfile: string
  hermesProfileSynced?: boolean
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
  roleType: "ceo" | "c-level" | "worker"
  soulContent: string | null
  defaultSkills: string[]
  defaultTools: string[]
  defaultToolsets: string[]
  isPublic: boolean
}

export const ROLE_TYPES = {
  ceo: { label: "CEO", color: "#2D9AA5", description: "Strategic leader, bridges partners and C-suite" },
  "c-level": { label: "C-Level", color: "#3B82F6", description: "Department orchestrator" },
  worker: { label: "Worker", color: "#6B6560", description: "Executes specific tasks" },
} as const

export const C_LEVEL_ROLES = {
  cto: { label: "CTO", department: "technology", description: "Chief Technology Officer — technology, product, engineering" },
  cfo: { label: "CFO", department: "finance", description: "Chief Financial Officer — finance, budget, data" },
  cmo: { label: "CMO", department: "marketing", description: "Chief Marketing Officer — marketing, content, growth" },
  coo: { label: "COO", department: "operations", description: "Chief Operating Officer — operations, processes, projects" },
} as const

export type CLevelRole = keyof typeof C_LEVEL_ROLES

export const WORKER_SPECIALIZATIONS = {
  "backend-engineer": { label: "Backend Engineer", department: "technology", reportsTo: "cto" },
  "frontend-engineer": { label: "Frontend Engineer", department: "technology", reportsTo: "cto" },
  "devops-engineer": { label: "DevOps Engineer", department: "technology", reportsTo: "cto" },
  "qa-engineer": { label: "QA Engineer", department: "technology", reportsTo: "cto" },
  "financial-analyst": { label: "Financial Analyst", department: "finance", reportsTo: "cfo" },
  "data-analyst": { label: "Data Analyst", department: "finance", reportsTo: "cfo" },
  "content-strategist": { label: "Content Strategist", department: "marketing", reportsTo: "cmo" },
  "seo-specialist": { label: "SEO Specialist", department: "marketing", reportsTo: "cmo" },
  "social-media-manager": { label: "Social Media Manager", department: "marketing", reportsTo: "cmo" },
  "project-manager": { label: "Project Manager", department: "operations", reportsTo: "coo" },
  "process-analyst": { label: "Process Analyst", department: "operations", reportsTo: "coo" },
  "general": { label: "General Worker", department: null, reportsTo: null },
} as const

export type RoleType = keyof typeof ROLE_TYPES
export type WorkerSpecialization = keyof typeof WORKER_SPECIALIZATIONS

export const DEPARTMENTS = {
  technology: { label: "Technology", cLevelRole: "cto" as CLevelRole },
  finance: { label: "Finance", cLevelRole: "cfo" as CLevelRole },
  marketing: { label: "Marketing", cLevelRole: "cmo" as CLevelRole },
  operations: { label: "Operations", cLevelRole: "coo" as CLevelRole },
} as const

export type Department = keyof typeof DEPARTMENTS