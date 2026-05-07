export interface HermesConfig {
  gatewayUrl: string
  apiKey: string
  hermesHome: string
}

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface ChatCompletionRequest {
  model?: string
  messages: ChatMessage[]
  profile?: string
  stream?: boolean
  temperature?: number
  max_tokens?: number
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: ChatMessage
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface RunRequest {
  input: string | ChatMessage[]
  profile?: string
  session_id?: string
  instructions?: string
  conversation?: string
  previous_response_id?: string
}

export interface RunResponse {
  object: string
  run_id: string
  status: "started" | "running" | "completed" | "failed" | "cancelled"
  session_id?: string
  model: string
  output?: string
  usage?: {
    input_tokens: number
    output_tokens: number
    total_tokens: number
  }
}

export interface ModelInfo {
  id: string
  object: string
  created: number
  owned_by: string
}

export interface HealthResponse {
  status: "ok" | "error"
}

export interface CapabilitiesResponse {
  object: string
  platform: string
  model: string
  auth: { type: string; required: boolean }
  features: {
    chat_completions: boolean
    responses_api: boolean
    run_submission: boolean
    run_status: boolean
    run_events_sse: boolean
    run_stop: boolean
  }
}

export class HermesClient {
  private _baseUrl: string
  private apiKey: string
  private hermesHome: string

  constructor(config?: Partial<HermesConfig>) {
    this._baseUrl = config?.gatewayUrl || process.env.HERMES_GATEWAY_URL || "http://127.0.0.1:8642"
    this.apiKey = config?.apiKey || process.env.HERMES_API_KEY || ""
    this.hermesHome = config?.hermesHome || process.env.HERMES_HOME || `${process.env.HOME || "/root"}/.hermes`
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (this.apiKey) {
      h["Authorization"] = `Bearer ${this.apiKey}`
    }
    return h
  }

  private get v1Url(): string {
    return `${this._baseUrl}/v1`
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this._baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async healthDetailed(): Promise<{ status: string; sessions?: number; agents?: number } | null> {
    try {
      const res = await fetch(`${this._baseUrl}/health/detailed`, {
        method: "GET",
        headers: this.headers,
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${this.v1Url}/models`, {
      method: "GET",
      headers: this.headers,
    })
    if (!res.ok) throw new HermesAPIError("listModels", res.status, await res.text())
    const data = await res.json()
    return data.data || data
  }

  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const res = await fetch(`${this.v1Url}/chat/completions`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        model: req.model || "hermes-agent",
        messages: req.messages,
        stream: false,
        ...(req.profile && { profile: req.profile }),
        ...(req.temperature !== undefined && { temperature: req.temperature }),
        ...(req.max_tokens !== undefined && { max_tokens: req.max_tokens }),
      }),
    })
    if (!res.ok) throw new HermesAPIError("chatCompletion", res.status, await res.text())
    return res.json()
  }

  async chatCompletionStream(
    req: ChatCompletionRequest,
    onChunk: (chunk: string) => void,
    onDone?: () => void,
  ): Promise<void> {
    const res = await fetch(`${this.v1Url}/chat/completions`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        model: req.model || "hermes-agent",
        messages: req.messages,
        stream: true,
        ...(req.profile && { profile: req.profile }),
        ...(req.temperature !== undefined && { temperature: req.temperature }),
        ...(req.max_tokens !== undefined && { max_tokens: req.max_tokens }),
      }),
    })
    if (!res.ok) throw new HermesAPIError("chatCompletionStream", res.status, await res.text())
    if (!res.body) throw new Error("No response body for streaming")

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === "data: [DONE]") continue
        if (trimmed.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(trimmed.slice(6))
            const content = parsed.choices?.[0]?.delta?.content
            if (content) onChunk(content)
          } catch {
            // skip malformed chunks
          }
        }
      }
    }
    onDone?.()
  }

  async createRun(req: RunRequest): Promise<RunResponse> {
    const res = await fetch(`${this.v1Url}/runs`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(req),
    })
    if (!res.ok) throw new HermesAPIError("createRun", res.status, await res.text())
    return res.json()
  }

  async getRunStatus(runId: string): Promise<RunResponse> {
    const res = await fetch(`${this.v1Url}/runs/${runId}`, {
      method: "GET",
      headers: this.headers,
    })
    if (!res.ok) throw new HermesAPIError("getRunStatus", res.status, await res.text())
    return res.json()
  }

  async stopRun(runId: string): Promise<{ status: string }> {
    const res = await fetch(`${this.v1Url}/runs/${runId}/stop`, {
      method: "POST",
      headers: this.headers,
    })
    if (!res.ok) throw new HermesAPIError("stopRun", res.status, await res.text())
    return res.json()
  }

  streamRunEvents(runId: string): EventSource | null {
    if (typeof window === "undefined") return null
    const url = `${this.v1Url}/runs/${runId}/events`
    return new EventSource(url)
  }

  async capabilities(): Promise<CapabilitiesResponse> {
    const res = await fetch(`${this.v1Url}/capabilities`, {
      method: "GET",
      headers: this.headers,
    })
    if (!res.ok) throw new HermesAPIError("capabilities", res.status, await res.text())
    return res.json()
  }

  get hermesHomePath(): string {
    return this.hermesHome
  }

  get profilesPath(): string {
    return `${this.hermesHome}/profiles`
  }

  get kanbanDbPath(): string {
    return `${this.hermesHome}/kanban.db`
  }

  get gatewayUrl(): string {
    return this._baseUrl
  }
}

export class HermesAPIError extends Error {
  public readonly method: string
  public readonly statusCode: number
  public readonly body: string

  constructor(method: string, statusCode: number, body: string) {
    super(`Hermes API error in ${method}: ${statusCode} - ${body.slice(0, 200)}`)
    this.name = "HermesAPIError"
    this.method = method
    this.statusCode = statusCode
    this.body = body
  }
}

export const hermesClient = new HermesClient()