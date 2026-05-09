import { describe, it, expect, beforeEach, vi } from "vitest"

const mockProjectFindFirst = vi.fn()
const mockProjectCreate = vi.fn()
const mockTaskCreate = vi.fn()
const mockTaskFindFirst = vi.fn()
const mockTaskUpdate = vi.fn()
const mockAgentFindMany = vi.fn()

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    project: {
      findFirst: (args: unknown) => mockProjectFindFirst(args),
      create: (args: unknown) => mockProjectCreate(args),
    },
    task: {
      create: (args: unknown) => mockTaskCreate(args),
      findFirst: (args: unknown) => mockTaskFindFirst(args),
      update: (args: unknown) => mockTaskUpdate(args),
    },
    agent: {
      findMany: (args: unknown) => mockAgentFindMany(args),
    },
  },
}))

const mockPushToHermes = vi.fn()
const mockUpdateTaskStatus = vi.fn()
vi.mock("@/lib/hermes/kanban-sync", () => ({
  kanbanSync: {
    pushToHermes: (id: string) => mockPushToHermes(id),
    updateTaskStatus: (id: string, status: string, summary?: string) =>
      mockUpdateTaskStatus(id, status, summary),
  },
}))

vi.mock("@/lib/agents/create-agent", () => ({
  createAgent: vi.fn(),
  listOrgAgents: vi.fn(async () => ({
    agents: [
      { name: "CEO Agent", role: "ceo", roleDetail: "CEO — Strategic leader", profile: "ceo-acme" },
      { name: "CTO Agent", role: "c-level", roleDetail: "CTO — Technology department", profile: "clevel-acme-cto-agent" },
      { name: "Backend Engineer", role: "worker", roleDetail: "Backend Engineer — technology (reports to CTO)", profile: "worker-acme-backend-engineer" },
    ],
    availableCRoles: [],
    availableWorkers: [],
  })),
}))

import { executeKanbanTool } from "@/lib/hermes/kanban-tools"

const ORG_ID = "org-acme"

describe("Delegation flow CEO → CTO → Backend Engineer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProjectFindFirst.mockResolvedValue({ id: "proj-1", orgId: ORG_ID, name: "Default" })
    mockPushToHermes.mockResolvedValue(undefined)
    mockUpdateTaskStatus.mockResolvedValue(undefined)
  })

  it("agents_list returns the full hierarchy", async () => {
    const r = await executeKanbanTool("agents_list", {}, ORG_ID)
    expect(r.success).toBe(true)
    expect(r.result).toMatch(/ceo-acme/)
    expect(r.result).toMatch(/clevel-acme-cto-agent/)
    expect(r.result).toMatch(/worker-acme-backend-engineer/)
  })

  it("CEO creates a delegation task assigned to CTO", async () => {
    mockTaskCreate.mockResolvedValue({
      id: "task-1",
      title: "Implement auth API",
      assignee: "clevel-acme-cto-agent",
      status: "triage",
      orgId: ORG_ID,
    })

    const r = await executeKanbanTool(
      "kanban_create",
      {
        title: "Implement auth API",
        body: "Design and ship JWT-based auth flow",
        assignee: "clevel-acme-cto-agent",
        priority: 1,
      },
      ORG_ID
    )

    expect(r.success).toBe(true)
    expect(mockTaskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Implement auth API",
          assignee: "clevel-acme-cto-agent",
          priority: 1,
          status: "triage",
          orgId: ORG_ID,
          projectId: "proj-1",
        }),
      })
    )
    expect(mockPushToHermes).toHaveBeenCalledWith("task-1")
  })

  it("CTO creates a sub-task assigned to Backend Engineer", async () => {
    mockTaskCreate.mockResolvedValue({
      id: "task-2",
      title: "Build /api/auth/login endpoint",
      assignee: "worker-acme-backend-engineer",
      status: "triage",
      orgId: ORG_ID,
    })

    const r = await executeKanbanTool(
      "kanban_create",
      {
        title: "Build /api/auth/login endpoint",
        body: "POST /api/auth/login with email+password, returns JWT",
        assignee: "worker-acme-backend-engineer",
      },
      ORG_ID
    )

    expect(r.success).toBe(true)
    expect(mockTaskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Build /api/auth/login endpoint",
          assignee: "worker-acme-backend-engineer",
        }),
      })
    )
  })

  it("Worker completes the task and triggers Hermes status sync", async () => {
    mockTaskFindFirst.mockResolvedValue({
      id: "task-2",
      orgId: ORG_ID,
      hermesTaskId: "hermes-2",
      body: "POST /api/auth/login...",
    })
    mockTaskUpdate.mockResolvedValue({ id: "task-2", status: "done" })

    const r = await executeKanbanTool(
      "kanban_complete",
      { task_id: "task-2", summary: "Endpoint shipped, tests passing" },
      ORG_ID
    )

    expect(r.success).toBe(true)
    expect(mockTaskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-2" },
        data: expect.objectContaining({ status: "done" }),
      })
    )
    expect(mockUpdateTaskStatus).toHaveBeenCalledWith(
      "hermes-2",
      "complete",
      "Endpoint shipped, tests passing"
    )
  })

  it("returns error when assignee tries to complete a task that does not belong to the org", async () => {
    mockTaskFindFirst.mockResolvedValue(null)

    const r = await executeKanbanTool(
      "kanban_complete",
      { task_id: "task-foreign", summary: "" },
      ORG_ID
    )

    expect(r.success).toBe(false)
    expect(r.result).toMatch(/not found/i)
    expect(mockTaskUpdate).not.toHaveBeenCalled()
  })

  it("creates default project on first kanban_create when org has none", async () => {
    mockProjectFindFirst.mockResolvedValue(null)
    mockProjectCreate.mockResolvedValue({ id: "proj-new", orgId: ORG_ID, name: "Default" })
    mockTaskCreate.mockResolvedValue({
      id: "task-3",
      title: "Bootstrap project",
      assignee: null,
      status: "triage",
      orgId: ORG_ID,
    })

    const r = await executeKanbanTool(
      "kanban_create",
      { title: "Bootstrap project" },
      ORG_ID
    )

    expect(r.success).toBe(true)
    expect(mockProjectCreate).toHaveBeenCalled()
    expect(mockTaskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ projectId: "proj-new" }),
      })
    )
  })

  it("end-to-end chain: CEO → task to CTO; CTO → task to Worker; Worker → done", async () => {
    // 1. CEO creates task for CTO
    mockTaskCreate.mockResolvedValueOnce({
      id: "task-A",
      title: "Ship auth feature",
      assignee: "clevel-acme-cto-agent",
      status: "triage",
      orgId: ORG_ID,
    })
    const ceoCall = await executeKanbanTool(
      "kanban_create",
      { title: "Ship auth feature", assignee: "clevel-acme-cto-agent" },
      ORG_ID
    )
    expect(ceoCall.success).toBe(true)

    // 2. CTO creates sub-task for Backend Engineer
    mockTaskCreate.mockResolvedValueOnce({
      id: "task-B",
      title: "Build login endpoint",
      assignee: "worker-acme-backend-engineer",
      status: "triage",
      orgId: ORG_ID,
    })
    const ctoCall = await executeKanbanTool(
      "kanban_create",
      { title: "Build login endpoint", assignee: "worker-acme-backend-engineer" },
      ORG_ID
    )
    expect(ctoCall.success).toBe(true)

    // 3. Worker completes the sub-task
    mockTaskFindFirst.mockResolvedValue({
      id: "task-B",
      orgId: ORG_ID,
      hermesTaskId: null,
      body: null,
    })
    mockTaskUpdate.mockResolvedValueOnce({ id: "task-B", status: "done" })

    const workerCall = await executeKanbanTool(
      "kanban_complete",
      { task_id: "task-B", summary: "Login endpoint shipped" },
      ORG_ID
    )

    expect(workerCall.success).toBe(true)
    expect(mockTaskCreate).toHaveBeenCalledTimes(2)
    expect(mockTaskUpdate).toHaveBeenCalledTimes(1)
  })
})
