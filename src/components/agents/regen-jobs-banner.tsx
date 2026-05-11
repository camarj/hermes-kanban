"use client"

import { useEffect, useState } from "react"
import { Loader2, CheckCircle2, AlertCircle, RotateCw, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface RegenJob {
  id: string
  agentId: string
  reason: string
  status: "pending" | "running" | "deferred" | "done" | "failed"
  error: string | null
  attempts: number
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  agent: { id: string; name: string; hermesProfile: string }
}

interface RegenJobsBannerProps {
  orgId: string
}

export function RegenJobsBanner({ orgId }: RegenJobsBannerProps) {
  const [jobs, setJobs] = useState<RegenJob[]>([])
  const [retrying, setRetrying] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function tick() {
      try {
        const res = await fetch(`/api/organizations/${orgId}/regen-jobs`)
        const data = await res.json()
        if (cancelled) return
        const activeStatuses = new Set(["pending", "running", "deferred", "failed"])
        const filtered = (data.jobs ?? []).filter((j: RegenJob) =>
          activeStatuses.has(j.status),
        )
        setJobs(filtered)
      } catch {
        // best-effort polling
      } finally {
        if (!cancelled) {
          timer = setTimeout(tick, 3000)
        }
      }
    }
    tick()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [orgId])

  async function retry(jobId: string) {
    setRetrying(jobId)
    try {
      await fetch(`/api/organizations/${orgId}/regen-jobs/${jobId}/retry`, {
        method: "POST",
      })
    } finally {
      setRetrying(null)
    }
  }

  if (jobs.length === 0) return null

  const pending = jobs.filter((j) => j.status === "pending" || j.status === "running").length
  const deferred = jobs.filter((j) => j.status === "deferred").length
  const failed = jobs.filter((j) => j.status === "failed").length

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 mb-4">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 text-left"
      >
        {pending > 0 && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {pending === 0 && failed > 0 && <AlertCircle className="h-4 w-4 text-destructive" />}
        {pending === 0 && deferred > 0 && failed === 0 && <Clock className="h-4 w-4 text-primary" />}
        <span className="text-sm font-medium text-foreground">
          {pending > 0 && `Regenerating ${pending} agent${pending === 1 ? "" : "s"}`}
          {pending === 0 && deferred > 0 && `${deferred} agent${deferred === 1 ? "" : "s"} queued (waiting for tasks to finish)`}
          {pending === 0 && failed > 0 && `${failed} regeneration${failed === 1 ? "" : "s"} failed`}
        </span>
        <Badge variant="outline" className="text-[10px] ml-auto">
          {collapsed ? "Show" : "Hide"} details
        </Badge>
      </button>

      {!collapsed && (
        <div className="mt-3 space-y-1.5">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-card"
            >
              {job.status === "running" && <Loader2 className="h-3 w-3 animate-spin text-primary flex-shrink-0" />}
              {job.status === "pending" && <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
              {job.status === "deferred" && <Clock className="h-3 w-3 text-primary flex-shrink-0" />}
              {job.status === "failed" && <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />}
              {job.status === "done" && <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />}
              <span className="font-mono text-[10px] text-muted-foreground">
                {job.agent.name}
              </span>
              <Badge variant="outline" className="text-[9px] ml-1">
                {job.status}
              </Badge>
              <span className="text-[10px] text-muted-foreground ml-1 truncate">
                {job.reason}
              </span>
              {job.error && (
                <span className="text-[10px] text-destructive truncate ml-2 flex-1" title={job.error}>
                  {job.error}
                </span>
              )}
              {job.status === "failed" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] ml-auto"
                  disabled={retrying === job.id}
                  onClick={() => retry(job.id)}
                >
                  {retrying === job.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
                  Retry
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
