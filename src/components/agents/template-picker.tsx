"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { WORKER_SPECIALIZATIONS, type WorkerSpecialization } from "@/lib/agents/types"
import type { TemplateOption } from "@/lib/agents/list-templates"

interface TemplatePickerProps {
  templates: TemplateOption[]
  roleType: "ceo" | "c-level" | "worker"
  selectedId: string | null
  onSelect: (template: TemplateOption) => void
  grouped?: boolean
}

const DEPARTMENT_ORDER = ["technology", "finance", "marketing", "operations"]
const DEPARTMENT_LABELS: Record<string, string> = {
  technology: "Technology",
  finance: "Finance",
  marketing: "Marketing",
  operations: "Operations",
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: TemplateOption
  selected: boolean
  onSelect: (t: TemplateOption) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(template)}
      className={cn(
        "group flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-all",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-serif text-base font-semibold text-foreground leading-tight">
            {template.displayName}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {template.description}
          </p>
        </div>
        {template.source === "db" && template.orgId && (
          <Badge variant="outline" className="flex-shrink-0">
            Custom
          </Badge>
        )}
      </div>

      {template.defaultSkills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {template.defaultSkills.slice(0, 4).map((skill) => (
            <Badge key={skill} variant="secondary" className="text-[10px] font-mono">
              {skill}
            </Badge>
          ))}
        </div>
      )}
    </button>
  )
}

export function TemplatePicker({
  templates,
  roleType,
  selectedId,
  onSelect,
  grouped = false,
}: TemplatePickerProps) {
  const filtered = templates.filter((t) => t.roleType === roleType)

  if (!grouped || roleType !== "worker") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((tpl) => (
          <TemplateCard
            key={tpl.id}
            template={tpl}
            selected={selectedId === tpl.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    )
  }

  const byDept = new Map<string, TemplateOption[]>()
  const orphans: TemplateOption[] = []

  for (const tpl of filtered) {
    const spec = tpl.specialization as WorkerSpecialization | undefined
    const dept = spec ? WORKER_SPECIALIZATIONS[spec]?.department : null
    if (dept) {
      const list = byDept.get(dept) ?? []
      list.push(tpl)
      byDept.set(dept, list)
    } else {
      orphans.push(tpl)
    }
  }

  return (
    <div className="space-y-5">
      {DEPARTMENT_ORDER.filter((d) => byDept.has(d)).map((dept) => (
        <div key={dept} className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {DEPARTMENT_LABELS[dept]}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {byDept.get(dept)!.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                selected={selectedId === tpl.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ))}
      {orphans.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Other
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {orphans.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                selected={selectedId === tpl.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
