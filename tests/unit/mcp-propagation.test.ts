import { describe, it, expect, beforeEach, vi } from "vitest"

const mockAgentFindMany = vi.fn()
const mockJobCreate = vi.fn()

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    agent: {
      findMany: (args: unknown) => mockAgentFindMany(args),
    },
    profileRegenJob: {
      create: (args: unknown) => mockJobCreate(args),
    },
  },
}))

const mockKickDrain = vi.fn()

vi.mock("@/lib/hermes/regen-drain", async () => {
  const actual = await vi.importActual<typeof import("@/lib/hermes/regen-drain")>(
    "@/lib/hermes/regen-drain",
  )
  return {
    ...actual,
    kickRegenDrain: () => mockKickDrain(),
  }
})

import { propagateMcpUpdate } from "@/lib/mcp/propagate"

describe("propagateMcpUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 0 affected when no agent in org uses the server", async () => {
    mockAgentFindMany.mockResolvedValue([])
    const r = await propagateMcpUpdate("org-1", "srv-1")
    expect(r.affectedAgents).toBe(0)
    expect(mockJobCreate).not.toHaveBeenCalled()
    expect(mockKickDrain).not.toHaveBeenCalled()
  })

  it("queries agents scoped to org with mcpServerIds.has(serverId)", async () => {
    mockAgentFindMany.mockResolvedValue([])
    await propagateMcpUpdate("org-1", "srv-1")
    expect(mockAgentFindMany).toHaveBeenCalledWith({
      where: { orgId: "org-1", mcpServerIds: { has: "srv-1" }, isActive: true },
      select: { id: true },
    })
  })

  it("enqueues one regen job per affected agent with reason='mcp-edit:<serverId>'", async () => {
    mockAgentFindMany.mockResolvedValue([{ id: "a1" }, { id: "a2" }])
    mockJobCreate.mockResolvedValue({ id: "j" })
    const r = await propagateMcpUpdate("org-1", "srv-1")
    expect(r.affectedAgents).toBe(2)
    expect(mockJobCreate).toHaveBeenCalledTimes(2)
    expect(mockJobCreate).toHaveBeenCalledWith({
      data: { agentId: "a1", reason: "mcp-edit:srv-1", status: "pending" },
    })
    expect(mockJobCreate).toHaveBeenCalledWith({
      data: { agentId: "a2", reason: "mcp-edit:srv-1", status: "pending" },
    })
  })

  it("kicks the drain when at least one job was enqueued", async () => {
    mockAgentFindMany.mockResolvedValue([{ id: "a1" }])
    mockJobCreate.mockResolvedValue({ id: "j" })
    await propagateMcpUpdate("org-1", "srv-1")
    expect(mockKickDrain).toHaveBeenCalledTimes(1)
  })

  it("survives P2002 dedup on enqueue (rapid double-edit collapses)", async () => {
    mockAgentFindMany.mockResolvedValue([{ id: "a1" }, { id: "a2" }])
    const dupErr: Error & { code?: string } = new Error("Unique constraint")
    dupErr.code = "P2002"
    mockJobCreate.mockRejectedValueOnce(dupErr).mockResolvedValueOnce({ id: "j2" })

    const r = await propagateMcpUpdate("org-1", "srv-1")
    expect(r.affectedAgents).toBe(2)
    expect(r.dedupedJobs).toBe(1)
  })

  it("re-throws non-P2002 errors", async () => {
    mockAgentFindMany.mockResolvedValue([{ id: "a1" }])
    mockJobCreate.mockRejectedValue(new Error("boom"))
    await expect(propagateMcpUpdate("org-1", "srv-1")).rejects.toThrow(/boom/)
  })
})
