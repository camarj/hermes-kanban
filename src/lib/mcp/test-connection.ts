export interface McpServerLike {
  transport: string
  url: string | null
  command: string | null
}

export type McpTestResult =
  | { ok: true; statusCode: number; latencyMs: number }
  | { ok: false; statusCode?: number; error?: string; notSupported?: boolean }

const HTTP_TIMEOUT_MS = 5000

export async function testMcpConnection(server: McpServerLike): Promise<McpTestResult> {
  if (server.transport === "http") {
    if (!server.url) return { ok: false, error: "Missing url" }

    const start = Date.now()
    try {
      const res = await fetch(server.url, {
        method: "GET",
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      })
      const latencyMs = Date.now() - start

      if (res.ok) {
        return { ok: true, statusCode: res.status, latencyMs }
      }
      return { ok: false, statusCode: res.status }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "fetch failed",
      }
    }
  }

  if (server.transport === "stdio") {
    return {
      ok: false,
      notSupported: true,
      error: "stdio servers cannot be probed from the web app — connection will be tested when an agent uses it",
    }
  }

  return { ok: false, error: `Unknown transport: ${server.transport}` }
}
