"use client"

import { KanbanBoard } from "@/components/kanban/kanban-board"
import type { Agent } from "@/lib/agents/types"

interface OrgPageClientProps {
  orgId: string
  agents: Agent[]
}

export function OrgPageClient({ orgId, agents }: OrgPageClientProps) {
  return (
    <div className="h-full">
      <KanbanBoard orgId={orgId} agents={agents} />
    </div>
  )
}
