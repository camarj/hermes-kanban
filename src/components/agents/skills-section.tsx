"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, X, Sparkles, ExternalLink, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface AvailableSkill {
  id: string
  name: string
  description: string | null
  source: "custom" | "github" | "curated"
}

interface SkillsSectionProps {
  orgId: string
  orgSlug: string
  value: string[]
  onChange: (skills: string[]) => void
  disabled?: boolean
}

export function SkillsSection({
  orgId,
  orgSlug,
  value,
  onChange,
  disabled,
}: SkillsSectionProps) {
  const [available, setAvailable] = useState<AvailableSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/organizations/${orgId}/skills`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setAvailable(data.skills ?? [])
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orgId])

  function add(name: string) {
    if (value.includes(name)) return
    onChange([...value, name])
  }

  function remove(name: string) {
    onChange(value.filter((s) => s !== name))
  }

  const filtered = available.filter(
    (s) => !value.includes(s.name) && s.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Skills
        </label>
        <Link
          href={`/${orgSlug}/skills`}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Manage skills
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 min-h-8">
        {value.length === 0 && (
          <p className="text-xs text-muted-foreground">No skills attached yet.</p>
        )}
        {value.map((s) => (
          <Badge key={s} variant="secondary" className="gap-1">
            {s}
            <button
              type="button"
              onClick={() => remove(s)}
              aria-label={`Remove ${s}`}
              disabled={disabled}
              className="opacity-60 hover:opacity-100 disabled:opacity-30"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {!showPicker ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPicker(true)}
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add skill
        </Button>
      ) : (
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills..."
            disabled={disabled}
            autoFocus
            className="text-sm"
          />
          {loading ? (
            <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              Loading skills...
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 px-1">
              {available.length === 0
                ? "No skills installed in this org. Go to Skills to install some."
                : "No matches."}
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    add(s.name)
                    setSearch("")
                  }}
                  disabled={disabled}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-muted disabled:opacity-50 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-foreground">{s.name}</p>
                    {s.description && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{s.description}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[9px] flex-shrink-0">
                    {s.source}
                  </Badge>
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowPicker(false)
                setSearch("")
              }}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
