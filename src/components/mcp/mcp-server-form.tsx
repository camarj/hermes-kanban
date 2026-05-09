"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { McpInput, McpTransport } from "@/lib/mcp/queries"

interface McpServerFormProps {
  initial?: Partial<McpInput>
  onSubmit: (input: McpInput) => void | Promise<void>
  onCancel: () => void
  submitting?: boolean
}

function envVarsToText(envVars: Record<string, string> = {}): string {
  return Object.entries(envVars)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n")
}

function parseEnvVars(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (key) out[key] = value
  }
  return out
}

export function McpServerForm({
  initial,
  onSubmit,
  onCancel,
  submitting = false,
}: McpServerFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [transport, setTransport] = useState<McpTransport>(initial?.transport ?? "stdio")
  const [command, setCommand] = useState(initial?.command ?? "")
  const [url, setUrl] = useState(initial?.url ?? "")
  const [envText, setEnvText] = useState(envVarsToText(initial?.envVars))
  const [toolsFilter, setToolsFilter] = useState<string[]>(initial?.toolsFilter ?? [])
  const [newTool, setNewTool] = useState("")
  const [error, setError] = useState<string | null>(null)

  const isValid =
    name.trim().length >= 2 &&
    ((transport === "stdio" && command.trim().length > 0) ||
      (transport === "http" && url.trim().length > 0))

  function addTool() {
    const t = newTool.trim()
    if (!t || toolsFilter.includes(t)) return
    setToolsFilter([...toolsFilter, t])
    setNewTool("")
  }

  function removeTool(t: string) {
    setToolsFilter(toolsFilter.filter((x) => x !== t))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        transport,
        command: transport === "stdio" ? command.trim() : undefined,
        url: transport === "http" ? url.trim() : undefined,
        envVars: parseEnvVars(envText),
        toolsFilter,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="mcp-name">Name *</Label>
        <Input
          id="mcp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. github-mcp"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mcp-transport">Transport *</Label>
        <select
          id="mcp-transport"
          value={transport}
          onChange={(e) => setTransport(e.target.value as McpTransport)}
          className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option value="stdio">stdio (local subprocess)</option>
          <option value="http">http (remote endpoint)</option>
        </select>
      </div>

      {transport === "stdio" && (
        <div className="space-y-2">
          <Label htmlFor="mcp-command">Command *</Label>
          <Input
            id="mcp-command"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="npx -y @modelcontextprotocol/server-github"
            className="font-mono text-xs"
          />
        </div>
      )}

      {transport === "http" && (
        <div className="space-y-2">
          <Label htmlFor="mcp-url">URL *</Label>
          <Input
            id="mcp-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/mcp"
            className="font-mono text-xs"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="mcp-env">Environment variables</Label>
        <Textarea
          id="mcp-env"
          value={envText}
          onChange={(e) => setEnvText(e.target.value)}
          placeholder={"GITHUB_TOKEN=ghp_xxx\nDEBUG=true"}
          rows={3}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          One per line: <code className="font-mono">KEY=value</code>. Lines starting with # are ignored.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Tools filter (optional)</Label>
        <div className="flex gap-2">
          <Input
            value={newTool}
            onChange={(e) => setNewTool(e.target.value)}
            placeholder="add a tool name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addTool()
              }
            }}
            className="font-mono text-xs"
          />
          <Button type="button" variant="outline" onClick={addTool}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {toolsFilter.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {toolsFilter.map((t) => (
              <Badge
                key={t}
                variant="secondary"
                className="font-mono text-[10px] cursor-pointer"
                onClick={() => removeTool(t)}
              >
                {t}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          If empty, all tools from the server are exposed to agents.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid || submitting}>
          {submitting ? "Saving..." : initial ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  )
}
