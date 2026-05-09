"use client"

import { useState, useEffect, useCallback } from "react"
import { useChat } from "@/hooks/use-chat"
import { useAutoScroll } from "@/hooks/use-auto-scroll"
import { ChatMessageList } from "./chat-message-list"
import { ChatInput } from "./chat-input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trash2, WifiOff, Wifi } from "lucide-react"
import { hermesClient } from "@/lib/hermes/client"

interface ChatPanelProps {
  orgId: string
  orgSlug: string
  profile: string
  agentName: string
  onBack?: () => void
}

export function ChatPanel({ orgId, profile, agentName, onBack }: ChatPanelProps) {
  const [gatewayOnline, setGatewayOnline] = useState<boolean | null>(null)
  const { messages, isLoading, sendMessage, stopStreaming, clearChat } = useChat({
    orgId,
    profile,
    onError: (error) => {
      console.error("Chat error:", error)
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
      if (text.trim()) sendMessage(text)
    },
    [sendMessage]
  )

  // Expose suggestion click handler to ChatMessageList via a custom approach
  // We'll pass it via a ref or context, but simpler: just use the chat from the input

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-serif font-semibold text-sm">
              {agentName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="font-medium text-foreground text-sm">{agentName}</h2>
            <p className="text-xs text-muted-foreground">{profile}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              gatewayOnline
                ? "border-success/30 text-success bg-success/10"
                : gatewayOnline === false
                  ? "border-destructive/30 text-destructive bg-destructive/10"
                  : "border-border text-muted-foreground bg-muted"
            }
          >
            {gatewayOnline ? (
              <>
                <Wifi className="h-3 w-3 mr-1" /> Online
              </>
            ) : gatewayOnline === false ? (
              <>
                <WifiOff className="h-3 w-3 mr-1" /> Offline
              </>
            ) : (
              "Checking..."
            )}
          </Badge>
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" onClick={clearChat} className="h-8 w-8 text-muted-foreground">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ChatMessageList
        messages={messages}
        isGatewayDown={gatewayOnline === false}
        containerRef={scrollRef}
      />

      {/* Suggestion buttons in empty state need click handlers */}
      {/* We handle this via a custom event approach */}
      {/* The ChatMessageList shows suggestions; we intercept clicks via the document */}
      <SuggestionClickHandler onSuggestionClick={handleSuggestionClick} />

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        isLoading={isLoading}
        isStreaming={messages.some((m) => m.isStreaming)}
        onStop={stopStreaming}
        disabled={gatewayOnline === false}
      />
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