import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { testMcpConnection } from "@/lib/mcp/test-connection"

const originalFetch = global.fetch

describe("testMcpConnection", () => {
  beforeEach(() => {
    // no-op
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("returns ok+latency for http 200", async () => {
    global.fetch = vi.fn(async () => new Response("ok", { status: 200 })) as never

    const r = await testMcpConnection({
      transport: "http",
      url: "https://example.com/mcp",
      command: null,
    })

    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.statusCode).toBe(200)
      expect(r.latencyMs).toBeGreaterThanOrEqual(0)
    }
  })

  it("returns ok=false with statusCode for http 500", async () => {
    global.fetch = vi.fn(async () => new Response("oops", { status: 500 })) as never

    const r = await testMcpConnection({
      transport: "http",
      url: "https://example.com/mcp",
      command: null,
    })

    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.statusCode).toBe(500)
    }
  })

  it("returns ok=false with error for http network failure", async () => {
    global.fetch = vi.fn(async () => {
      throw new TypeError("fetch failed")
    }) as never

    const r = await testMcpConnection({
      transport: "http",
      url: "https://example.com/mcp",
      command: null,
    })

    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toMatch(/fetch failed|network/i)
    }
  })

  it("returns notSupported for stdio transport", async () => {
    const r = await testMcpConnection({
      transport: "stdio",
      command: "npx server",
      url: null,
    })

    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.notSupported).toBe(true)
    }
  })
})
