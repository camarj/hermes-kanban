"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FolderKanban, Plus, Users, CheckSquare, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import Link from "next/link"

interface Project {
  id: string
  name: string
  description: string | null
  status: "active" | "paused" | "completed" | "archived"
  createdAt: string
  creator: {
    id: string
    name: string | null
    email: string
  } | null
  _count: {
    tasks: number
  }
}

interface ProjectListProps {
  projects: Project[]
  orgId: string
  orgSlug: string
  onProjectCreated?: (project: Project) => void
  onProjectDeleted?: (projectId: string) => void
}

const STATUS_COLORS = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-700",
  archived: "bg-gray-100 text-gray-600"
}

const STATUS_LABELS = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived"
}

export function ProjectList({ 
  projects, 
  orgId, 
  orgSlug,
  onProjectCreated,
  onProjectDeleted 
}: ProjectListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<Project["status"]>("active")

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/organizations/${orgId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          status
        })
      })

      if (!response.ok) {
        throw new Error("Failed to create project")
      }

      const data = await response.json()
      onProjectCreated?.(data.project)
      
      // Reset form
      setName("")
      setDescription("")
      setStatus("active")
      setIsCreateOpen(false)
    } catch (error) {
      console.error("Failed to create project:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(projectId: string) {
    if (!confirm("Are you sure you want to delete this project?")) {
      return
    }

    try {
      const response = await fetch(
        `/api/organizations/${orgId}/projects/${projectId}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        throw new Error("Failed to delete project")
      }

      onProjectDeleted?.(projectId)
    } catch (error) {
      console.error("Failed to delete project:", error)
    }
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-[#D4CFC7] rounded-lg">
        <FolderKanban className="mx-auto h-12 w-12 text-[#6B6560] mb-4" />
        <h3 className="text-lg font-medium text-[#070605] mb-2">No projects yet</h3>
        <p className="text-sm text-[#6B6560] mb-4">
          Create your first project to get started
        </p>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger
            render={
              <Button className="bg-[#2D9AA5] hover:bg-[#1A7A82]">
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            }
          />
          <DialogContent className="bg-white">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="font-serif">Create New Project</DialogTitle>
                <DialogDescription className="text-[#6B6560]">
                  Add a new project to your organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name *</Label>
                  <Input
                    id="project-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter project name"
                    required
                    className="border-[#D4CFC7] focus:border-[#2D9AA5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the project..."
                    rows={3}
                    className="border-[#D4CFC7] focus:border-[#2D9AA5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-status">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as Project["status"])}>
                    <SelectTrigger className="border-[#D4CFC7]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="border-[#D4CFC7]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="bg-[#2D9AA5] hover:bg-[#1A7A82]"
                >
                  {isLoading ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[#6B6560]">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </p>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger
            render={
              <Button className="bg-[#2D9AA5] hover:bg-[#1A7A82]">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            }
          />
          <DialogContent className="bg-white">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="font-serif">Create New Project</DialogTitle>
                <DialogDescription className="text-[#6B6560]">
                  Add a new project to your organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name *</Label>
                  <Input
                    id="project-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter project name"
                    required
                    className="border-[#D4CFC7] focus:border-[#2D9AA5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the project..."
                    rows={3}
                    className="border-[#D4CFC7] focus:border-[#2D9AA5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-status">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as Project["status"])}>
                    <SelectTrigger className="border-[#D4CFC7]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="border-[#D4CFC7]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="bg-[#2D9AA5] hover:bg-[#1A7A82]"
                >
                  {isLoading ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="border-[#D4CFC7] hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#2D9AA5]/10 flex items-center justify-center">
                    <FolderKanban className="h-5 w-5 text-[#2D9AA5]" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium text-[#070605]">
                      {project.name}
                    </CardTitle>
                    <Badge 
                      variant="secondary" 
                      className={STATUS_COLORS[project.status]}
                    >
                      {STATUS_LABELS[project.status]}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.description && (
                <p className="text-sm text-[#6B6560] line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-[#6B6560]">
                <div className="flex items-center gap-1">
                  <CheckSquare className="h-4 w-4" />
                  <span>{project._count.tasks} tasks</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>
                    By {project.creator?.name || project.creator?.email || "Unknown"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E8E4DE]">
                <Link 
                  href={`/${orgSlug}/tasks?project=${project.id}`}
                  className="text-sm text-[#2D9AA5] hover:underline"
                >
                  View Tasks →
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-600"
                  onClick={() => handleDelete(project.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}