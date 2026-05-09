import { WORKER_SPECIALIZATIONS, type CLevelRole, type WorkerSpecialization } from "./types"

interface TemplateDefinition {
  name: string
  displayName: string
  description: string
  roleType: "ceo" | "c-level" | "worker"
  cLevelRole?: CLevelRole
  specialization?: WorkerSpecialization
  defaultSkills: string[]
  defaultTools: string[]
  defaultToolsets: string[]
  isPublic: boolean
}

const CEO_TEMPLATE: TemplateDefinition = {
  name: "CEO Agent",
  displayName: "Chief Executive Officer",
  description: "Strategic leader — bridges partners and C-suite, delegates objectives, reports progress",
  roleType: "ceo",
  defaultSkills: ["strategy", "leadership", "decision-making"],
  defaultTools: ["analytics", "reporting", "planning"],
  defaultToolsets: ["management"],
  isPublic: true,
}

const C_LEVEL_TEMPLATES: Record<CLevelRole, TemplateDefinition> = {
  cto: {
    name: "CTO Agent",
    displayName: "Chief Technology Officer",
    description: "Orchestrates the technology department — strategy, architecture, engineering team",
    roleType: "c-level",
    cLevelRole: "cto",
    defaultSkills: ["kanban-orchestrator", "technology-strategy"],
    defaultTools: ["analytics", "reporting"],
    defaultToolsets: ["management"],
    isPublic: true,
  },
  cfo: {
    name: "CFO Agent",
    displayName: "Chief Financial Officer",
    description: "Orchestrates the finance department — budget, financial analysis, data insights",
    roleType: "c-level",
    cLevelRole: "cfo",
    defaultSkills: ["kanban-orchestrator", "financial-strategy"],
    defaultTools: ["analytics", "reporting"],
    defaultToolsets: ["management"],
    isPublic: true,
  },
  cmo: {
    name: "CMO Agent",
    displayName: "Chief Marketing Officer",
    description: "Orchestrates the marketing department — content, growth, brand strategy",
    roleType: "c-level",
    cLevelRole: "cmo",
    defaultSkills: ["kanban-orchestrator", "marketing-strategy"],
    defaultTools: ["analytics", "reporting"],
    defaultToolsets: ["management"],
    isPublic: true,
  },
  coo: {
    name: "COO Agent",
    displayName: "Chief Operating Officer",
    description: "Orchestrates operations — processes, project management, execution oversight",
    roleType: "c-level",
    cLevelRole: "coo",
    defaultSkills: ["kanban-orchestrator", "operations-strategy"],
    defaultTools: ["analytics", "reporting"],
    defaultToolsets: ["management"],
    isPublic: true,
  },
}

const WORKER_TEMPLATES: Record<WorkerSpecialization, TemplateDefinition> = {
  "backend-engineer": {
    name: "Backend Engineer",
    displayName: "Backend Engineer",
    description: "Implements APIs, services, and business logic",
    roleType: "worker",
    specialization: "backend-engineer",
    defaultSkills: ["kanban-worker", "backend-development"],
    defaultTools: ["git", "github"],
    defaultToolsets: ["development"],
    isPublic: true,
  },
  "frontend-engineer": {
    name: "Frontend Engineer",
    displayName: "Frontend Engineer",
    description: "Implements user interfaces and client-side applications",
    roleType: "worker",
    specialization: "frontend-engineer",
    defaultSkills: ["kanban-worker", "frontend-development", "react-patterns"],
    defaultTools: ["git", "github"],
    defaultToolsets: ["development"],
    isPublic: true,
  },
  "devops-engineer": {
    name: "DevOps Engineer",
    displayName: "DevOps Engineer",
    description: "Manages infrastructure, CI/CD, and deployment pipelines",
    roleType: "worker",
    specialization: "devops-engineer",
    defaultSkills: ["kanban-worker", "infrastructure"],
    defaultTools: ["git", "github", "docker"],
    defaultToolsets: ["development"],
    isPublic: true,
  },
  "qa-engineer": {
    name: "QA Engineer",
    displayName: "QA Engineer",
    description: "Tests software quality, reviews code, validates acceptance criteria",
    roleType: "worker",
    specialization: "qa-engineer",
    defaultSkills: ["kanban-worker", "github-code-review"],
    defaultTools: ["git", "github"],
    defaultToolsets: ["development"],
    isPublic: true,
  },
  "financial-analyst": {
    name: "Financial Analyst",
    displayName: "Financial Analyst",
    description: "Analyzes financial data, creates reports, forecasts budgets",
    roleType: "worker",
    specialization: "financial-analyst",
    defaultSkills: ["kanban-worker"],
    defaultTools: ["analytics"],
    defaultToolsets: ["web"],
    isPublic: true,
  },
  "data-analyst": {
    name: "Data Analyst",
    displayName: "Data Analyst",
    description: "Extracts insights from data, creates dashboards, supports decisions",
    roleType: "worker",
    specialization: "data-analyst",
    defaultSkills: ["kanban-worker", "research-methodology"],
    defaultTools: ["analytics"],
    defaultToolsets: ["web"],
    isPublic: true,
  },
  "content-strategist": {
    name: "Content Strategist",
    displayName: "Content Strategist",
    description: "Creates content strategies, writes copy, manages editorial calendars",
    roleType: "worker",
    specialization: "content-strategist",
    defaultSkills: ["kanban-worker"],
    defaultTools: [],
    defaultToolsets: ["web"],
    isPublic: true,
  },
  "seo-specialist": {
    name: "SEO Specialist",
    displayName: "SEO Specialist",
    description: "Optimizes search rankings, analyzes keywords, monitors performance",
    roleType: "worker",
    specialization: "seo-specialist",
    defaultSkills: ["kanban-worker", "research-methodology"],
    defaultTools: [],
    defaultToolsets: ["web"],
    isPublic: true,
  },
  "social-media-manager": {
    name: "Social Media Manager",
    displayName: "Social Media Manager",
    description: "Manages social channels, creates posts, engages communities",
    roleType: "worker",
    specialization: "social-media-manager",
    defaultSkills: ["kanban-worker"],
    defaultTools: [],
    defaultToolsets: ["web"],
    isPublic: true,
  },
  "project-manager": {
    name: "Project Manager",
    displayName: "Project Manager",
    description: "Coordinates projects, tracks timelines, manages stakeholders",
    roleType: "worker",
    specialization: "project-manager",
    defaultSkills: ["kanban-worker", "kanban-orchestrator"],
    defaultTools: ["analytics", "reporting"],
    defaultToolsets: ["management"],
    isPublic: true,
  },
  "process-analyst": {
    name: "Process Analyst",
    displayName: "Process Analyst",
    description: "Analyzes and optimizes business processes, identifies inefficiencies",
    roleType: "worker",
    specialization: "process-analyst",
    defaultSkills: ["kanban-worker", "research-methodology"],
    defaultTools: ["analytics"],
    defaultToolsets: ["web"],
    isPublic: true,
  },
  general: {
    name: "General Worker",
    displayName: "General Worker",
    description: "Versatile agent for general tasks across departments",
    roleType: "worker",
    specialization: "general",
    defaultSkills: ["kanban-worker"],
    defaultTools: [],
    defaultToolsets: ["development"],
    isPublic: true,
  },
}

export function getAllTemplateDefinitions(): TemplateDefinition[] {
  return [
    CEO_TEMPLATE,
    ...Object.values(C_LEVEL_TEMPLATES),
    ...Object.values(WORKER_TEMPLATES),
  ]
}

export function getTemplateByRole(
  roleType: "ceo",
): TemplateDefinition
export function getTemplateByRole(
  roleType: "c-level",
  cLevelRole: CLevelRole,
): TemplateDefinition
export function getTemplateByRole(
  roleType: "worker",
  specialization: WorkerSpecialization,
): TemplateDefinition
export function getTemplateByRole(
  roleType: "ceo" | "c-level" | "worker",
  subRole?: string,
): TemplateDefinition {
  if (roleType === "ceo") return CEO_TEMPLATE
  if (roleType === "c-level" && subRole) {
    return C_LEVEL_TEMPLATES[subRole as CLevelRole]
  }
  if (roleType === "worker" && subRole) {
    return WORKER_TEMPLATES[subRole as WorkerSpecialization]
  }
  return CEO_TEMPLATE
}

export function getTemplatesForDepartment(
  department: string,
): TemplateDefinition[] {
  const cLevelEntry = Object.entries(C_LEVEL_TEMPLATES).find(
    ([, t]) => t.cLevelRole === department,
  )
  const workers = Object.values(WORKER_TEMPLATES).filter(
    (t) => WORKER_SPECIALIZATIONS[t.specialization!]?.department === department,
  )
  return cLevelEntry ? [cLevelEntry[1], ...workers] : workers
}

export {
  CEO_TEMPLATE,
  C_LEVEL_TEMPLATES,
  WORKER_TEMPLATES,
  type TemplateDefinition,
}