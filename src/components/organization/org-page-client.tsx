"use client"

import { useState } from "react"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import { SharedChatPanel } from "@/components/chat/shared-chat-panel"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react"
import type { Agent } from "@/lib/agents/types"

interface OrgPageClientProps {
  orgId: string
  orgSlug: string
  agents: Agent[]
}

export function OrgPageClient({ orgId, orgSlug, agents }: OrgPageClientProps) {
  const [isChatOpen, setIsChatOpen] = useState(true)

  const ceoAgent = agents.find((a) => a.hermesProfile.includes("ceo")) || agents[0]

  return (
    <div className="h-full flex relative">
      <div className="flex-1 min-w-0">
        <KanbanBoard />
      </div>

      {isChatOpen && (
        <div className="w-96 flex-shrink-0 relative border-l border-[#D4CFC7]">
          <Button
            onClick={() => setIsChatOpen(false)}
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-16 w-6 bg-white border border-[#D4CFC7] rounded-l-md rounded-r-none shadow-sm hover:bg-[#F5F1EB]"
          >
            <ChevronRight className="h-4 w-4 text-[#6B6560]" />
          </Button>
          <SharedChatPanel orgId={orgId} orgSlug={orgSlug} agents={agents} />
        </div>
      )}

      {!isChatOpen && (
        <Button
          onClick={() => setIsChatOpen(true)}
          variant="outline"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-16 w-6 bg-white border border-[#D4CFC7] rounded-l-md rounded-r-none shadow-sm hover:bg-[#F5F1EB] flex-col gap-1 px-0"
        >
          <ChevronLeft className="h-4 w-4 text-[#6B6560]" />
          <MessageSquare className="h-3 w-3 text-[#6B6560]" />
        </Button>
      )}
    </div>
  )
}
