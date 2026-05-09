"use client"

import { useState } from "react"
import { ChatPanel } from "./chat-panel"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, MessageSquare } from "lucide-react"
import { ROLE_TYPES } from "@/lib/agents/types"
import type { Agent } from "@/lib/agents/types"

interface ChatPageClientProps {
  orgId: string
  orgSlug: string
  initialAgents: Agent[]
}

export function ChatPageClient({ orgId, orgSlug, initialAgents }: ChatPageClientProps) {
  const [agents] = useState<Agent[]>(initialAgents)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(() => {
    const ceoAgent = initialAgents.find(
      (a) => a.template?.roleType === "ceo" || a.hermesProfile.includes("ceo")
    )
    return ceoAgent?.id || null
  })

  const selectedAgent = agents.find((a) => a.id === selectedAgentId)

  if (agents.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-foreground">
              Agent Chat
            </h1>
            <p className="text-muted-foreground">
              Select an agent to start a conversation
            </p>
          </div>
        </div>

        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No agents available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a CEO agent first to start chatting.
            </p>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={() => { window.location.href = `/${orgSlug}/agents` }}
            >
              Go to Agents
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!selectedAgent) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-foreground">
              Agent Chat
            </h1>
            <p className="text-muted-foreground">
              Select an agent to start a conversation
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-foreground">Select agent:</label>
            <Select value={selectedAgentId || ""} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="w-64 border-border">
                <SelectValue placeholder="Choose an agent..." />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => {
                  const roleType = agent.template?.roleType as keyof typeof ROLE_TYPES
                  const roleConfig = ROLE_TYPES[roleType] || ROLE_TYPES.worker
                  return (
                    <SelectItem key={agent.id} value={agent.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: roleConfig.color }} />
                        {agent.name}
                        <span className="text-xs text-muted-foreground">({roleConfig.label})</span>
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => {
              const roleType = agent.template?.roleType as keyof typeof ROLE_TYPES
              const roleConfig = ROLE_TYPES[roleType] || ROLE_TYPES.worker
              return (
                <Card
                  key={agent.id}
                  className={`border-border cursor-pointer hover:border-primary transition-all ${
                    selectedAgentId === agent.id ? "border-primary ring-2 ring-primary/20" : ""
                  }`}
                  onClick={() => setSelectedAgentId(agent.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${roleConfig.color}20` }}
                      >
                        <Bot className="h-5 w-5" style={{ color: roleConfig.color }} />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{agent.name}</h3>
                        <p className="text-xs text-muted-foreground">{agent.hermesProfile}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      style={{ borderColor: roleConfig.color, color: roleConfig.color }}
                    >
                      {roleConfig.label}
                    </Badge>
                    {agent.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{agent.description}</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {selectedAgentId && (
            <div className="flex justify-end">
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => {}}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Start Chat
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <ChatPanel
        orgId={orgId}
        orgSlug={orgSlug}
        profile={selectedAgent.hermesProfile}
        agentName={selectedAgent.name}
        onBack={() => setSelectedAgentId(null)}
      />
    </div>
  )
}