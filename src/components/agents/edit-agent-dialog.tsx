"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Bot, Lock, AlertCircle, Loader2, CheckCircle2, Clock } from "lucide-react"
import { McpServerSelector, type McpServerOption } from "@/components/mcp/mcp-server-selector"
import { SkillsSection } from "./skills-section"
import type { Agent } from "@/lib/agents/types"

interface EditAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  orgSlug: string
  agent: Agent
  onSaved?: (agent: Agent) => void
}

interface RegenResultLite {
  status: "regenerated" | "deferred" | "error"
  profileName?: string
  method?: "cli" | "filesystem"
  jobId?: string
  error?: string
}

export function EditAgentDialog({
  open,
  onOpenChange,
  orgId,
  orgSlug,
  agent,
  onSaved,
}: EditAgentDialogProps) {
  const [name, setName] = useState(agent.name)
  const [description, setDescription] = useState(agent.description ?? "")
  const [soulContent, setSoulContent] = useState(agent.soulContent ?? "")
  const [skills, setSkills] = useState<string[]>(agent.skills)
  const [selectedMcpIds, setSelectedMcpIds] = useState<string[]>(agent.mcpServerIds ?? [])
  const [mcpServers, setMcpServers] = useState<McpServerOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [regen, setRegen] = useState<RegenResultLite | null>(null)

  // Load MCP servers when the dialog opens
  // Note: keep this outside useEffect to satisfy the React 19 set-state-in-effect rule.
  // We trigger fetch once via onOpenChange + initial render.
  async function loadMcps() {
    try {
      const res = await fetch(`/api/organizations/${orgId}/mcp-servers`)
      const data = await res.json()
      setMcpServers(data.servers ?? [])
    } catch {
      // best-effort
    }
  }

  // Trigger load on first render if open
  if (open && mcpServers.length === 0) {
    void loadMcps()
  }

  const isWorker = agent.template?.roleType === "worker"

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setRegen(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/organizations/${orgId}/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          soulContent: soulContent.trim() || null,
          skills,
          mcpServerIds: isWorker ? selectedMcpIds : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Update failed")
      }
      setRegen(data.regen ?? null)
      onSaved?.(data.agent)
      // keep dialog open briefly to show regen status if deferred
      if (!data.regen || data.regen.status === "regenerated") {
        setTimeout(() => onOpenChange(false), 800)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Edit agent
          </DialogTitle>
          <DialogDescription>
            Changes will regenerate the Hermes profile. Role and template are locked.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Locked</span>
              <Badge variant="outline" className="text-[10px]">
                {agent.template?.roleType ?? "worker"}
              </Badge>
              {agent.template && (
                <Badge variant="outline" className="text-[10px]">
                  {agent.template.name}
                </Badge>
              )}
              <span className="font-mono text-[10px] text-muted-foreground ml-auto">
                {agent.hermesProfile}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-name">Name</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-description">Description</Label>
            <Input
              id="agent-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this agent does"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-soul">SOUL (custom prompt)</Label>
            <Textarea
              id="agent-soul"
              value={soulContent}
              onChange={(e) => setSoulContent(e.target.value)}
              placeholder="Leave empty to use the default for this role/template."
              rows={8}
              disabled={submitting}
              className="font-mono text-xs"
            />
          </div>

          <SkillsSection
            orgId={orgId}
            orgSlug={orgSlug}
            value={skills}
            onChange={setSkills}
            disabled={submitting}
          />

          {isWorker && (
            <div className="space-y-2">
              <Label>MCP servers</Label>
              <McpServerSelector
                servers={mcpServers}
                selectedIds={selectedMcpIds}
                onChange={setSelectedMcpIds}
                orgSlug={orgSlug}
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {regen && (
            <div
              className={
                "rounded-lg border p-3 text-sm flex items-start gap-2 " +
                (regen.status === "regenerated"
                  ? "border-success/40 bg-success/10 text-success"
                  : regen.status === "deferred"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-destructive/40 bg-destructive/10 text-destructive")
              }
            >
              {regen.status === "regenerated" && <CheckCircle2 className="h-4 w-4 mt-0.5" />}
              {regen.status === "deferred" && <Clock className="h-4 w-4 mt-0.5" />}
              {regen.status === "error" && <AlertCircle className="h-4 w-4 mt-0.5" />}
              <div>
                {regen.status === "regenerated" && (
                  <>Hermes profile regenerated ({regen.method}).</>
                )}
                {regen.status === "deferred" && (
                  <>Agent is busy with a task. Regeneration queued (job {regen.jobId?.slice(0, 8)}). Will run when the agent finishes.</>
                )}
                {regen.status === "error" && (
                  <>Regeneration failed: {regen.error}</>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                "Save & regenerate"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
