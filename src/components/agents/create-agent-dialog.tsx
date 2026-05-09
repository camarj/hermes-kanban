"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Bot, Cpu, Zap, AlertCircle, CheckCircle2 } from "lucide-react"
import { TemplatePicker } from "@/components/agents/template-picker"
import type { TemplateOption } from "@/lib/agents/list-templates"
import { C_LEVEL_ROLES } from "@/lib/agents/types"

type RoleType = "ceo" | "c-level" | "worker"

interface CreateAgentDialogProps {
  orgId: string
  orgSlug: string
  orgName: string
  orgObjective?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAgentCreated?: () => void
  hasCeoAgent?: boolean
}

const ROLE_LEVEL_INFO: Record<RoleType, { label: string; description: string; color: string }> = {
  ceo: { label: "CEO", description: "Strategic leader — bridges partners and C-suite", color: "#2D9AA5" },
  "c-level": { label: "C-Level", description: "Department orchestrator — plans and delegates to specialists", color: "#3B82F6" },
  worker: { label: "Specialist", description: "Executes specific tasks — coding, analysis, content, etc.", color: "#6B6560" },
}

export function CreateAgentDialog({
  orgId,
  orgSlug,
  orgName,
  orgObjective,
  open,
  onOpenChange,
  onAgentCreated,
  hasCeoAgent = false,
}: CreateAgentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<"level" | "template" | "details">("level")
  const [error, setError] = useState<string | null>(null)

  const [roleType, setRoleType] = useState<RoleType>("worker")
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [soulContent, setSoulContent] = useState("")
  const [skills, setSkills] = useState<string[]>([])
  const [newSkill, setNewSkill] = useState("")
  const [createHermesProfile, setCreateHermesProfile] = useState(true)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const loadTemplates = async () => {
      setTemplatesLoading(true)
      try {
        const r = await fetch(`/api/organizations/${orgId}/agent-templates`)
        const data = await r.json()
        if (!cancelled && data?.templates) {
          const all = [
            ...data.templates.ceo,
            ...data.templates.cLevel,
            ...data.templates.worker,
          ] as TemplateOption[]
          setTemplates(all)
        }
      } catch {
        // fetch failed — keep empty list, error surfaces on submit
      } finally {
        if (!cancelled) setTemplatesLoading(false)
      }
    }
    loadTemplates()
    return () => {
      cancelled = true
    }
  }, [open, orgId])

  function resetForm() {
    setStep("level")
    setRoleType("worker")
    setSelectedTemplate(null)
    setName("")
    setDescription("")
    setSoulContent("")
    setSkills([])
    setNewSkill("")
    setCreateHermesProfile(true)
    setError(null)
  }

  function applyTemplate(tpl: TemplateOption) {
    setSelectedTemplate(tpl)
    setName(tpl.displayName)
    setDescription(`${tpl.description} for ${orgName}`)
    setSkills(tpl.defaultSkills)
    setSoulContent("")
  }

  function handleLevelNext() {
    if (roleType === "ceo" && hasCeoAgent) {
      setError("This organization already has a CEO agent")
      return
    }
    setError(null)
    const ceoTemplate = templates.find((t) => t.roleType === "ceo")
    if (roleType === "ceo" && ceoTemplate) {
      applyTemplate(ceoTemplate)
      setStep("details")
    } else {
      setSelectedTemplate(null)
      setStep("template")
    }
  }

  function handleTemplateNext() {
    if (!selectedTemplate) {
      setError("Select a template to continue")
      return
    }
    setError(null)
    setStep("details")
  }

  function addSkill() {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill("")
    }
  }

  function removeSkill(skill: string) {
    setSkills(skills.filter((s) => s !== skill))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !selectedTemplate) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/organizations/${orgId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          soulContent: soulContent.trim() || undefined,
          skills,
          tools: selectedTemplate.defaultTools,
          toolsets: selectedTemplate.defaultToolsets,
          roleType: selectedTemplate.roleType,
          cLevelRole: selectedTemplate.cLevelRole,
          specialization: selectedTemplate.specialization,
          templateId: selectedTemplate.source === "db" ? selectedTemplate.id : undefined,
          createHermesProfile,
          isActive: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create agent")
      }

      resetForm()
      onOpenChange(false)
      onAgentCreated?.()

      if (data.hermesProfileError) {
        console.warn("Hermes profile creation warning:", data.hermesProfileError)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent")
    } finally {
      setIsLoading(false)
    }
  }

  const getProfilePreview = () => {
    if (!selectedTemplate) return ""
    if (selectedTemplate.roleType === "ceo") return `ceo-${orgSlug}`
    if (selectedTemplate.roleType === "c-level")
      return `clevel-${orgSlug}-${name.toLowerCase().replace(/\s+/g, "-")}`
    return `worker-${orgSlug}-${name.toLowerCase().replace(/\s+/g, "-")}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] bg-card max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Create New Agent
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {step === "level"
                ? "Choose the level in the organization"
                : step === "template"
                  ? "Select a template to start from"
                  : "Configure your agent"}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {step === "level" && (
            <div className="py-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {(["ceo", "c-level", "worker"] as RoleType[]).map((level) => {
                  const info = ROLE_LEVEL_INFO[level]
                  const isDisabled = level === "ceo" && hasCeoAgent
                  return (
                    <button
                      key={level}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setRoleType(level)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        roleType === level
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-full p-2" style={{ backgroundColor: `${info.color}15` }}>
                          {level === "ceo" ? <Bot className="h-5 w-5" style={{ color: info.color }} /> :
                           level === "c-level" ? <Cpu className="h-5 w-5" style={{ color: info.color }} /> :
                           <Zap className="h-5 w-5" style={{ color: info.color }} />}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{info.label}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">{info.description}</p>
                        </div>
                      </div>
                      {level === "ceo" && hasCeoAgent && (
                        <p className="text-xs text-muted-foreground mt-2 ml-10">Already exists in this organization</p>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="create-hermes-level"
                  checked={createHermesProfile}
                  onChange={(e) => setCreateHermesProfile(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <Label htmlFor="create-hermes-level" className="text-sm font-normal">
                  Create Hermes Gateway profile automatically
                </Label>
              </div>
            </div>
          )}

          {step === "template" && (
            <div className="py-6">
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : (
                <TemplatePicker
                  templates={templates}
                  roleType={roleType}
                  selectedId={selectedTemplate?.id ?? null}
                  onSelect={applyTemplate}
                  grouped={roleType === "worker"}
                />
              )}
            </div>
          )}

          {step === "details" && selectedTemplate && (
            <div className="py-6 space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Template</p>
                <p className="text-sm font-medium text-foreground">{selectedTemplate.displayName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedTemplate.description}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-name">Name *</Label>
                <Input
                  id="agent-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={selectedTemplate.roleType === "ceo"}
                  required
                  className="border-border focus:border-primary focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-desc">Description</Label>
                <Textarea
                  id="agent-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this agent do?"
                  rows={2}
                  className="border-border focus:border-primary focus:ring-primary"
                />
              </div>

              {selectedTemplate.roleType === "worker" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="soul">Custom Instructions (Optional)</Label>
                    <Textarea
                      id="soul"
                      value={soulContent}
                      onChange={(e) => setSoulContent(e.target.value)}
                      placeholder="Override default behavior with custom instructions..."
                      rows={4}
                      className="border-border focus:border-primary focus:ring-primary font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Default instructions will be generated based on specialization
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Skills</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="Add a skill"
                        className="border-border focus:border-primary focus:ring-primary"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addSkill()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addSkill}
                        className="border-border"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {skills.map((skill) => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="bg-muted text-foreground hover:bg-accent cursor-pointer"
                            onClick={() => removeSkill(skill)}
                          >
                            {skill}
                            <X className="ml-1 h-3 w-3" />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {selectedTemplate.roleType !== "worker" && (
                <div className="p-4 bg-background rounded-lg">
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    {selectedTemplate.roleType === "ceo"
                      ? "CEO"
                      : C_LEVEL_ROLES[selectedTemplate.cLevelRole!]?.label} Configuration
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {selectedTemplate.roleType === "ceo"
                      ? "Orchestrates the entire organization. Delegates to C-level, never executes directly."
                      : `Orchestrates the ${C_LEVEL_ROLES[selectedTemplate.cLevelRole!]?.department || ""} department. Delegates to specialists.`}
                    {orgObjective && ` Understands your objective: "${orgObjective}"`}
                  </p>
                  {createHermesProfile && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      Profile will be created with orchestration capabilities
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                <Bot className="h-4 w-4" />
                <span>
                  Profile name: <code className="bg-background px-1.5 py-0.5 rounded text-xs">
                    {getProfilePreview()}
                  </code>
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {step !== "level" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (step === "details") setStep(roleType === "ceo" ? "level" : "template")
                  else setStep("level")
                }}
                className="border-border"
              >
                Back
              </Button>
            )}
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false) }}
              className="border-border"
            >
              Cancel
            </Button>
            {step === "level" && (
              <Button
                type="button"
                onClick={handleLevelNext}
                disabled={roleType === "ceo" && hasCeoAgent}
                className="bg-primary hover:bg-primary/90"
              >
                Next
              </Button>
            )}
            {step === "template" && (
              <Button
                type="button"
                onClick={handleTemplateNext}
                disabled={!selectedTemplate}
                className="bg-primary hover:bg-primary/90"
              >
                Next
              </Button>
            )}
            {step === "details" && (
              <Button
                type="submit"
                disabled={isLoading || !name.trim() || !selectedTemplate}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? "Creating..." : "Create Agent"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
