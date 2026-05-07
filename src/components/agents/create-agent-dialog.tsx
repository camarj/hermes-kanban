"use client"

import { useState } from "react"
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
import { Agent } from "@/lib/agents/types"
import { Plus, X } from "lucide-react"

interface CreateAgentDialogProps {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAgentCreated?: () => void
}

export function CreateAgentDialog({
  orgId,
  open,
  onOpenChange,
  onAgentCreated,
}: CreateAgentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [hermesProfile, setHermesProfile] = useState("")
  const [soulContent, setSoulContent] = useState("")
  const [skills, setSkills] = useState<string[]>([])
  const [newSkill, setNewSkill] = useState("")
  const [tools, setTools] = useState<string[]>([])
  const [newTool, setNewTool] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !hermesProfile.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/organizations/${orgId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          hermesProfile: hermesProfile.trim(),
          soulContent: soulContent.trim() || undefined,
          skills,
          tools,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create agent")
      }

      // Reset form
      setName("")
      setDescription("")
      setHermesProfile("")
      setSoulContent("")
      setSkills([])
      setTools([])
      setNewSkill("")
      setNewTool("")
      
      onOpenChange(false)
      onAgentCreated?.()
    } catch (error) {
      console.error("Failed to create agent:", error)
      alert(error instanceof Error ? error.message : "Failed to create agent")
    } finally {
      setIsLoading(false)
    }
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

  function addTool() {
    if (newTool.trim() && !tools.includes(newTool.trim())) {
      setTools([...tools, newTool.trim()])
      setNewTool("")
    }
  }

  function removeTool(tool: string) {
    setTools(tools.filter((t) => t !== tool))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-serif">Create New Agent</DialogTitle>
            <DialogDescription className="text-[#6B6560]">
              Configure an AI agent for your organization
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Name *</Label>
              <Input
                id="agent-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Code Reviewer"
                required
                className="border-[#D4CFC7] focus:border-[#2D9AA5] focus:ring-[#2D9AA5]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hermes-profile">Hermes Profile *</Label>
              <Input
                id="hermes-profile"
                value={hermesProfile}
                onChange={(e) => setHermesProfile(e.target.value)}
                placeholder="e.g., acme-code-reviewer"
                required
                className="border-[#D4CFC7] focus:border-[#2D9AA5] focus:ring-[#2D9AA5]"
              />
              <p className="text-xs text-[#6B6560]">
                Unique identifier for this agent in Hermes Gateway
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-description">Description</Label>
              <Textarea
                id="agent-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this agent do?"
                rows={2}
                className="border-[#D4CFC7] focus:border-[#2D9AA5] focus:ring-[#2D9AA5]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="soul-content">Soul Content</Label>
              <Textarea
                id="soul-content"
                value={soulContent}
                onChange={(e) => setSoulContent(e.target.value)}
                placeholder="Core instructions and personality for the agent..."
                rows={4}
                className="border-[#D4CFC7] focus:border-[#2D9AA5] focus:ring-[#2D9AA5]"
              />
              <p className="text-xs text-[#6B6560]">
                Defines the agent&apos;s behavior, capabilities, and constraints
              </p>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label>Skills</Label>
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill"
                  className="border-[#D4CFC7] focus:border-[#2D9AA5] focus:ring-[#2D9AA5]"
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
                  className="border-[#D4CFC7]"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="bg-[#E8E4DE] text-[#070605] hover:bg-[#D4CFC7] cursor-pointer"
                    onClick={() => removeSkill(skill)}
                  >
                    {skill}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tools */}
            <div className="space-y-2">
              <Label>Tools</Label>
              <div className="flex gap-2">
                <Input
                  value={newTool}
                  onChange={(e) => setNewTool(e.target.value)}
                  placeholder="Add a tool"
                  className="border-[#D4CFC7] focus:border-[#2D9AA5] focus:ring-[#2D9AA5]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTool()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTool}
                  className="border-[#D4CFC7]"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {tools.map((tool) => (
                  <Badge
                    key={tool}
                    variant="secondary"
                    className="bg-[#E8E4DE] text-[#070605] hover:bg-[#D4CFC7] cursor-pointer"
                    onClick={() => removeTool(tool)}
                  >
                    {tool}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#D4CFC7]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim() || !hermesProfile.trim()}
              className="bg-[#2D9AA5] hover:bg-[#1A7A82]"
            >
              {isLoading ? "Creating..." : "Create Agent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}