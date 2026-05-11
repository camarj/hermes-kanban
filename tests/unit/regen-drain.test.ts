import { describe, it, expect, beforeEach, vi } from "vitest"

const mockJobFindFirst = vi.fn()
const mockJobUpdate = vi.fn()
const mockJobCreate = vi.fn()

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    profileRegenJob: {
      findFirst: (args: unknown) => mockJobFindFirst(args),
      update: (args: unknown) => mockJobUpdate(args),
      create: (args: unknown) => mockJobCreate(args),
    },
  },
}))

const mockRegenerate = vi.fn()

vi.mock("@/lib/agents/regenerate-agent", () => ({
  regenerateAgentProfile: (id: string, opts: unknown) => mockRegenerate(id, opts),
}))

import {
  processNextJob,
  enqueueRegenJob,
  __resetDrainStateForTests,
} from "@/lib/hermes/regen-drain"

describe("processNextJob", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __resetDrainStateForTests()
  })

  it("returns false when no pending job exists", async () => {
    mockJobFindFirst.mockResolvedValue(null)
    const processed = await processNextJob()
    expect(processed).toBe(false)
    expect(mockRegenerate).not.toHaveBeenCalled()
  })

  it("marks job as running, invokes regenerate with forceImmediate=true, marks done on success", async () => {
    mockJobFindFirst.mockResolvedValue({
      id: "job-1",
      agentId: "agt-1",
      reason: "mcp-edit:srv-1",
      status: "pending",
      attempts: 0,
    })
    mockRegenerate.mockResolvedValue({
      status: "regenerated",
      profileName: "worker-acme-alpha",
      method: "filesystem",
    })
    mockJobUpdate.mockResolvedValue({})

    const processed = await processNextJob()
    expect(processed).toBe(true)

    expect(mockJobUpdate).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({ status: "running", startedAt: expect.any(Date) }),
    })
    expect(mockRegenerate).toHaveBeenCalledWith("agt-1", {
      reason: "mcp-edit:srv-1",
      forceImmediate: true,
    })
    expect(mockJobUpdate).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({ status: "done", finishedAt: expect.any(Date) }),
    })
  })

  it("marks job failed with error message when regenerate returns error", async () => {
    mockJobFindFirst.mockResolvedValue({
      id: "job-2",
      agentId: "agt-1",
      reason: "test",
      status: "pending",
      attempts: 0,
    })
    mockRegenerate.mockResolvedValue({ status: "error", error: "disk full" })
    mockJobUpdate.mockResolvedValue({})

    await processNextJob()

    expect(mockJobUpdate).toHaveBeenLastCalledWith({
      where: { id: "job-2" },
      data: expect.objectContaining({
        status: "failed",
        error: "disk full",
        attempts: 1,
      }),
    })
  })

  it("marks job failed when regenerate throws", async () => {
    mockJobFindFirst.mockResolvedValue({
      id: "job-3",
      agentId: "agt-1",
      reason: "test",
      status: "pending",
      attempts: 0,
    })
    mockRegenerate.mockRejectedValue(new Error("boom"))
    mockJobUpdate.mockResolvedValue({})

    await processNextJob()

    expect(mockJobUpdate).toHaveBeenLastCalledWith({
      where: { id: "job-3" },
      data: expect.objectContaining({ status: "failed", error: expect.stringMatching(/boom/i) }),
    })
  })

  it("queries oldest pending job first (ordered by createdAt asc)", async () => {
    mockJobFindFirst.mockResolvedValue(null)
    await processNextJob()
    expect(mockJobFindFirst).toHaveBeenCalledWith({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    })
  })

  it("single-flight: a second processNextJob during execution returns false without double-claiming", async () => {
    let resolveFirst: (() => void) | null = null
    mockJobFindFirst.mockResolvedValue({
      id: "job-slow",
      agentId: "agt-1",
      reason: "test",
      status: "pending",
      attempts: 0,
    })
    mockJobUpdate.mockResolvedValue({})
    mockRegenerate.mockImplementation(
      () =>
        new Promise<{ status: "regenerated"; profileName: string; method: "filesystem" }>((res) => {
          resolveFirst = () =>
            res({ status: "regenerated", profileName: "x", method: "filesystem" })
        }),
    )

    const first = processNextJob()

    // Drain microtasks so the first call reaches the regenerate await and
    // resolveFirst is bound to the real resolver before we contend.
    await new Promise<void>((r) => setImmediate(r))
    expect(resolveFirst).not.toBeNull()

    const second = await processNextJob()
    expect(second).toBe(false)

    resolveFirst!()
    expect(await first).toBe(true)
  })
})

describe("enqueueRegenJob", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __resetDrainStateForTests()
  })

  it("creates a row with status='pending' by default", async () => {
    mockJobCreate.mockResolvedValue({ id: "j1" })
    await enqueueRegenJob({ agentId: "agt-1", reason: "mcp-edit:srv-1" })
    expect(mockJobCreate).toHaveBeenCalledWith({
      data: { agentId: "agt-1", reason: "mcp-edit:srv-1", status: "pending" },
    })
  })

  it("dedups on partial unique index: swallows P2002 from prisma", async () => {
    const err: Error & { code?: string } = new Error("Unique constraint")
    err.code = "P2002"
    mockJobCreate.mockRejectedValue(err)
    const result = await enqueueRegenJob({ agentId: "agt-1", reason: "test" })
    expect(result.deduped).toBe(true)
  })
})
