"use client"

import { useState, useEffect, useCallback } from "react"
import { Agent } from "@/lib/agents/types"
import { AgentList } from "@/components/agents/agent-list"
import { CreateAgentDialog } from "@/components/agents/create-agent-dialog"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw, Bot, Activity } from "lucide-react"

interface AgentsPageClientProps {
  orgId: string
  orgSlug: string
  orgName: string
  orgObjective?: string | null
}

export function AgentsPageClient({ 
  orgId, 
  orgSlug, 
  orgName, 
  orgObjective 
}: AgentsPageClientProps) {
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

  const ceoAgent = agents.find((a) => a.hermesProfile.includes("ceo"))
  const workerAgents = agents.filter((a) => !a.hermesProfile.includes("ceo"))
  const activeAgents = agents.filter((a) => a.isActive)
  const syncedAgents = agents.filter((a) => a.hermesProfileSynced)

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

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#D4CFC7] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="h-4 w-4 text-[#6B6560]" />
            <p className="text-sm text-[#6B6560]">Total Agents</p>
          </div>
          <p className="text-2xl font-semibold text-[#070605]">{agents.length}</p>
        </div>
        <div className="bg-white border border-[#D4CFC7] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-green-500" />
            <p className="text-sm text-[#6B6560]">Active</p>
          </div>
          <p className="text-2xl font-semibold text-green-600">
            {activeAgents.length}
          </p>
        </div>
        <div className="bg-white border border-[#D4CFC7] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-[#2D9AA5]" />
            <p className="text-sm text-[#6B6560]">Hermes Synced</p>
          </div>
          <p className="text-2xl font-semibold text-[#2D9AA5]">
            {syncedAgents.length}
          </p>
        </div>
        <div className="bg-white border border-[#D4CFC7] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="h-4 w-4 text-[#6B6560]" />
            <p className="text-sm text-[#6B6560]">Workers</p>
          </div>
          <p className="text-2xl font-semibold text-[#070605]">
            {workerAgents.length}
          </p>
        </div>
      </div>

      {ceoAgent && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[#070605] mb-3 flex items-center gap-2">
            <Bot className="h-5 w-5 text-[#2D9AA5]" />
            CEO Agent
          </h2>
          <AgentList
            agents={[ceoAgent]}
            orgId={orgId}
            onAgentUpdated={handleAgentUpdated}
            onAgentDeleted={handleAgentDeleted}
          />
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-[#070605] mb-3 flex items-center gap-2">
          <Bot className="h-5 w-5 text-[#2D9AA5]" />
          Worker Agents
        </h2>
        {workerAgents.length > 0 ? (
          <AgentList
            agents={workerAgents}
            orgId={orgId}
            onAgentUpdated={handleAgentUpdated}
            onAgentDeleted={handleAgentDeleted}
          />
        ) : (
          <div className="bg-white border border-[#D4CFC7] rounded-lg p-8 text-center">
            <Bot className="h-12 w-12 text-[#D4CFC7] mx-auto mb-3" />
            <p className="text-[#6B6560] mb-4">No worker agents yet</p>
            <Button
              onClick={() => setIsCreateOpen(true)}
              variant="outline"
              className="border-[#2D9AA5] text-[#2D9AA5] hover:bg-[#2D9AA5]/10"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create your first worker agent
            </Button>
          </div>
        )}
      </div>

      <CreateAgentDialog
        orgId={orgId}
        orgSlug={orgSlug}
        orgName={orgName}
        orgObjective={orgObjective}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onAgentCreated={fetchAgents}
        hasCeoAgent={agents.some((a) => a.hermesProfile.startsWith("ceo-"))}
      />
    </div>
  )
}
