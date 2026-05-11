"use client"

import { useEffect, useState } from "react"
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  GitBranch,
  Code,
  Bookmark,
  Users,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { SkillEditor, type SkillEditorValue } from "./skill-editor"
import { MarketplaceBrowser } from "./marketplace-browser"
import { GithubSkillInstaller } from "./github-skill-installer"
import { parseSkillMd } from "@/lib/skills/parse-skill-md"

interface Skill {
  id: string
  name: string
  description: string | null
  source: "custom" | "github" | "curated"
  sourceUrl: string | null
  sourceRef: string | null
  version: string
  triggers: string[]
  userInvocable: boolean
  files: Array<{ path: string; content: string }>
  orgId: string | null
  isPublic: boolean
  createdAt: string
}

interface SkillsPageClientProps {
  orgId: string
}

type Tab = "installed" | "marketplace"

export function SkillsPageClient({ orgId }: SkillsPageClientProps) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("installed")
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Skill | null>(null)
  const [deleting, setDeleting] = useState<Skill | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteBlockedReason, setDeleteBlockedReason] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch(`/api/organizations/${orgId}/skills`)
      const data = await res.json()
      setSkills(data.skills ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load skills")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (cancelled) return
      await refresh()
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  async function handleCreate(
    files: Array<{ path: string; content: string }>,
    value: SkillEditorValue,
  ) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${orgId}/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value.name, files }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Create failed")
      setCreating(false)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed")
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(
    skill: Skill,
    files: Array<{ path: string; content: string }>,
  ) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${orgId}/skills/${skill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Update failed")
      setEditing(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed")
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      const res = await fetch(`/api/organizations/${orgId}/skills/${deleting.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (res.status === 409 && data.agentsUsing) {
        setDeleteBlockedReason(
          `Cannot delete: in use by ${data.agentsUsing.map((a: { name: string }) => a.name).join(", ")}`,
        )
        return
      }
      if (!res.ok) throw new Error(data.error || "Delete failed")
      setDeleting(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    }
  }

  const installedSkills = skills.filter((s) => s.orgId === orgId)
  const installedNames = new Set(installedSkills.map((s) => s.name))

  function initialFromSkill(skill: Skill): Partial<SkillEditorValue> {
    const skillMd = skill.files.find((f) => f.path === "SKILL.md")
    const parsed = skillMd ? parseSkillMd(skillMd.content) : null
    const body = parsed?.ok ? parsed.value.body : ""
    const tools = skill.files.find((f) => f.path === "tools.yaml")?.content ?? ""
    const hooks = skill.files.find((f) => f.path === "hooks.yaml")?.content ?? ""
    const reqs = skill.files.find((f) => f.path === "requirements.txt")?.content ?? ""
    return {
      name: skill.name,
      description: skill.description ?? "",
      triggers: skill.triggers,
      userInvocable: skill.userInvocable,
      body,
      toolsYaml: tools,
      hooksYaml: hooks,
      requirementsTxt: reqs,
    }
  }

  function sourceIcon(source: Skill["source"]) {
    if (source === "github") return <GitBranch className="h-3 w-3" />
    if (source === "curated") return <Bookmark className="h-3 w-3" />
    return <Code className="h-3 w-3" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Skills
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage skills that your agents can use. Create custom skills, install from the marketplace, or pull from GitHub.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New skill
        </Button>
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setTab("installed")}
          className={
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors " +
            (tab === "installed"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground")
          }
        >
          Installed ({installedSkills.length})
        </button>
        <button
          onClick={() => setTab("marketplace")}
          className={
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors " +
            (tab === "marketplace"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground")
          }
        >
          Marketplace
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {tab === "installed" && (
        <div className="space-y-4">
          <GithubSkillInstaller orgId={orgId} onInstalled={refresh} />

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading skills...
            </div>
          ) : installedSkills.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
              <Sparkles className="h-6 w-6 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No skills installed yet. Create one or browse the marketplace.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {installedSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-mono text-sm text-foreground truncate">{skill.name}</p>
                        <Badge variant="outline" className="text-[10px] gap-1 flex-shrink-0">
                          {sourceIcon(skill.source)}
                          {skill.source}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {skill.description}
                    </p>
                  </div>
                  {skill.triggers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {skill.triggers.slice(0, 5).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditing(skill)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setDeleting(skill)
                        setDeleteBlockedReason(null)
                      }}
                      aria-label={`Delete ${skill.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "marketplace" && (
        <MarketplaceBrowser
          orgId={orgId}
          installedSkillNames={installedNames}
          onInstalled={refresh}
        />
      )}

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">New skill</DialogTitle>
            <DialogDescription>
              Skills are bundled with the agent profile and follow the Hermes SKILL.md format.
            </DialogDescription>
          </DialogHeader>
          <SkillEditor
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
            submitting={submitting}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit skill</DialogTitle>
            <DialogDescription>
              Saving will re-trigger profile regeneration for every agent using this skill.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <SkillEditor
              key={editing.id}
              initial={initialFromSkill(editing)}
              lockName
              onSubmit={(files) => handleEdit(editing, files)}
              onCancel={() => setEditing(null)}
              submitting={submitting}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete skill</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteBlockedReason ? (
                <span className="flex items-start gap-2 text-destructive">
                  <Users className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  {deleteBlockedReason}
                </span>
              ) : (
                <>This will permanently delete the skill <span className="font-mono">{deleting?.name}</span>. Agents using it cannot regen until the skill is replaced.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!deleteBlockedReason && (
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
