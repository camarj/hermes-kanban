"use client"

import { useState, useEffect } from "react"
import { SharedChatPanel } from "@/components/chat/shared-chat-panel"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react"
import type { Agent } from "@/lib/agents/types"

interface GlobalChatPanelProps {
  orgId: string
}

export function GlobalChatPanel({ orgId }: GlobalChatPanelProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch(`/api/organizations/${orgId}/agents`)
        if (res.ok) {
          const data = await res.json()
          setAgents(data.agents || [])
        }
      } catch (err) {
        console.error("Failed to load agents for chat:", err)
      } finally {
        setLoading(false)
      }
    }
    loadAgents()
  }, [orgId])

  if (loading || agents.length === 0) return null

  return (
    <>
      {isOpen && (
        <div className="w-96 flex-shrink-0 relative border-l border-border bg-card">
          <Button
            onClick={() => setIsOpen(false)}
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-16 w-6 bg-card border border-border rounded-l-md rounded-r-none hover:bg-background"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
          <SharedChatPanel orgId={orgId} agents={agents} />
        </div>
      )}

      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-16 w-6 bg-card border border-border rounded-l-md rounded-r-none hover:bg-background flex-col gap-1 px-0"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          <MessageSquare className="h-3 w-3 text-muted-foreground" />
        </Button>
      )}
    </>
  )
}
