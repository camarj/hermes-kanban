"use client"

import { useState, useEffect, useCallback } from "react"
import { Agent } from "@/lib/agents/types"
import { AgentList } from "@/components/agents/agent-list"
import { CreateAgentDialog } from "@/components/agents/create-agent-dialog"
import { RegenJobsBanner } from "@/components/agents/regen-jobs-banner"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw, Bot, Activity, AlertCircle } from "lucide-react"

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
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

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

  async function handleSyncProfiles() {
    setIsSyncing(true)
    setSyncError(null)
    try {
      const response = await fetch(`/api/organizations/${orgId}/sync-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await response.json()
      if (!response.ok) {
        setSyncError(data.error || "No se pudo sincronizar")
      } else {
        await fetchAgents()
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Error de red")
    } finally {
      setIsSyncing(false)
    }
  }

  const ceoAgent = agents.find((a) => a.hermesProfile.includes("ceo"))
  const workerAgents = agents.filter((a) => !a.hermesProfile.includes("ceo"))
  const activeAgents = agents.filter((a) => a.isActive)
  const syncedAgents = agents.filter((a) => a.hermesProfileSynced)
  const ceoNeedsSync = ceoAgent && !ceoAgent.hermesProfileSynced

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div>
      <RegenJobsBanner orgId={orgId} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">
            AI Agents
          </h1>
          <p className="text-muted-foreground">
            Manage your organization&apos;s AI agents and their capabilities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAgents}
            className="border-border"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </Button>
        </div>
      </div>

      {ceoNeedsSync && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              CEO Agent sin sincronizar con Hermes
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              El profile no se creó en el gateway (probablemente estaba caído al crear la organización). El chat con el CEO no funciona hasta que se sincronice.
            </p>
            {syncError && (
              <p className="text-sm text-destructive mt-2">{syncError}</p>
            )}
          </div>
          <Button
            onClick={handleSyncProfiles}
            disabled={isSyncing}
            variant="outline"
            size="sm"
            className="border-warning/40 text-foreground hover:bg-warning/15"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Total Agents</p>
          </div>
          <p className="text-2xl font-semibold text-foreground">{agents.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-success" />
            <p className="text-sm text-muted-foreground">Active</p>
          </div>
          <p className="text-2xl font-semibold text-success">
            {activeAgents.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">Hermes Synced</p>
          </div>
          <p className="text-2xl font-semibold text-primary">
            {syncedAgents.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Workers</p>
          </div>
          <p className="text-2xl font-semibold text-foreground">
            {workerAgents.length}
          </p>
        </div>
      </div>

      {ceoAgent && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            CEO Agent
          </h2>
          <AgentList
            agents={[ceoAgent]}
            orgId={orgId}
            orgSlug={orgSlug}
            onAgentUpdated={handleAgentUpdated}
            onAgentDeleted={handleAgentDeleted}
          />
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Worker Agents
        </h2>
        {workerAgents.length > 0 ? (
          <AgentList
            agents={workerAgents}
            orgId={orgId}
            orgSlug={orgSlug}
            onAgentUpdated={handleAgentUpdated}
            onAgentDeleted={handleAgentDeleted}
          />
        ) : (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <Bot className="h-12 w-12 text-muted-foreground/60 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No worker agents yet</p>
            <Button
              onClick={() => setIsCreateOpen(true)}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
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
