"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Plug, RefreshCw, Pencil, Trash2 } from "lucide-react"
import { McpServerForm } from "@/components/mcp/mcp-server-form"
import type { McpInput } from "@/lib/mcp/queries"

interface McpServerRow {
  id: string
  orgId: string
  name: string
  transport: string
  command: string | null
  url: string | null
  envVars: unknown
  toolsFilter: string[]
  createdAt: string
}

interface McpServersPageClientProps {
  orgId: string
}

export function McpServersPageClient({ orgId }: McpServersPageClientProps) {
  const [servers, setServers] = useState<McpServerRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<McpServerRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<McpServerRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchServers() {
    setIsLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/organizations/${orgId}/mcp-servers`)
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || "Failed to load")
      setServers(data.servers ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const r = await fetch(`/api/organizations/${orgId}/mcp-servers`)
        const data = await r.json()
        if (cancelled) return
        if (!r.ok) {
          setError(data.error || "Failed to load")
        } else {
          setServers(data.servers ?? [])
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [orgId])

  async function handleCreate(input: McpInput) {
    setSubmitting(true)
    try {
      const r = await fetch(`/api/organizations/${orgId}/mcp-servers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || "Failed to create")
      setCreateOpen(false)
      await fetchServers()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(input: McpInput) {
    if (!editing) return
    setSubmitting(true)
    try {
      const r = await fetch(`/api/organizations/${orgId}/mcp-servers/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || "Failed to update")
      setEditing(null)
      await fetchServers()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      const r = await fetch(`/api/organizations/${orgId}/mcp-servers/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!r.ok) {
        const data = await r.json()
        throw new Error(data.error || "Failed to delete")
      }
      setDeleteTarget(null)
      await fetchServers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">
            MCP Servers
          </h1>
          <p className="text-muted-foreground">
            Configure Model Context Protocol servers available to your agents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchServers}
            className="border-border"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            New MCP Server
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : servers.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Plug className="h-12 w-12 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">
            No MCP servers configured yet
          </p>
          <Button
            onClick={() => setCreateOpen(true)}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
          >
            <Plus className="mr-2 h-4 w-4" />
            Configure your first MCP server
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {servers.map((server) => (
            <div
              key={server.id}
              className="rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                    <Plug className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-foreground">{server.name}</h3>
                      <Badge variant="outline" className="text-[10px]">
                        {server.transport}
                      </Badge>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground mt-1 break-all">
                      {server.command || server.url}
                    </p>
                    {server.toolsFilter.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {server.toolsFilter.map((tool) => (
                          <Badge
                            key={tool}
                            variant="secondary"
                            className="font-mono text-[10px]"
                          >
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(server)}
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(server)}
                    aria-label="Delete"
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[560px] bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">New MCP Server</DialogTitle>
            <DialogDescription>
              Configure a Model Context Protocol server. Agents in this org can later opt-in.
            </DialogDescription>
          </DialogHeader>
          <McpServerForm
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            submitting={submitting}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[560px] bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit MCP Server</DialogTitle>
            <DialogDescription>{editing?.name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <McpServerForm
              initial={{
                name: editing.name,
                transport: editing.transport as "stdio" | "http",
                command: editing.command ?? undefined,
                url: editing.url ?? undefined,
                envVars: (editing.envVars as Record<string, string>) ?? {},
                toolsFilter: editing.toolsFilter,
              }}
              onSubmit={handleEdit}
              onCancel={() => setEditing(null)}
              submitting={submitting}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete MCP server?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{deleteTarget?.name}</strong> from this organization.
              Agents using it will stop receiving its tools.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {submitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
