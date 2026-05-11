"use client"

import { useState } from "react"
import { Agent, ROLE_TYPES } from "@/lib/agents/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Bot, Power, Pencil, Trash2 } from "lucide-react"
import { EditAgentDialog } from "./edit-agent-dialog"

interface AgentListProps {
  agents: Agent[]
  orgId: string
  orgSlug: string
  onAgentUpdated?: (agent: Agent) => void
  onAgentDeleted?: (agentId: string) => void
}

export function AgentList({ agents, orgId, orgSlug, onAgentUpdated, onAgentDeleted }: AgentListProps) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [editing, setEditing] = useState<Agent | null>(null)

  async function toggleAgentStatus(agent: Agent) {
    setIsUpdating(agent.id)
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/agents/${agent.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !agent.isActive }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to update agent")
      }

      const data = await response.json()
      onAgentUpdated?.(data.agent)
    } catch (error) {
      console.error("Failed to toggle agent status:", error)
    } finally {
      setIsUpdating(null)
    }
  }

  async function deleteAgent(agent: Agent) {
    if (!confirm(`Are you sure you want to delete "${agent.name}"?`)) {
      return
    }

    try {
      const response = await fetch(
        `/api/organizations/${orgId}/agents/${agent.id}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error("Failed to delete agent")
      }

      onAgentDeleted?.(agent.id)
    } catch (error) {
      console.error("Failed to delete agent:", error)
    }
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-lg">
        <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No agents yet</h3>
        <p className="text-sm text-muted-foreground">
          Create your first AI agent to get started
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => {
        const roleType = agent.template?.roleType as keyof typeof ROLE_TYPES
        const roleConfig = ROLE_TYPES[roleType] || ROLE_TYPES.worker

        return (
          <Card
            key={agent.id}
            data-testid="agent-card"
            data-agent-id={agent.id}
            className={`border-border transition-colors ${
              !agent.isActive ? "opacity-60" : ""
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${roleConfig.color}20` }}
                  >
                    <Bot
                      className="h-5 w-5"
                      style={{ color: roleConfig.color }}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium text-foreground">
                      {agent.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{agent.hermesProfile}</p>
                  </div>
                </div>
                <Badge
                  variant={agent.isActive ? "default" : "secondary"}
                  className={
                    agent.isActive
                      ? "bg-success/10 text-success hover:bg-success/10"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {agent.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {agent.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {agent.description}
                </p>
              )}

              {/* Role Type */}
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-medium px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: `${roleConfig.color}20`,
                    color: roleConfig.color,
                  }}
                >
                  {roleConfig.label}
                </span>
                {agent.template && (
                  <span className="text-xs text-muted-foreground">
                    via {agent.template.name}
                  </span>
                )}
              </div>

              {/* Skills Preview */}
              {agent.skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {agent.skills.slice(0, 3).map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="text-xs bg-muted text-foreground"
                    >
                      {skill}
                    </Badge>
                  ))}
                  {agent.skills.length > 3 && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-muted text-muted-foreground"
                    >
                      +{agent.skills.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Power className="h-4 w-4 text-muted-foreground" />
                  <Switch
                    checked={agent.isActive}
                    onCheckedChange={() => toggleAgentStatus(agent)}
                    disabled={isUpdating === agent.id}
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditing(agent)}
                    aria-label={`Edit ${agent.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteAgent(agent)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {editing && (
        <EditAgentDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          orgId={orgId}
          orgSlug={orgSlug}
          agent={editing}
          onSaved={(updated) => onAgentUpdated?.(updated)}
        />
      )}
    </div>
  )
}