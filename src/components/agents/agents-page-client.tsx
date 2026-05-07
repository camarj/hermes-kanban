"use client"

import { useState, useEffect, useCallback } from "react"
import { Agent } from "@/lib/agents/types"
import { AgentList } from "@/components/agents/agent-list"
import { CreateAgentDialog } from "@/components/agents/create-agent-dialog"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"

interface AgentsPageClientProps {
  orgId: string
}

export function AgentsPageClient({ orgId }: AgentsPageClientProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const fetchAgents = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/organizations/${orgId}/agents`)
      if (response.ok) {
        const data = await response.json()
        setAgents(data.agents)
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error)
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  function handleAgentUpdated(updatedAgent: Agent) {
    setAgents((prev) =>
      prev.map((a) => (a.id === updatedAgent.id ? updatedAgent : a))
    )
  }

  function handleAgentDeleted(agentId: string) {
    setAgents((prev) => prev.filter((a) => a.id !== agentId))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D9AA5]" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#070605]">
            AI Agents
          </h1>
          <p className="text-[#6B6560]">
            Manage your organization&apos;s AI agents and their capabilities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAgents}
            className="border-[#D4CFC7]"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-[#2D9AA5] hover:bg-[#1A7A82]"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#D4CFC7] rounded-lg p-4">
          <p className="text-sm text-[#6B6560]">Total Agents</p>
          <p className="text-2xl font-semibold text-[#070605]">{agents.length}</p>
        </div>
        <div className="bg-white border border-[#D4CFC7] rounded-lg p-4">
          <p className="text-sm text-[#6B6560]">Active</p>
          <p className="text-2xl font-semibold text-green-600">
            {agents.filter((a) => a.isActive).length}
          </p>
        </div>
        <div className="bg-white border border-[#D4CFC7] rounded-lg p-4">
          <p className="text-sm text-[#6B6560]">Inactive</p>
          <p className="text-2xl font-semibold text-gray-500">
            {agents.filter((a) => !a.isActive).length}
          </p>
        </div>
      </div>

      {/* Agent List */}
      <AgentList
        agents={agents}
        orgId={orgId}
        onAgentUpdated={handleAgentUpdated}
        onAgentDeleted={handleAgentDeleted}
      />

      {/* Create Dialog */}
      <CreateAgentDialog
        orgId={orgId}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onAgentCreated={fetchAgents}
      />
    </div>
  )
}