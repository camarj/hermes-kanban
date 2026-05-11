import { describe, it, expect, beforeEach, vi } from "vitest"

const mockAgentFindUnique = vi.fn()
const mockAgentUpdate = vi.fn()
const mockSkillFindMany = vi.fn()
const mockMcpFindMany = vi.fn()
const mockOrgFindUnique = vi.fn()
const mockAgentFindMany = vi.fn()
const mockJobCreate = vi.fn()

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    agent: {
      findUnique: (args: unknown) => mockAgentFindUnique(args),
      update: (args: unknown) => mockAgentUpdate(args),
      findMany: (args: unknown) => mockAgentFindMany(args),
    },
    skill: {
      findMany: (args: unknown) => mockSkillFindMany(args),
    },
    mcpServer: {
      findMany: (args: unknown) => mockMcpFindMany(args),
    },
    organization: {
      findUnique: (args: unknown) => mockOrgFindUnique(args),
    },
    profileRegenJob: {
      create: (args: unknown) => mockJobCreate(args),
    },
  },
}))

const mockCreateProfile = vi.fn()
const mockDeleteProfile = vi.fn()
const mockIsProfileBusy = vi.fn()
const mockHealth = vi.fn()

vi.mock("@/lib/hermes", async () => {
  const actual = await vi.importActual<typeof import("@/lib/hermes")>("@/lib/hermes")
  return {
    ...actual,
    profileManager: {
      createProfile: (args: unknown) => mockCreateProfile(args),
      deleteProfile: (name: string) => mockDeleteProfile(name),
    },
    hermesClient: {
      isProfileBusy: (name: string) => mockIsProfileBusy(name),
      health: () => mockHealth(),
    },
  }
})

import { regenerateAgentProfile } from "@/lib/agents/regenerate-agent"

const WORKER_AGENT = {
  id: "agt-1",
  orgId: "org-1",
  hermesProfile: "worker-acme-alpha",
  name: "Alpha",
  description: "Backend",
  soulContent: "You are a backend worker.",
  skills: ["kanban-worker", "backend-development"],
  tools: ["git"],
  toolsets: ["development"],
  mcpServerIds: ["srv-1"],
  mcpServers: [],
  cLevelRole: null,
  specialization: "backend-engineer",
  template: { id: "tpl-1", name: "Backend Engineer", roleType: "worker" },
}

const ORG = { id: "org-1", name: "Acme", slug: "acme", objective: "Build" }

describe("regenerateAgentProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOrgFindUnique.mockResolvedValue(ORG)
    mockAgentFindUnique.mockResolvedValue(WORKER_AGENT)
    mockAgentFindMany.mockResolvedValue([
      { name: "Alpha", hermesProfile: "worker-acme-alpha", template: { roleType: "worker" } },
    ])
    mockSkillFindMany.mockResolvedValue([
      {
        name: "kanban-worker",
        files: [{ path: "SKILL.md", content: "---\nname: kanban-worker\ndescription: x\n---\n" }],
      },
      {
        name: "backend-development",
        files: [{ path: "SKILL.md", content: "---\nname: backend-development\ndescription: x\n---\n" }],
      },
    ])
    mockMcpFindMany.mockResolvedValue([
      {
        id: "srv-1",
        name: "github",
        transport: "stdio",
        command: "npx server-github",
        url: null,
        envVars: { TOKEN: "abc" },
        toolsFilter: [],
      },
    ])
    mockIsProfileBusy.mockResolvedValue(false)
    mockHealth.mockResolvedValue(true)
    mockCreateProfile.mockResolvedValue({ success: true, profilePath: "/tmp/x", method: "filesystem" })
    mockDeleteProfile.mockResolvedValue(true)
    mockAgentUpdate.mockResolvedValue({})
    mockJobCreate.mockResolvedValue({ id: "job-1" })
  })

  it("returns error when agent not found", async () => {
    mockAgentFindUnique.mockResolvedValue(null)
    const r = await regenerateAgentProfile("missing", { reason: "test" })
    expect(r.status).toBe("error")
    if (r.status === "error") expect(r.error).toMatch(/agent/i)
  })

  it("regenerates worker profile when Hermes is idle", async () => {
    const r = await regenerateAgentProfile("agt-1", { reason: "agent-edit" })
    expect(r.status).toBe("regenerated")
    if (r.status === "regenerated") {
      expect(r.profileName).toBe("worker-acme-alpha")
      expect(r.method).toBe("filesystem")
    }
    expect(mockDeleteProfile).toHaveBeenCalledWith("worker-acme-alpha")
    expect(mockCreateProfile).toHaveBeenCalled()
  })

  it("calls deleteProfile BEFORE createProfile", async () => {
    const order: string[] = []
    mockDeleteProfile.mockImplementation(async () => {
      order.push("delete")
      return true
    })
    mockCreateProfile.mockImplementation(async () => {
      order.push("create")
      return { success: true, profilePath: "/tmp/x", method: "filesystem" as const }
    })
    await regenerateAgentProfile("agt-1", { reason: "test" })
    expect(order).toEqual(["delete", "create"])
  })

  it("passes skillBundles to createProfile sourced from DB Skill rows", async () => {
    await regenerateAgentProfile("agt-1", { reason: "test" })
    const input = mockCreateProfile.mock.calls[0][0]
    expect(input.skillBundles).toBeDefined()
    expect(input.skillBundles.map((b: { name: string }) => b.name).sort()).toEqual([
      "backend-development",
      "kanban-worker",
    ])
  })

  it("looks up skills scoped to org OR public", async () => {
    await regenerateAgentProfile("agt-1", { reason: "test" })
    const args = mockSkillFindMany.mock.calls[0][0]
    expect(args.where).toMatchObject({
      name: { in: ["kanban-worker", "backend-development"] },
      OR: [{ orgId: "org-1" }, { isPublic: true }],
    })
  })

  it("builds mcp_servers config from live McpServer rows (not from agent JSON snapshot)", async () => {
    await regenerateAgentProfile("agt-1", { reason: "test" })
    const input = mockCreateProfile.mock.calls[0][0]
    const mcps = input.config.mcp_servers
    expect(mcps).toBeDefined()
    expect(mcps).toHaveLength(1)
    expect(mcps[0]).toMatchObject({
      name: "github",
      transport: "stdio",
      command: "npx server-github",
      env: { TOKEN: "abc" },
    })
  })

  it("updates Agent.profileSyncedAt on success", async () => {
    await regenerateAgentProfile("agt-1", { reason: "test" })
    expect(mockAgentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "agt-1" },
        data: expect.objectContaining({ profileSyncedAt: expect.any(Date) }),
      }),
    )
  })

  it("enqueues a deferred ProfileRegenJob when Hermes profile is busy", async () => {
    mockIsProfileBusy.mockResolvedValue(true)
    const r = await regenerateAgentProfile("agt-1", { reason: "mcp-edit:srv-1" })
    expect(r.status).toBe("deferred")
    if (r.status === "deferred") {
      expect(r.jobId).toBe("job-1")
    }
    expect(mockJobCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: "agt-1",
        reason: "mcp-edit:srv-1",
        status: "deferred",
      }),
    })
    expect(mockCreateProfile).not.toHaveBeenCalled()
  })

  it("bypasses busy check when forceImmediate=true", async () => {
    mockIsProfileBusy.mockResolvedValue(true)
    const r = await regenerateAgentProfile("agt-1", {
      reason: "retry",
      forceImmediate: true,
    })
    expect(r.status).toBe("regenerated")
    expect(mockCreateProfile).toHaveBeenCalled()
    expect(mockJobCreate).not.toHaveBeenCalled()
  })

  it("returns error when createProfile throws", async () => {
    mockCreateProfile.mockRejectedValue(new Error("disk full"))
    const r = await regenerateAgentProfile("agt-1", { reason: "test" })
    expect(r.status).toBe("error")
    if (r.status === "error") expect(r.error).toMatch(/disk full/i)
  })

  it("uses buildCEOProfile path when template.roleType is ceo", async () => {
    mockAgentFindUnique.mockResolvedValue({
      ...WORKER_AGENT,
      hermesProfile: "ceo-acme",
      template: { id: "tpl-ceo", name: "CEO", roleType: "ceo" },
      specialization: null,
      cLevelRole: null,
      mcpServerIds: [],
      skills: ["kanban-orchestrator"],
    })
    mockSkillFindMany.mockResolvedValue([
      {
        name: "kanban-orchestrator",
        files: [
          {
            path: "SKILL.md",
            content: "---\nname: kanban-orchestrator\ndescription: x\n---\n",
          },
        ],
      },
    ])
    mockMcpFindMany.mockResolvedValue([])

    const r = await regenerateAgentProfile("agt-1", { reason: "test" })
    expect(r.status).toBe("regenerated")
    const input = mockCreateProfile.mock.calls[0][0]
    expect(input.profileName).toBe("ceo-acme")
    expect(input.config.mcp_servers).toBeUndefined()
  })

  it("uses buildCLevelProfile path when template.roleType is c-level (requires cLevelRole)", async () => {
    mockAgentFindUnique.mockResolvedValue({
      ...WORKER_AGENT,
      hermesProfile: "clevel-acme-cto",
      template: { id: "tpl-cto", name: "CTO", roleType: "c-level" },
      cLevelRole: "cto",
      specialization: null,
      skills: ["kanban-orchestrator"],
      mcpServerIds: [],
    })
    mockSkillFindMany.mockResolvedValue([
      {
        name: "kanban-orchestrator",
        files: [
          { path: "SKILL.md", content: "---\nname: kanban-orchestrator\ndescription: x\n---\n" },
        ],
      },
    ])
    mockMcpFindMany.mockResolvedValue([])

    const r = await regenerateAgentProfile("agt-1", { reason: "test" })
    expect(r.status).toBe("regenerated")
    const input = mockCreateProfile.mock.calls[0][0]
    expect(input.profileName).toBe("clevel-acme-cto")
  })

  it("returns error when c-level agent has no cLevelRole stored", async () => {
    mockAgentFindUnique.mockResolvedValue({
      ...WORKER_AGENT,
      template: { id: "tpl-cto", name: "CTO", roleType: "c-level" },
      cLevelRole: null,
      specialization: null,
    })
    const r = await regenerateAgentProfile("agt-1", { reason: "test" })
    expect(r.status).toBe("error")
    if (r.status === "error") expect(r.error).toMatch(/cLevelRole/i)
  })

  it("worker without specialization defaults to 'general'", async () => {
    mockAgentFindUnique.mockResolvedValue({
      ...WORKER_AGENT,
      specialization: null,
      skills: [],
      mcpServerIds: [],
    })
    mockSkillFindMany.mockResolvedValue([])
    mockMcpFindMany.mockResolvedValue([])

    const r = await regenerateAgentProfile("agt-1", { reason: "test" })
    expect(r.status).toBe("regenerated")
  })
})
