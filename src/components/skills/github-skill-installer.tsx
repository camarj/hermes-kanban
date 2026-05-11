"use client"

import { useState } from "react"
import { GitBranch, Search, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface GithubSkillInstallerProps {
  orgId: string
  onInstalled: () => void
}

interface PreviewSkill {
  name: string
  description: string
  sourceUrl: string
  sourceRef: string
}

export function GithubSkillInstaller({ orgId, onInstalled }: GithubSkillInstallerProps) {
  const [url, setUrl] = useState("")
  const [preview, setPreview] = useState<PreviewSkill | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runPreview() {
    setPreviewing(true)
    setError(null)
    setPreview(null)
    try {
      const res = await fetch(
        `/api/organizations/${orgId}/skills/install-github?dryRun=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to preview")
      setPreview(data.skill)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview")
    } finally {
      setPreviewing(false)
    }
  }

  async function runInstall() {
    setInstalling(true)
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${orgId}/skills/install-github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Install failed")
      onInstalled()
      setPreview(null)
      setUrl("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Install failed")
    } finally {
      setInstalling(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div>
        <h3 className="font-medium text-sm text-foreground flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Install from GitHub
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Paste a GitHub repo URL containing a SKILL.md (e.g. <span className="font-mono">https://github.com/inteliside/hermes-skills/tree/main/react-patterns</span>).
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="github-url" className="text-xs">Repository URL</Label>
        <div className="flex gap-2">
          <Input
            id="github-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            disabled={previewing || installing}
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={runPreview}
            disabled={!url.trim() || previewing || installing}
          >
            {previewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Preview
          </Button>
        </div>
      </div>

      {preview && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-sm text-foreground">{preview.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{preview.description}</p>
            </div>
            <Button type="button" size="sm" onClick={runInstall} disabled={installing}>
              {installing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Download className="h-3.5 w-3.5 mr-1" />}
              Install
            </Button>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground">
            commit {preview.sourceRef.slice(0, 7)} · <a href={preview.sourceUrl} target="_blank" rel="noopener" className="hover:underline">{preview.sourceUrl}</a>
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  )
}
