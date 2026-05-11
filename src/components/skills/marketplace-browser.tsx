"use client"

import { useEffect, useState } from "react"
import { Sparkles, Check, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface MarketplaceSkill {
  id: string
  name: string
  description: string | null
  triggers: string[]
}

interface MarketplaceBrowserProps {
  orgId: string
  installedSkillNames: Set<string>
  onInstalled: () => void
}

export function MarketplaceBrowser({
  orgId,
  installedSkillNames,
  onInstalled,
}: MarketplaceBrowserProps) {
  const [skills, setSkills] = useState<MarketplaceSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/skills/marketplace")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setSkills(data.skills ?? [])
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load marketplace")
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function install(skillId: string) {
    setInstalling(skillId)
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${orgId}/skills/install-curated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Install failed")
      onInstalled()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Install failed")
    } finally {
      setInstalling(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading marketplace...
      </div>
    )
  }

  if (skills.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
        <Sparkles className="h-6 w-6 text-muted-foreground/60 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No curated skills available yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {skills.map((skill) => {
          const installed = installedSkillNames.has(skill.name)
          return (
            <div
              key={skill.id}
              className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm text-foreground font-mono">{skill.name}</h3>
                  {installed && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Check className="h-3 w-3" />
                      Installed
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {skill.description}
                </p>
              </div>

              {skill.triggers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {skill.triggers.slice(0, 4).map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="mt-auto">
                <Button
                  variant={installed ? "ghost" : "default"}
                  size="sm"
                  className="w-full"
                  disabled={installed || installing === skill.id}
                  onClick={() => install(skill.id)}
                >
                  {installing === skill.id ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      Installing...
                    </>
                  ) : installed ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Installed
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Install to org
                    </>
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
