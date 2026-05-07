"use client"

import { useState, useCallback, useRef } from "react"

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  isStreaming?: boolean
}

export interface UseChatOptions {
  orgId: string
  profile?: string
  onError?: (error: string) => void
}

export function useChat({ orgId, profile, onError }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      const assistantId = crypto.randomUUID()
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      }

      setMessages((prev) => [...prev, assistantMessage])

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const response = await fetch(`/api/organizations/${orgId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            profile,
            stream: true,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Request failed" }))
          if (response.status === 503) {
            onError?.("Hermes Gateway is not available. Start it with: hermes gateway run")
          } else {
            onError?.(errorData.error || `Error: ${response.status}`)
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "Sorry, I couldn't process your request. Please try again.", isStreaming: false }
                : m
            )
          )
          setIsLoading(false)
          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          onError?.("No response stream available")
          setIsLoading(false)
          return
        }

        const decoder = new TextDecoder()
        let buffer = ""
        let fullContent = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith("data: ")) continue

            const data = trimmed.slice(6)
            if (data === "[DONE]") continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.type === "content" && parsed.content) {
                fullContent += parsed.content
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: fullContent } : m
                  )
                )
              } else if (parsed.type === "done") {
                // stream complete
              } else if (parsed.type === "error") {
                onError?.(parsed.error || "Stream error")
              }
            } catch {
              // skip malformed JSON
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          )
        )
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false } : m
            )
          )
        } else {
          onError?.((error as Error).message || "Failed to send message")
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false } : m
            )
          )
        }
      } finally {
        setIsLoading(false)
        abortRef.current = null
      }
    },
    [messages, orgId, profile, onError]
  )

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const clearChat = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    isLoading,
    sendMessage,
    stopStreaming,
    clearChat,
  }
}