import { describe, it, expect, beforeEach, vi } from "vitest"

const mockAgentFindFirst = vi.fn()
const mockAgentUpdate = vi.fn()

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    agent: {
      findFirst: (args: unknown) => mockAgentFindFirst(args),
      update: (args: unknown) => mockAgentUpdate(args),
    },
  },
}))

const mockRegenerate = vi.fn()

vi.mock("@/lib/agents/regenerate-agent", () => ({
  regenerateAgentProfile: (id: string, opts: unknown) => mockRegenerate(id, opts),
}))

import { patchAgent } from "@/lib/agents/patch-agent"

const EXISTING = {
  id: "agt-1",
  orgId: "org-1",
  templateId: "tpl-1",
  cLevelRole: null,
  specialization: "backend-engineer",
  hermesProfile: "worker-acme-alpha",
  name: "Alpha",
  skills: ["kanban-worker"],
  mcpServerIds: [],
}

describe("patchAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAgentFindFirst.mockResolvedValue(EXISTING)
    mockAgentUpdate.mockResolvedValue({ ...EXISTING, name: "Updated" })
    mockRegenerate.mockResolvedValue({
      status: "regenerated",
      profileName: "worker-acme-alpha",
      method: "filesystem",
    })
  })

  it("returns 404 when agent not in org", async () => {
    mockAgentFindFirst.mockResolvedValue(null)
    const r = await patchAgent("org-1", "agt-missing", { name: "X" })
    expect(r.status).toBe(404)
  })

  it("rejects attempts to change templateId (400)", async () => {
    const r = await patchAgent("org-1", "agt-1", { templateId: "different" })
    expect(r.status).toBe(400)
    if (r.status === 400) expect(r.error).toMatch(/template/i)
    expect(mockAgentUpdate).not.toHaveBeenCalled()
  })

  it("rejects attempts to change cLevelRole (400)", async () => {
    const r = await patchAgent("org-1", "agt-1", { cLevelRole: "cfo" })
    expect(r.status).toBe(400)
    if (r.status === 400) expect(r.error).toMatch(/cLevelRole|role/i)
  })

  it("rejects attempts to change specialization (400)", async () => {
    const r = await patchAgent("org-1", "agt-1", { specialization: "frontend-engineer" })
    expect(r.status).toBe(400)
    if (r.status === 400) expect(r.error).toMatch(/specialization/i)
  })

  it("rejects attempts to change hermesProfile (400)", async () => {
    const r = await patchAgent("org-1", "agt-1", { hermesProfile: "renamed" })
    expect(r.status).toBe(400)
  })

  it("accepts name + description + soulContent + skills + mcpServerIds and regenerates", async () => {
    const r = await patchAgent("org-1", "agt-1", {
      name: "Updated",
      description: "new desc",
      soulContent: "new SOUL body",
      skills: ["kanban-worker", "react-patterns"],
      mcpServerIds: ["srv-1"],
    })
    expect(r.status).toBe(200)

    expect(mockAgentUpdate).toHaveBeenCalledWith({
      where: { id: "agt-1" },
      data: expect.objectContaining({
        name: "Updated",
        description: "new desc",
        soulContent: "new SOUL body",
        skills: ["kanban-worker", "react-patterns"],
        mcpServerIds: ["srv-1"],
      }),
      include: expect.any(Object),
    })

    expect(mockRegenerate).toHaveBeenCalledWith("agt-1", { reason: "agent-edit" })
  })

  it("DOES NOT regenerate when only isActive toggles (cheap field)", async () => {
    const r = await patchAgent("org-1", "agt-1", { isActive: false })
    expect(r.status).toBe(200)
    expect(mockRegenerate).not.toHaveBeenCalled()
  })

  it("returns 200 with deferred result when Hermes profile is busy", async () => {
    mockRegenerate.mockResolvedValue({
      status: "deferred",
      jobId: "job-1",
      reason: "agent-edit",
    })
    const r = await patchAgent("org-1", "agt-1", { soulContent: "new" })
    expect(r.status).toBe(200)
    if (r.status === 200) {
      expect(r.regen?.status).toBe("deferred")
    }
  })

  it("returns 200 but surfaces regen error in response (does not fail the PATCH)", async () => {
    mockRegenerate.mockResolvedValue({ status: "error", error: "disk full" })
    const r = await patchAgent("org-1", "agt-1", { soulContent: "new" })
    expect(r.status).toBe(200)
    if (r.status === 200) {
      expect(r.regen?.status).toBe("error")
      if (r.regen?.status === "error") {
        expect(r.regen.error).toBe("disk full")
      }
    }
  })

  it("trims name and description", async () => {
    await patchAgent("org-1", "agt-1", { name: "  Spaced  ", description: "  trimme  " })
    expect(mockAgentUpdate).toHaveBeenCalledWith({
      where: { id: "agt-1" },
      data: expect.objectContaining({ name: "Spaced", description: "trimme" }),
      include: expect.any(Object),
    })
  })

  it("normalizes empty description string to null", async () => {
    await patchAgent("org-1", "agt-1", { name: "x", description: "  " })
    const call = mockAgentUpdate.mock.calls[0][0] as { data: { description: string | null } }
    expect(call.data.description).toBeNull()
  })
})
