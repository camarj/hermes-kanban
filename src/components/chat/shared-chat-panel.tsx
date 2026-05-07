"use client"

import { useState, useEffect, useCallback } from "react"
import { useChat } from "@/hooks/use-chat"
import { useAutoScroll } from "@/hooks/use-auto-scroll"
import { ChatMessageList } from "@/components/chat/chat-message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, WifiOff, Wifi } from "lucide-react"
import { hermesClient } from "@/lib/hermes/client"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Agent } from "@/lib/agents/types"

interface SharedChatPanelProps {
  orgId: string
  orgSlug: string
  agents: Agent[]
}

export function SharedChatPanel({ orgId, orgSlug, agents }: SharedChatPanelProps) {
  const [gatewayOnline, setGatewayOnline] = useState<boolean | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  const profile = selectedAgent?.hermesProfile || "ceo-agent"

  const { messages, isLoading, sendMessage, stopStreaming, clearChat } = useChat({
    orgId,
    profile,
    onError: (error) => {
      console.error("Chat error:", error)
    },
  })

  const scrollRef = useAutoScroll(messages[messages.length - 1]?.content)

  useEffect(() => {
    const ceoAgent = agents.find((a) => a.hermesProfile.includes("ceo"))
    if (ceoAgent) {
      setSelectedAgent(ceoAgent)
    } else if (agents.length > 0) {
      setSelectedAgent(agents[0])
    }
  }, [agents])

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
      if (text.trim()) sendMessage(text)
    },
    [sendMessage]
  )

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
            <Button variant="ghost" size="icon" onClick={clearChat} className="h-7 w-7">
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
          disabled={gatewayOnline === false}
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
