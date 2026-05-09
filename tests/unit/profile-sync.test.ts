import { describe, it, expect, beforeEach, vi } from "vitest"

const mockHealth = vi.fn()
const mockProfileExists = vi.fn()
const mockCreateProfile = vi.fn()
const mockAgentUpdate = vi.fn()
const mockAgentFindMany = vi.fn()

vi.mock("@/lib/hermes", () => ({
  isHermesAvailable: () => mockHealth(),
  buildCEOProfile: vi.fn(() => ({ profileName: "ceo-test", soulContent: "soul", config: { model: "x" } })),
  profileManager: {
    profileExists: (n: string) => mockProfileExists(n),
    createProfile: (i: unknown) => mockCreateProfile(i),
  },
}))

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    agent: {
      update: (args: unknown) => mockAgentUpdate(args),
      findMany: (args: unknown) => mockAgentFindMany(args),
    },
  },
}))

import { syncCeoProfile, syncPendingCeoProfiles } from "@/lib/hermes/profile-sync"

const buildCeoAgent = (overrides: Record<string, unknown> = {}) => ({
  id: "ag-1",
  orgId: "org-1",
  hermesProfile: "ceo-acme",
  name: "CEO Agent",
  profileSyncedAt: null,
  template: { roleType: "ceo" as const },
  ...overrides,
})

const buildOrg = (overrides: Record<string, unknown> = {}) => ({
  id: "org-1",
  slug: "acme",
  name: "Acme",
  objective: "Ship MVP",
  ...overrides,
})

describe("syncCeoProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns gatewayUnavailable when Hermes is down", async () => {
    mockHealth.mockResolvedValue(false)
    const result = await syncCeoProfile(buildCeoAgent(), buildOrg())
    expect(result.gatewayAvailable).toBe(false)
    expect(result.synced).toBe(false)
    expect(mockCreateProfile).not.toHaveBeenCalled()
    expect(mockAgentUpdate).not.toHaveBeenCalled()
  })

  it("creates profile when missing and updates profileSyncedAt", async () => {
    mockHealth.mockResolvedValue(true)
    mockProfileExists.mockResolvedValue(false)
    mockCreateProfile.mockResolvedValue({ success: true, profilePath: "/p", method: "filesystem" })
    mockAgentUpdate.mockResolvedValue({})

    const result = await syncCeoProfile(buildCeoAgent(), buildOrg())
    expect(result.synced).toBe(true)
    expect(result.gatewayAvailable).toBe(true)
    expect(result.alreadyExisted).toBe(false)
    expect(mockCreateProfile).toHaveBeenCalledOnce()
    expect(mockAgentUpdate).toHaveBeenCalledWith({
      where: { id: "ag-1" },
      data: { profileSyncedAt: expect.any(Date) },
    })
  })

  it("skips profile creation when it already exists, but still marks synced", async () => {
    mockHealth.mockResolvedValue(true)
    mockProfileExists.mockResolvedValue(true)
    mockAgentUpdate.mockResolvedValue({})

    const result = await syncCeoProfile(buildCeoAgent(), buildOrg())
    expect(result.synced).toBe(true)
    expect(result.alreadyExisted).toBe(true)
    expect(mockCreateProfile).not.toHaveBeenCalled()
    expect(mockAgentUpdate).toHaveBeenCalledOnce()
  })

  it("rejects non-CEO agents with a clear error", async () => {
    mockHealth.mockResolvedValue(true)
    const agent = buildCeoAgent({ template: { roleType: "c-level" as const } })
    const result = await syncCeoProfile(agent, buildOrg())
    expect(result.synced).toBe(false)
    expect(result.error).toMatch(/CEO/i)
    expect(mockCreateProfile).not.toHaveBeenCalled()
  })

  it("returns synced=false with error if createProfile throws", async () => {
    mockHealth.mockResolvedValue(true)
    mockProfileExists.mockResolvedValue(false)
    mockCreateProfile.mockRejectedValue(new Error("write EACCES"))

    const result = await syncCeoProfile(buildCeoAgent(), buildOrg())
    expect(result.synced).toBe(false)
    expect(result.error).toMatch(/EACCES/)
    expect(mockAgentUpdate).not.toHaveBeenCalled()
  })
})

describe("syncPendingCeoProfiles", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns gateway error and skips work when Hermes is down", async () => {
    mockHealth.mockResolvedValue(false)
    const result = await syncPendingCeoProfiles(buildOrg())
    expect(result.gatewayAvailable).toBe(false)
    expect(result.attempted).toBe(0)
    expect(mockAgentFindMany).not.toHaveBeenCalled()
  })

  it("returns empty result if no pending CEO agents", async () => {
    mockHealth.mockResolvedValue(true)
    mockAgentFindMany.mockResolvedValue([])

    const result = await syncPendingCeoProfiles(buildOrg())
    expect(result.attempted).toBe(0)
    expect(result.synced).toEqual([])
    expect(result.failed).toEqual([])
  })

  it("only fetches CEO agents with profileSyncedAt null", async () => {
    mockHealth.mockResolvedValue(true)
    mockAgentFindMany.mockResolvedValue([])

    await syncPendingCeoProfiles(buildOrg())
    expect(mockAgentFindMany).toHaveBeenCalledWith({
      where: {
        orgId: "org-1",
        profileSyncedAt: null,
        OR: [
          { template: { roleType: "ceo" } },
          { hermesProfile: { startsWith: "ceo-" } },
        ],
      },
      include: { template: { select: { roleType: true } } },
    })
  })

  it("syncs orphan CEO agents (no template link) when hermesProfile starts with ceo-", async () => {
    mockHealth.mockResolvedValue(true)
    mockAgentFindMany.mockResolvedValue([
      { ...buildCeoAgent({ id: "orphan", hermesProfile: "ceo-acme" }), template: null },
    ])
    mockProfileExists.mockResolvedValue(false)
    mockCreateProfile.mockResolvedValue({ success: true, profilePath: "/p", method: "filesystem" })
    mockAgentUpdate.mockResolvedValue({})

    const result = await syncPendingCeoProfiles(buildOrg())
    expect(result.attempted).toBe(1)
    expect(result.synced).toEqual([{ id: "orphan", hermesProfile: "ceo-acme" }])
  })

  it("syncs all pending CEO agents and reports per-agent outcome", async () => {
    mockHealth.mockResolvedValue(true)
    mockAgentFindMany.mockResolvedValue([
      buildCeoAgent({ id: "a1", hermesProfile: "ceo-acme" }),
    ])
    mockProfileExists.mockResolvedValue(false)
    mockCreateProfile.mockResolvedValue({ success: true, profilePath: "/p1", method: "filesystem" })
    mockAgentUpdate.mockResolvedValue({})

    const result = await syncPendingCeoProfiles(buildOrg())
    expect(result.attempted).toBe(1)
    expect(result.synced).toEqual([{ id: "a1", hermesProfile: "ceo-acme" }])
    expect(result.failed).toEqual([])
  })
})
