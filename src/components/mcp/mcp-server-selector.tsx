"use client"

import Link from "next/link"
import { Plug, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export interface McpServerOption {
  id: string
  name: string
  transport: "stdio" | "http"
  command: string | null
  url: string | null
  envVars: Record<string, string>
  toolsFilter: string[]
}

interface McpServerSelectorProps {
  servers: McpServerOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  orgSlug: string
}

export function McpServerSelector({
  servers,
  selectedIds,
  onChange,
  orgSlug,
}: McpServerSelectorProps) {
  if (servers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
        <Plug className="h-6 w-6 text-muted-foreground/60 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-2">
          No MCP servers configured for this organization yet.
        </p>
        <Link
          href={`/${orgSlug}/mcp-servers`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus className="h-3 w-3" />
          Configure MCP servers
        </Link>
      </div>
    )
  }

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div className="space-y-2">
      {servers.map((server) => {
        const checked = selectedIds.includes(server.id)
        return (
          <label
            key={server.id}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 cursor-pointer hover:border-primary/40 transition-colors"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(server.id)}
              aria-label={server.name}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Plug className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">{server.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {server.transport}
                </Badge>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground mt-1 truncate">
                {server.command || server.url}
              </p>
            </div>
          </label>
        )
      })}
    </div>
  )
}
