import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { HermesClient } from "@/lib/hermes/client"

describe("HermesClient.listRunsByProfile", () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    global.fetch = originalFetch
  })

  it("returns empty array when Hermes returns 200 with no runs", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ runs: [] }), { status: 200 }),
    ) as typeof global.fetch
    const client = new HermesClient({ gatewayUrl: "http://hermes:8642" })
    const runs = await client.listRunsByProfile("worker-acme-alpha")
    expect(runs).toEqual([])
  })

  it("filters out runs not matching the profile name", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          runs: [
            { run_id: "r1", profile: "worker-acme-alpha", status: "running" },
            { run_id: "r2", profile: "worker-acme-beta", status: "running" },
            { run_id: "r3", profile: "worker-acme-alpha", status: "completed" },
          ],
        }),
        { status: 200 },
      ),
    ) as typeof global.fetch
    const client = new HermesClient({ gatewayUrl: "http://hermes:8642" })
    const runs = await client.listRunsByProfile("worker-acme-alpha")
    expect(runs.map((r) => r.run_id)).toEqual(["r1", "r3"])
  })

  it("returns empty array on non-200 response (resilient)", async () => {
    global.fetch = vi.fn(async () =>
      new Response("server error", { status: 500 }),
    ) as typeof global.fetch
    const client = new HermesClient({ gatewayUrl: "http://hermes:8642" })
    const runs = await client.listRunsByProfile("worker-acme-alpha")
    expect(runs).toEqual([])
  })

  it("returns empty array on network failure (Hermes unreachable)", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("ECONNREFUSED")
    }) as typeof global.fetch
    const client = new HermesClient({ gatewayUrl: "http://hermes:8642" })
    const runs = await client.listRunsByProfile("worker-acme-alpha")
    expect(runs).toEqual([])
  })

  it("hits the /v1/runs endpoint with the profile query param", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ runs: [] }), { status: 200 }),
    )
    global.fetch = fetchMock as unknown as typeof global.fetch
    const client = new HermesClient({ gatewayUrl: "http://hermes:8642" })
    await client.listRunsByProfile("worker-acme-alpha")
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/runs"),
      expect.any(Object),
    )
    const callArgs = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(callArgs[0]).toMatch(/profile=worker-acme-alpha/)
  })
})

describe("HermesClient.isProfileBusy", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("returns true when there is at least one run with status running or started", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          runs: [
            { run_id: "r1", profile: "worker-acme-alpha", status: "running" },
          ],
        }),
        { status: 200 },
      ),
    ) as typeof global.fetch
    const client = new HermesClient({ gatewayUrl: "http://hermes:8642" })
    expect(await client.isProfileBusy("worker-acme-alpha")).toBe(true)
  })

  it("returns false when all runs are completed/failed/cancelled", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          runs: [
            { run_id: "r1", profile: "worker-acme-alpha", status: "completed" },
            { run_id: "r2", profile: "worker-acme-alpha", status: "failed" },
          ],
        }),
        { status: 200 },
      ),
    ) as typeof global.fetch
    const client = new HermesClient({ gatewayUrl: "http://hermes:8642" })
    expect(await client.isProfileBusy("worker-acme-alpha")).toBe(false)
  })

  it("returns false when no runs exist", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ runs: [] }), { status: 200 }),
    ) as typeof global.fetch
    const client = new HermesClient({ gatewayUrl: "http://hermes:8642" })
    expect(await client.isProfileBusy("worker-acme-alpha")).toBe(false)
  })
})
