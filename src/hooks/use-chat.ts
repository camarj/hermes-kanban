"use client"

import { useState, useCallback, useRef, useEffect } from "react"

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
  agentId?: string
  conversationId?: string
  onError?: (error: string) => void
  onConversationCreated?: (id: string) => void
}

export function useChat({ orgId, profile, agentId, conversationId, onError, onConversationCreated }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId)
  const abortRef = useRef<AbortController | null>(null)
  const loadedRef = useRef<string | undefined>(undefined)

  // Sync external conversationId prop with internal state
  useEffect(() => {
    if (conversationId !== currentConversationId) {
      setCurrentConversationId(conversationId)
      // Only clear messages when switching TO a different conversation,
      // not when mounting with the same conversationId
      if (conversationId && currentConversationId && conversationId !== currentConversationId) {
        setMessages([])
      }
      loadedRef.current = undefined
    }
  }, [conversationId])

  // Load messages from DB when we have a conversationId and haven't loaded it yet
  useEffect(() => {
    if (!currentConversationId) return
    if (loadedRef.current === currentConversationId) return

    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/organizations/${orgId}/conversations/${currentConversationId}/messages`)
        if (res.ok) {
          const data = await res.json()
          if (data.messages) {
            setMessages(
              data.messages.map((m: { id: string; role: string; content: string; createdAt: string }) => ({
                id: m.id,
                role: m.role as "user" | "assistant" | "system",
                content: m.content,
                timestamp: new Date(m.createdAt),
              }))
            )
          }
        }
      } catch (err) {
        console.error("Failed to load conversation messages:", err)
      }
      loadedRef.current = currentConversationId
    }

    loadMessages()
  }, [currentConversationId, orgId])

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
        // For existing conversations, only send the new message.
        // The API will load previous messages from DB.
        const messagesToSend = currentConversationId
          ? [{ role: "user" as const, content: userMessage.content }]
          : [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            }))

        const response = await fetch(`/api/organizations/${orgId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messagesToSend,
            profile,
            stream: true,
            conversationId: currentConversationId,
            agentId,
          }),
          signal: controller.signal,
        })

        // Extract conversation ID from header
        const newConvId = response.headers.get("x-conversation-id")
        if (newConvId && !currentConversationId) {
          loadedRef.current = newConvId
          setCurrentConversationId(newConvId)
          onConversationCreated?.(newConvId)
        }

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
    [messages, orgId, profile, agentId, currentConversationId, onError, onConversationCreated]
  )

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const clearChat = useCallback(() => {
    setMessages([])
    setCurrentConversationId(undefined)
    loadedRef.current = undefined
  }, [])

  return {
    messages,
    isLoading,
    conversationId: currentConversationId,
    sendMessage,
    stopStreaming,
    clearChat,
  }
}
