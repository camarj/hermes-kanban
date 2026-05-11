"use client"

import { useState } from "react"
import { Sparkles, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

export interface SkillEditorValue {
  name: string
  description: string
  triggers: string[]
  userInvocable: boolean
  body: string
  toolsYaml: string
  hooksYaml: string
  requirementsTxt: string
}

interface SkillEditorProps {
  initial?: Partial<SkillEditorValue>
  lockName?: boolean
  onSubmit: (files: Array<{ path: string; content: string }>, value: SkillEditorValue) => Promise<void> | void
  onCancel?: () => void
  submitting?: boolean
}

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function SkillEditor({
  initial,
  lockName,
  onSubmit,
  onCancel,
  submitting,
}: SkillEditorProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [triggers, setTriggers] = useState<string[]>(initial?.triggers ?? [])
  const [triggerInput, setTriggerInput] = useState("")
  const [userInvocable, setUserInvocable] = useState(initial?.userInvocable ?? true)
  const [body, setBody] = useState(initial?.body ?? "")
  const [advanced, setAdvanced] = useState(false)
  const [toolsYaml, setToolsYaml] = useState(initial?.toolsYaml ?? "")
  const [hooksYaml, setHooksYaml] = useState(initial?.hooksYaml ?? "")
  const [requirementsTxt, setRequirementsTxt] = useState(initial?.requirementsTxt ?? "")
  const [error, setError] = useState<string | null>(null)
  // Note: re-mount the editor with `key` on the parent if you need to swap `initial`;
  // we deliberately do not sync `initial` into state via useEffect to keep React 19 happy.

  function addTrigger() {
    const t = triggerInput.trim()
    if (!t) return
    if (triggers.includes(t)) {
      setTriggerInput("")
      return
    }
    setTriggers([...triggers, t])
    setTriggerInput("")
  }

  function removeTrigger(t: string) {
    setTriggers(triggers.filter((x) => x !== t))
  }

  function buildSkillMd(): string {
    const lines: string[] = ["---"]
    lines.push(`name: ${name}`)
    const descNeedsQuote =
      description.includes(":") || description.includes("#") || description.includes('"')
    lines.push(`description: ${descNeedsQuote ? JSON.stringify(description) : description}`)
    if (triggers.length > 0) {
      lines.push(`triggers: [${triggers.map((t) => JSON.stringify(t)).join(", ")}]`)
    }
    if (!userInvocable) lines.push("user-invocable: false")
    lines.push("---", "")
    lines.push(body)
    return lines.join("\n")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!NAME_PATTERN.test(name)) {
      setError("Name must be kebab-case lowercase (e.g. my-skill).")
      return
    }
    if (description.trim().length < 8) {
      setError("Description must be at least 8 characters.")
      return
    }

    const files: Array<{ path: string; content: string }> = [
      { path: "SKILL.md", content: buildSkillMd() },
    ]
    if (advanced) {
      if (toolsYaml.trim()) files.push({ path: "tools.yaml", content: toolsYaml })
      if (hooksYaml.trim()) files.push({ path: "hooks.yaml", content: hooksYaml })
      if (requirementsTxt.trim())
        files.push({ path: "requirements.txt", content: requirementsTxt })
    }

    try {
      await onSubmit(files, {
        name,
        description,
        triggers,
        userInvocable,
        body,
        toolsYaml,
        hooksYaml,
        requirementsTxt,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save skill")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="skill-name">Name (kebab-case)</Label>
        <Input
          id="skill-name"
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase())}
          placeholder="my-skill"
          disabled={lockName || submitting}
          className="font-mono text-sm"
          aria-invalid={name.length > 0 && !NAME_PATTERN.test(name)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Lowercase letters, numbers and hyphens. This is the directory name Hermes uses.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="skill-desc">Description</Label>
        <Input
          id="skill-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="One sentence: what this skill does."
          disabled={submitting}
          maxLength={280}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Triggers (optional)</Label>
        <div className="flex flex-wrap gap-2">
          {triggers.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1">
              {t}
              <button
                type="button"
                onClick={() => removeTrigger(t)}
                aria-label={`Remove ${t}`}
                className="opacity-60 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={triggerInput}
            onChange={(e) => setTriggerInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addTrigger()
              }
            }}
            placeholder="Add a trigger keyword"
            disabled={submitting}
            className="font-mono text-sm"
          />
          <Button type="button" variant="outline" size="sm" onClick={addTrigger} disabled={submitting}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="user-invocable"
          type="checkbox"
          checked={userInvocable}
          onChange={(e) => setUserInvocable(e.target.checked)}
          disabled={submitting}
          className="h-4 w-4 rounded border-border text-primary"
        />
        <Label htmlFor="user-invocable" className="text-sm">
          User-invocable (the agent can call this skill on demand)
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="skill-body">SKILL.md body (Markdown)</Label>
        <Textarea
          id="skill-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={"# Skill body\n\nInstructions, examples, references."}
          disabled={submitting}
          rows={12}
          className="font-mono text-xs"
        />
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <button
          type="button"
          onClick={() => setAdvanced(!advanced)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          disabled={submitting}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {advanced ? "Hide advanced files" : "Show advanced files (tools.yaml, hooks.yaml, requirements.txt)"}
        </button>

        {advanced && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tools-yaml" className="text-xs font-mono">tools.yaml</Label>
              <Textarea
                id="tools-yaml"
                value={toolsYaml}
                onChange={(e) => setToolsYaml(e.target.value)}
                placeholder="tools:\n  - name: my_tool\n    description: ..."
                disabled={submitting}
                rows={5}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hooks-yaml" className="text-xs font-mono">hooks.yaml</Label>
              <Textarea
                id="hooks-yaml"
                value={hooksYaml}
                onChange={(e) => setHooksYaml(e.target.value)}
                placeholder="hooks:\n  on_start: ..."
                disabled={submitting}
                rows={5}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requirements-txt" className="text-xs font-mono">requirements.txt</Label>
              <Textarea
                id="requirements-txt"
                value={requirementsTxt}
                onChange={(e) => setRequirementsTxt(e.target.value)}
                placeholder="requests==2.31.0"
                disabled={submitting}
                rows={3}
                className="font-mono text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save skill"}
        </Button>
      </div>
    </form>
  )
}
