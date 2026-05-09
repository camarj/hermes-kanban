"use client"

import { useState, useCallback, useEffect } from "react"
import { useChat } from "@/hooks/use-chat"
import { useAutoScroll } from "@/hooks/use-auto-scroll"
import { ChatMessageList } from "@/components/chat/chat-message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, WifiOff, Wifi, Bot, MessageSquare } from "lucide-react"
import { hermesClient } from "@/lib/hermes/client"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Agent } from "@/lib/agents/types"

const STORAGE_KEY = "hermes-chat-conversation"

interface SharedChatPanelProps {
  orgId: string
  agents: Agent[]
}

function getStoredConversationId(): string | undefined {
  if (typeof window === "undefined") return undefined
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored || undefined
}

function storeConversationId(id: string | undefined) {
  if (typeof window === "undefined") return
  if (id) {
    localStorage.setItem(STORAGE_KEY, id)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

function getUrlConversationId(): string | undefined {
  if (typeof window === "undefined") return undefined
  const params = new URLSearchParams(window.location.search)
  return params.get("conversation") || undefined
}

export function SharedChatPanel({ orgId, agents }: SharedChatPanelProps) {
  const [gatewayOnline, setGatewayOnline] = useState<boolean | null>(null)
  const [selectedAgent] = useState<Agent | null>(() => {
    if (agents.length === 0) return null
    const ceoAgent = agents.find((a) => a.hermesProfile.startsWith("ceo-"))
    return ceoAgent || agents[0]
  })

  // Initialize from URL (for shared links) or localStorage (for persistence)
  const [conversationId, setConversationIdState] = useState<string | undefined>(() => {
    const fromUrl = getUrlConversationId()
    const fromStorage = getStoredConversationId()
    return fromUrl || fromStorage || undefined
  })

  // Persist to localStorage when conversationId changes
  useEffect(() => {
    storeConversationId(conversationId)
  }, [conversationId])

  const setConversationId = useCallback((id: string | undefined) => {
    setConversationIdState(id)
    storeConversationId(id)
    // Update URL using native API (no React re-renders)
    if (id) {
      const params = new URLSearchParams(window.location.search)
      params.set("conversation", id)
      const newUrl = `${window.location.pathname}?${params.toString()}`
      window.history.replaceState(null, "", newUrl)
    }
  }, [])

  const profile = selectedAgent?.hermesProfile || null
  const agentId = selectedAgent?.id || undefined

  const { messages, isLoading, sendMessage, stopStreaming, clearChat } = useChat({
    orgId,
    profile: profile || "",
    agentId,
    conversationId,
    onError: (error) => {
      console.error("Chat error:", error)
    },
    onConversationCreated: (id) => {
      setConversationId(id)
    },
  })

  const scrollRef = useAutoScroll(messages[messages.length - 1]?.content)

  useEffect(() => {
    let mounted = true
    async function checkHealth() {
      try {
        const ok = await hermesClient.health()
        if (mounted) setGatewayOnline(ok)
      } catch {
        if (mounted) setGatewayOnline(false)
      }
    }
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const handleSuggestionClick = useCallback(
    (text: string) => {
      if (text.trim() && profile) sendMessage(text)
    },
    [sendMessage, profile]
  )

  const handleClearChat = useCallback(() => {
    clearChat()
    setConversationId(undefined)
  }, [clearChat, setConversationId])

  if (agents.length === 0) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#D4CFC7] bg-[#F5F1EB]">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-sm font-semibold text-[#070605]">
              Agent Chat
            </h3>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Bot className="h-12 w-12 text-[#D4CFC7] mb-4" />
          <p className="text-sm text-[#6B6560] mb-2">
            No agents available
          </p>
          <p className="text-xs text-[#9B9590]">
            A CEO Agent will be created automatically when you set up the Hermes Gateway.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#D4CFC7] bg-[#F5F1EB]">
        <div className="flex items-center gap-2">
          <h3 className="font-serif text-sm font-semibold text-[#070605]">
            Agent Chat
          </h3>
          {selectedAgent && (
            <Badge variant="outline" className="border-[#D4CFC7] text-xs">
              {selectedAgent.name}
            </Badge>
          )}
          {conversationId && (
            <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Saved
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              gatewayOnline
                ? "border-green-300 text-green-700 bg-green-50 text-xs"
                : gatewayOnline === false
                  ? "border-red-300 text-red-700 bg-red-50 text-xs"
                  : "border-gray-300 text-gray-500 bg-gray-50 text-xs"
            }
          >
            {gatewayOnline ? (
              <Wifi className="h-3 w-3" />
            ) : gatewayOnline === false ? (
              <WifiOff className="h-3 w-3" />
            ) : null}
          </Badge>
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" onClick={handleClearChat} className="h-7 w-7">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <ChatMessageList
            messages={messages}
            isGatewayDown={gatewayOnline === false}
            containerRef={scrollRef}
          />
          <SuggestionClickHandler onSuggestionClick={handleSuggestionClick} />
        </ScrollArea>
      </div>

      <div className="border-t border-[#D4CFC7]">
        <ChatInput
          onSend={sendMessage}
          isLoading={isLoading}
          isStreaming={messages.some((m) => m.isStreaming)}
          onStop={stopStreaming}
          disabled={gatewayOnline === false || !profile}
        />
      </div>
    </div>
  )
}

function SuggestionClickHandler({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      const button = target.closest("button")
      if (button?.dataset?.suggestion) {
        onSuggestionClick(button.dataset.suggestion)
      }
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [onSuggestionClick])

  return null
}
