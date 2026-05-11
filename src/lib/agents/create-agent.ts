import { prisma } from "@/lib/db/prisma"
import { profileManager, hermesClient, buildProfileName, buildCEOProfile, buildCLevelProfile, buildWorkerProfile } from "@/lib/hermes"
import { type McpServerConfig } from "@/lib/hermes/profiles"
import { WORKER_SPECIALIZATIONS, type CLevelRole, type WorkerSpecialization } from "@/lib/agents/types"

export interface CreateAgentInput {
  orgId: string
  name: string
  description?: string
  roleType: "ceo" | "c-level" | "worker"
  cLevelRole?: CLevelRole
  specialization?: WorkerSpecialization
  soulContent?: string
  skills?: string[]
  tools?: string[]
  toolsets?: string[]
  templateId?: string
  mcpServers?: unknown[]
  mcpServerIds?: string[]
  isActive?: boolean
}

export interface CreateAgentResult {
  agent: {
    id: string
    name: string
    hermesProfile: string
    description: string | null
    isActive: boolean
    template: { id: string; name: string; roleType: string } | null
  }
  hermesProfileCreated: boolean
  hermesProfileError: string | null
}

async function resyncCEOSoul(orgId: string, orgSlug: string, orgName: string, orgObjective: string | null) {
  try {
    const gatewayAvailable = await hermesClient.health()
    if (!gatewayAvailable) return

    const ceoAgent = await prisma.agent.findFirst({
      where: { orgId, hermesProfile: { startsWith: "ceo-" } },
      include: { template: { select: { roleType: true } } },
    })
    if (!ceoAgent) return

    const allAgents = await prisma.agent.findMany({
      where: { orgId, isActive: true },
      select: { name: true, hermesProfile: true, template: { select: { roleType: true } } },
    })

    const agentsList = allAgents.map((a) => ({
      name: a.name,
      role: a.template?.roleType || "worker",
      profile: a.hermesProfile,
    }))

    const profileInput = buildCEOProfile(orgSlug, orgName, orgObjective || undefined, agentsList)
    await profileManager.createProfile(profileInput)
  } catch (error) {
    console.error("Failed to resync CEO soul:", error)
  }
}

async function resyncCLevelSouls(
  orgId: string,
  orgSlug: string,
  orgName: string,
  orgObjective: string | null,
  department: string,
) {
  try {
    const gatewayAvailable = await hermesClient.health()
    if (!gatewayAvailable) return

    const ceoAgent = await prisma.agent.findFirst({
      where: { orgId, hermesProfile: { startsWith: "ceo-" } },
      select: { hermesProfile: true },
    })
    const ceoProfile = ceoAgent?.hermesProfile

    const cLevelAgents = await prisma.agent.findMany({
      where: { orgId, isActive: true, template: { roleType: "c-level" } },
      select: { id: true, name: true, hermesProfile: true, template: { select: { roleType: true } } },
    })

    for (const agent of cLevelAgents) {
      const cLevelDepts: Record<string, string> = {
        "c-level-cto": "technology",
        "c-level-cfo": "finance",
        "c-level-cmo": "marketing",
        "c-level-coo": "operations",
      }

      let agentDepartment: string | null = null
      if (agent.template?.roleType === "c-level") {
        for (const [prefix, dept] of Object.entries(cLevelDepts)) {
          if (agent.hermesProfile.includes(prefix) || agent.name.toLowerCase().includes(prefix.split("-")[1])) {
            agentDepartment = dept
            break
          }
        }
      }

      if (agentDepartment !== department) continue

      const departmentWorkers = await prisma.agent.findMany({
        where: { orgId, isActive: true, template: { roleType: "worker" } },
        select: { name: true, hermesProfile: true, template: { select: { roleType: true } } },
      })

      const workersForDept = departmentWorkers.filter((w) => {
        const profile = w.hermesProfile.toLowerCase()
        return profile.includes(department) || (department === "technology" && (
          profile.includes("backend") || profile.includes("frontend") ||
          profile.includes("devops") || profile.includes("qa")
        ))
      })

      const agentsList = workersForDept.map((w) => ({
        name: w.name,
        role: w.template?.roleType || "worker",
        profile: w.hermesProfile,
      }))

      const cLevelRoleMap: Record<string, CLevelRole> = { technology: "cto", finance: "cfo", marketing: "cmo", operations: "coo" }
      const cLevelRole = cLevelRoleMap[department] || "cto"

      const profileInput = buildCLevelProfile(orgSlug, agent.name, cLevelRole, orgName, orgObjective || undefined, agentsList, ceoProfile)
      await profileManager.createProfile(profileInput)
    }
  } catch (error) {
    console.error("Failed to resync C-level souls:", error)
  }
}

export async function createAgent(input: CreateAgentInput): Promise<CreateAgentResult> {
  const { orgId, roleType, name, description, soulContent, skills, tools, toolsets, templateId, mcpServers, isActive } = input

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, slug: true, objective: true },
  })

  if (!org) {
    return { agent: { id: "", name: "", hermesProfile: "", description: null, isActive: false, template: null }, hermesProfileCreated: false, hermesProfileError: "Organization not found" }
  }

  if (roleType === "ceo") {
    const existingCeo = await prisma.agent.findFirst({
      where: { orgId, hermesProfile: { startsWith: "ceo-" } },
      include: { template: { select: { id: true, name: true, roleType: true } } },
    })
    if (existingCeo) {
      return { agent: { id: existingCeo.id, name: existingCeo.name, hermesProfile: existingCeo.hermesProfile, description: existingCeo.description, isActive: existingCeo.isActive, template: existingCeo.template ? { id: existingCeo.template.id, name: existingCeo.template.name, roleType: existingCeo.template.roleType } : null }, hermesProfileCreated: false, hermesProfileError: "This organization already has a CEO agent" }
    }
  }

  const resolvedProfile = buildProfileName(org.slug, name, roleType)
  const existingAgent = await prisma.agent.findUnique({
    where: { hermesProfile: resolvedProfile },
    include: { template: { select: { id: true, name: true, roleType: true } } },
  })

  if (existingAgent) {
    return { agent: { id: existingAgent.id, name: existingAgent.name, hermesProfile: existingAgent.hermesProfile, description: existingAgent.description, isActive: existingAgent.isActive, template: existingAgent.template ? { id: existingAgent.template.id, name: existingAgent.template.name, roleType: existingAgent.template.roleType } : null }, hermesProfileCreated: false, hermesProfileError: "Hermes profile already exists" }
  }

  if (templateId) {
    const template = await prisma.agentTemplate.findFirst({
      where: { id: templateId, OR: [{ orgId }, { isPublic: true }] },
    })
    if (!template) {
      return { agent: { id: "", name: "", hermesProfile: "", description: null, isActive: false, template: null }, hermesProfileCreated: false, hermesProfileError: "Template not found" }
    }
  }

  const cLevelRole = input.cLevelRole
  const specialization = input.specialization

  const mcpServerIds = Array.isArray(input.mcpServerIds) ? input.mcpServerIds : []

  const agent = await prisma.agent.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      hermesProfile: resolvedProfile,
      soulContent: soulContent?.trim() || null,
      skills: skills || [],
      tools: tools || [],
      toolsets: toolsets || [],
      orgId,
      templateId: templateId || null,
      isActive: isActive ?? true,
      mcpServers: (mcpServers ?? []) as any,
      mcpServerIds,
      cLevelRole: cLevelRole || null,
      specialization: specialization || null,
      webhooks: [],
      apiIntegrations: [],
    },
    include: { template: { select: { id: true, name: true, roleType: true } } },
  })

  let hermesProfileCreated = false
  let hermesProfileError: string | null = null

  const gatewayAvailable = await hermesClient.health()
  if (gatewayAvailable) {
    try {
      const orgAgents = await prisma.agent.findMany({
        where: { orgId, isActive: true },
        select: { name: true, hermesProfile: true, template: { select: { roleType: true } } },
      })
      const agentsList = orgAgents.map((a) => ({ name: a.name, role: a.template?.roleType || "worker", profile: a.hermesProfile }))
      const ceoAgent = orgAgents.find((a) => a.template?.roleType === "ceo")
      const ceoProfile = ceoAgent?.hermesProfile

      let profileInput
      const resolvedRoleType = roleType as "ceo" | "c-level" | "worker"

      if (resolvedRoleType === "ceo") {
        profileInput = buildCEOProfile(org.slug, org.name, org.objective || undefined, agentsList)
      } else if (resolvedRoleType === "c-level" && cLevelRole) {
        profileInput = buildCLevelProfile(org.slug, name, cLevelRole as CLevelRole, org.name, org.objective || undefined, agentsList, ceoProfile)
      } else {
        profileInput = buildWorkerProfile(org.slug, name, (specialization as WorkerSpecialization) || "general", org.name, org.objective || undefined, mcpServers?.length ? { mcpServers: mcpServers as McpServerConfig[] } : undefined, ceoProfile)
      }

      if (input.soulContent) profileInput.soulContent = input.soulContent
      profileInput.profileName = resolvedProfile

      const result = await profileManager.createProfile(profileInput)
      hermesProfileCreated = result.success

      await resyncCEOSoul(orgId, org.slug, org.name, org.objective)

      if (resolvedRoleType === "worker") {
        const specKey = specialization as WorkerSpecialization | undefined
        const specInfo = specKey ? WORKER_SPECIALIZATIONS[specKey] : undefined
        const dept = specInfo ? specInfo.department : null
        const DEPARTMENT_MAP: Record<string, string> = { technology: "technology", finance: "finance", marketing: "marketing", operations: "operations" }
        if (dept && DEPARTMENT_MAP[dept]) {
          await resyncCLevelSouls(orgId, org.slug, org.name, org.objective, DEPARTMENT_MAP[dept])
        }
      }
    } catch (error) {
      hermesProfileError = error instanceof Error ? error.message : "Failed to create Hermes profile"
      console.error("Failed to create Hermes profile:", error)
    }
  } else {
    hermesProfileError = "Hermes Gateway not available. Profile will need to be created manually."
  }

  return {
    agent: {
      id: agent.id,
      name: agent.name,
      hermesProfile: agent.hermesProfile,
      description: agent.description,
      isActive: agent.isActive,
      template: agent.template ? { id: agent.template.id, name: agent.template.name, roleType: agent.template.roleType } : null,
    },
    hermesProfileCreated,
    hermesProfileError,
  }
}

export async function listOrgAgents(orgId: string) {
  const agents = await prisma.agent.findMany({
    where: { orgId, isActive: true },
    include: { template: { select: { roleType: true } } },
  })

  const cLevelRoles: Record<string, { label: string; department: string }> = {
    cto: { label: "CTO", department: "technology" },
    cfo: { label: "CFO", department: "finance" },
    cmo: { label: "CMO", department: "marketing" },
    coo: { label: "COO", department: "operations" },
  }

  const workerSpecs: Record<string, { label: string; department: string; reportsTo: string }> = {
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
  }

  const hiredCRoles = new Set<string>()
  for (const agent of agents) {
    if (agent.template?.roleType === "c-level") {
      for (const [key, info] of Object.entries(cLevelRoles)) {
        if (agent.hermesProfile.toLowerCase().includes(key) || agent.name.toLowerCase().includes(info.label.toLowerCase())) {
          hiredCRoles.add(key)
        }
      }
    }
  }

  const activeAgents = agents.map((a) => {
    const roleType = a.template?.roleType || "worker"
    let roleDetail = ""

    if (roleType === "ceo") {
      roleDetail = "CEO — Strategic leader"
    } else if (roleType === "c-level") {
      for (const [key, info] of Object.entries(cLevelRoles)) {
        if (a.hermesProfile.toLowerCase().includes(key) || a.name.toLowerCase().includes(info.label.toLowerCase())) {
          roleDetail = `${info.label} — ${info.department.charAt(0).toUpperCase() + info.department.slice(1)} department`
          break
        }
      }
      if (!roleDetail) roleDetail = "C-Level"
    } else {
      // Check worker specialization from hermesProfile
      for (const [key, info] of Object.entries(workerSpecs)) {
        if (a.hermesProfile.toLowerCase().includes(key) || a.name.toLowerCase().includes(info.label.toLowerCase())) {
          roleDetail = `${info.label} — ${info.department} (reports to ${info.reportsTo.toUpperCase()})`
          break
        }
      }
      if (!roleDetail) roleDetail = "Worker"
    }

    return { name: a.name, role: roleType, roleDetail, profile: a.hermesProfile }
  })

  const availableCRoles = Object.entries(cLevelRoles)
    .filter(([key]) => !hiredCRoles.has(key))
    .map(([key, info]) => `${info.label} (${info.department})`)

  const availableWorkers = Object.entries(workerSpecs).map(([key, info]) => `${info.label} — ${info.department} (reports to ${info.reportsTo.toUpperCase()})`)

  return { agents: activeAgents, availableCRoles, availableWorkers }
}