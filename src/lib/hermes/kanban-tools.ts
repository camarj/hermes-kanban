import { prisma } from "@/lib/db/prisma"
import { kanbanSync } from "./kanban-sync"
import { createAgent, listOrgAgents } from "@/lib/agents/create-agent"
import { type CreateAgentInput } from "@/lib/agents/create-agent"
import { C_LEVEL_ROLES, WORKER_SPECIALIZATIONS, type CLevelRole, type WorkerSpecialization } from "@/lib/agents/types"

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: "object"
    properties: Record<string, { type: string; description: string; enum?: string[] }>
    required: string[]
  }
}

export const kanbanTools: ToolDefinition[] = [
  {
    name: "kanban_create",
    description: "Create a new task in the Kanban board. ALWAYS use agents_list first to verify the assignee exists and is active. If no suitable agent exists, use agent_hire or agent_request.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short, actionable title (verb + object)" },
        body: { type: "string", description: "Detailed description with context, objective, and acceptance criteria" },
        assignee: { type: "string", description: "Profile name of the agent to assign (e.g., 'clevel-inteliside-cfo'). ALWAYS verify with agents_list first." },
        priority: { type: "integer", description: "Priority level: 0=normal, 1=high, 2=critical" },
      },
      required: ["title"],
    },
  },
  {
    name: "kanban_show",
    description: "List all tasks in the Kanban board to show current status. Use this when the user asks about task status, progress, or what's in the board.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by status: triage, todo, ready, running, blocked, done, archived", enum: ["triage", "todo", "ready", "running", "blocked", "done", "archived"] },
      },
      required: [],
    },
  },
  {
    name: "kanban_comment",
    description: "Add a comment to an existing task. Use this to add context, updates, or notes to a task.",
    parameters: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "ID of the task to comment on" },
        body: { type: "string", description: "Comment text" },
      },
      required: ["task_id", "body"],
    },
  },
  {
    name: "kanban_complete",
    description: "Mark a task as completed. Use this when the user confirms a task is done or when you want to close a task.",
    parameters: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "ID of the task to complete" },
        summary: { type: "string", description: "Summary of what was accomplished" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "kanban_block",
    description: "Block a task with a reason. Use this when a task cannot proceed and needs escalation or human approval.",
    parameters: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "ID of the task to block" },
        reason: { type: "string", description: "Reason for blocking the task" },
      },
      required: ["task_id", "reason"],
    },
  },
  {
    name: "agents_list",
    description: "List all active agents in the organization. ALWAYS use this before assigning tasks to verify the agent exists. Also shows available C-Level roles and worker specializations that can be hired.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "agent_hire",
    description: "Hire a new agent directly. Use this for C-Level roles (CTO, CFO, CMO, COO) when the organization needs them. For specialized workers, consider using agent_request instead to get partner approval.",
    parameters: {
      type: "object",
      properties: {
        role_type: { type: "string", description: "Type of agent: 'c-level' or 'worker'", enum: ["c-level", "worker"] },
        c_level_role: { type: "string", description: "C-Level role (required if role_type='c-level'): cto, cfo, cmo, or coo", enum: ["cto", "cfo", "cmo", "coo"] },
        specialization: { type: "string", description: "Worker specialization (required if role_type='worker')" },
        name: { type: "string", description: "Display name for the agent (e.g., 'CTO Agent', 'Backend Engineer')" },
        description: { type: "string", description: "Optional description of the agent's role" },
      },
      required: ["role_type", "name"],
    },
  },
  {
    name: "agent_request",
    description: "Request partner approval to hire a new agent. Use this for specialized workers or when you're unsure if the partner wants to hire. Creates a blocked task in the Kanban board that the partner must approve.",
    parameters: {
      type: "object",
      properties: {
        role_type: { type: "string", description: "Type of agent requested: 'c-level' or 'worker'", enum: ["c-level", "worker"] },
        c_level_role: { type: "string", description: "C-Level role (if role_type='c-level')", enum: ["cto", "cfo", "cmo", "coo"] },
        specialization: { type: "string", description: "Worker specialization (if role_type='worker')" },
        reason: { type: "string", description: "Why this agent is needed and what tasks they will handle" },
        name_suggestion: { type: "string", description: "Suggested name for the agent" },
      },
      required: ["role_type", "reason"],
    },
  },
]

export async function executeKanbanTool(
  name: string,
  args: Record<string, unknown>,
  orgId: string
): Promise<{ success: boolean; result: string }> {
  try {
    switch (name) {
      case "kanban_create": return await executeKanbanCreate(args, orgId)
      case "kanban_show": return await executeKanbanShow(args, orgId)
      case "kanban_comment": return await executeKanbanComment(args, orgId)
      case "kanban_complete": return await executeKanbanComplete(args, orgId)
      case "kanban_block": return await executeKanbanBlock(args, orgId)
      case "agents_list": return await executeAgentsList(orgId)
      case "agent_hire": return await executeAgentHire(args, orgId)
      case "agent_request": return await executeAgentRequest(args, orgId)
      default: return { success: false, result: `Unknown tool: ${name}` }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, result: `Error executing ${name}: ${message}` }
  }
}

async function executeKanbanCreate(args: Record<string, unknown>, orgId: string) {
  const title = String(args.title || "")
  const body = String(args.body || "")
  const assignee = String(args.assignee || "unassigned")
  const priority = Number(args.priority ?? 0)

  if (!title) return { success: false, result: "Title is required" }

  let defaultProject = await prisma.project.findFirst({ where: { orgId }, orderBy: { createdAt: "asc" } })
  if (!defaultProject) {
    defaultProject = await prisma.project.create({ data: { orgId, name: "Default" } })
  }

  const task = await prisma.task.create({
    data: {
      title,
      body: body || null,
      assignee: assignee !== "unassigned" ? assignee : null,
      priority,
      status: "triage",
      projectId: defaultProject.id,
      orgId,
      hermesMetadata: {},
    },
  })

  try { await kanbanSync.pushToHermes(task.id) } catch { /* best effort */ }

  return { success: true, result: `Task created successfully. ID: ${task.id}, Title: "${title}", Status: triage, Assignee: ${assignee}` }
}

async function executeKanbanShow(args: Record<string, unknown>, orgId: string) {
  const statusFilter = args.status as string | undefined
  const where: { orgId: string; status?: string } = { orgId }
  if (statusFilter) where.status = statusFilter

  const tasks = await prisma.task.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 })
  if (tasks.length === 0) return { success: true, result: "No tasks found in the Kanban board." }

  const lines = tasks.map((t) => {
    const assignee = t.assignee || "unassigned"
    return `- [${t.status.toUpperCase()}] ${t.title} (ID: ${t.id}, Assignee: ${assignee}, Priority: ${t.priority})`
  })

  return { success: true, result: `Kanban Board (${tasks.length} tasks):\n\n${lines.join("\n")}` }
}

async function executeKanbanComment(args: Record<string, unknown>, orgId: string) {
  const taskId = String(args.task_id || "")
  const commentBody = String(args.body || "")
  if (!taskId || !commentBody) return { success: false, result: "task_id and body are required" }

  const task = await prisma.task.findFirst({ where: { id: taskId, orgId } })
  if (!task) return { success: false, result: `Task ${taskId} not found` }

  const updatedBody = task.body ? `${task.body}\n\n--- Comment ---\n${commentBody}` : commentBody
  await prisma.task.update({ where: { id: taskId }, data: { body: updatedBody } })

  return { success: true, result: `Comment added to task ${taskId}` }
}

async function executeKanbanComplete(args: Record<string, unknown>, orgId: string) {
  const taskId = String(args.task_id || "")
  const summary = String(args.summary || "")
  if (!taskId) return { success: false, result: "task_id is required" }

  const task = await prisma.task.findFirst({ where: { id: taskId, orgId } })
  if (!task) return { success: false, result: `Task ${taskId} not found` }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "done",
      body: summary ? `${task.body || ""}\n\n--- Completed ---\n${summary}` : task.body,
    },
  })

  if (task.hermesTaskId) {
    try { await kanbanSync.updateTaskStatus(task.hermesTaskId, "complete", summary) } catch { /* best effort */ }
  }

  return { success: true, result: `Task ${taskId} marked as completed.` }
}

async function executeKanbanBlock(args: Record<string, unknown>, orgId: string) {
  const taskId = String(args.task_id || "")
  const reason = String(args.reason || "")
  if (!taskId || !reason) return { success: false, result: "task_id and reason are required" }

  const task = await prisma.task.findFirst({ where: { id: taskId, orgId } })
  if (!task) return { success: false, result: `Task ${taskId} not found` }

  await prisma.task.update({
    where: { id: taskId },
    data: { status: "blocked", blockedReason: reason },
  })

  if (task.hermesTaskId) {
    try { await kanbanSync.updateTaskStatus(task.hermesTaskId, "block", reason) } catch { /* best effort */ }
  }

  return { success: true, result: `Task ${taskId} blocked: ${reason}` }
}

async function executeAgentsList(orgId: string) {
  const data = await listOrgAgents(orgId)

  const lines = data.agents.map((a) => {
    const status = a.role === "ceo" ? "🟢 Active (CEO)" : `🟢 Active`
    return `- ${a.name} | ${a.roleDetail} | @${a.profile} | ${status}`
  })

  const cRolesAvailable = data.availableCRoles.length > 0
    ? `\n\nAvailable C-Level roles not yet hired: ${data.availableCRoles.join(", ")}`
    : "\n\nAll C-Level roles are filled."

  const workersAvailable = `\nAvailable worker specializations: ${data.availableWorkers.join(", ")}`

  return {
    success: true,
    result: `Agents in organization (${data.agents.length} active):\n\n${lines.join("\n")}${cRolesAvailable}${workersAvailable}`,
  }
}

async function executeAgentHire(args: Record<string, unknown>, orgId: string) {
  const roleType = String(args.role_type || "worker") as "ceo" | "c-level" | "worker"
  const name = String(args.name || "")
  const description = String(args.description || "")
  const cLevelRole = args.c_level_role as CLevelRole | undefined
  const specialization = args.specialization as WorkerSpecialization | undefined

  if (!name || name.trim().length < 2) {
    return { success: false, result: "Name must be at least 2 characters." }
  }

  // Validation: can't hire CEO (already exists)
  if (roleType === "ceo") {
    const existingCeo = await prisma.agent.findFirst({ where: { orgId, hermesProfile: { startsWith: "ceo-" } } })
    if (existingCeo) {
      return { success: false, result: "This organization already has a CEO agent. Cannot hire another." }
    }
  }

  // Validation: can't hire duplicate C-Level role
  if (roleType === "c-level" && cLevelRole) {
    const rolePrefix = `clevel-${cLevelRole}`
    const existing = await prisma.agent.findFirst({
      where: { orgId, hermesProfile: { contains: rolePrefix } },
    })
    if (existing) {
      const roleLabel = C_LEVEL_ROLES[cLevelRole]?.label || cLevelRole.toUpperCase()
      return { success: false, result: `A ${roleLabel} agent already exists in this organization (@${existing.hermesProfile}).` }
    }
  }

  const input: CreateAgentInput = {
    orgId,
    name: name.trim(),
    description: description.trim() || undefined,
    roleType,
    cLevelRole,
    specialization,
  }

  const result = await createAgent(input)

  if (!result.agent.id) {
    return { success: false, result: result.hermesProfileError || "Failed to create agent" }
  }

  const roleLabel = roleType === "c-level"
    ? C_LEVEL_ROLES[cLevelRole!]?.label || cLevelRole!
    : specialization
      ? WORKER_SPECIALIZATIONS[specialization!]?.label || specialization
      : "Worker"

  return {
    success: true,
    result: `${roleLabel} agent "${result.agent.name}" hired successfully.\n\nProfile: @${result.agent.hermesProfile}\nHermes profile: ${result.hermesProfileCreated ? "✅ Created" : `⚠️ ${result.hermesProfileError || "Not created"}`}\n\nYou can now assign tasks to this agent using kanban_create with assignee="${result.agent.hermesProfile}".`,
  }
}

async function executeAgentRequest(args: Record<string, unknown>, orgId: string) {
  const roleType = String(args.role_type || "worker") as "c-level" | "worker"
  const cLevelRole = args.c_level_role as string | undefined
  const specialization = args.specialization as string | undefined
  const reason = String(args.reason || "")
  const nameSuggestion = String(args.name_suggestion || "")

  if (!reason) return { success: false, result: "reason is required" }

  const roleLabel = roleType === "c-level"
    ? C_LEVEL_ROLES[cLevelRole as keyof typeof C_LEVEL_ROLES]?.label || cLevelRole || "C-Level"
    : specialization
      ? WORKER_SPECIALIZATIONS[specialization as keyof typeof WORKER_SPECIALIZATIONS]?.label || specialization
      : "Worker"

  let defaultProject = await prisma.project.findFirst({ where: { orgId }, orderBy: { createdAt: "asc" } })
  if (!defaultProject) {
    defaultProject = await prisma.project.create({ data: { orgId, name: "Default" } })
  }

  const title = `Hiring Request: ${roleLabel} Agent`
  const body = [
    `**Type:** Agent Hiring Request`,
    `**Role:** ${roleLabel}`,
    roleType === "c-level" && cLevelRole ? `**C-Level Role:** ${C_LEVEL_ROLES[cLevelRole as keyof typeof C_LEVEL_ROLES]?.label || cLevelRole}` : null,
    specialization ? `**Specialization:** ${WORKER_SPECIALIZATIONS[specialization as keyof typeof WORKER_SPECIALIZATIONS]?.label || specialization}` : null,
    nameSuggestion ? `**Suggested Name:** ${nameSuggestion}` : null,
    ``,
    `**Reason:** ${reason}`,
    ``,
    `---`,
    `To approve: click "Approve Hiring" on this task.`,
    `To reject: change task status to "archived".`,
  ].filter(Boolean).join("\n")

  const task = await prisma.task.create({
    data: {
      title,
      body,
      status: "blocked",
      blockedReason: `Hiring request pending partner approval: ${roleLabel} agent`,
      priority: 1,
      projectId: defaultProject.id,
      orgId,
      hermesMetadata: {
        type: "agent_request",
        role_type: roleType,
        c_level_role: cLevelRole || null,
        specialization: specialization || null,
        name_suggestion: nameSuggestion || null,
      },
    },
  })

  try { await kanbanSync.pushToHermes(task.id) } catch { /* best effort */ }

  return {
    success: true,
    result: `Hiring request created for ${roleLabel} agent.\n\nTask ID: ${task.id}\nStatus: BLOCKED (awaiting partner approval)\n\nThe task has been added to the Kanban board. The partner can approve or reject it from the board.`,
  }
}