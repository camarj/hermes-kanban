"use client"

import { useState, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { COLUMNS, PRIORITY_LABELS, type TaskStatus } from "@/lib/kanban/types"
import { Plus, X } from "lucide-react"
import type { Agent } from "@/lib/agents/types"

interface TaskCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  projectId?: string
  agents: Agent[]
  onTaskCreated: (task: Task) => void
}

export function TaskCreateDialog({
  open,
  onOpenChange,
  orgId,
  projectId,
  agents,
  onTaskCreated,
}: TaskCreateDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [status, setStatus] = useState<TaskStatus>("triage")
  const [priority, setPriority] = useState("0")
  const [assignee, setAssignee] = useState("")

  function resetForm() {
    setTitle("")
    setBody("")
    setStatus("triage")
    setPriority("0")
    setAssignee("")
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/organizations/${orgId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || null,
          status,
          priority: parseInt(priority),
          assignee: assignee || null,
          projectId,
        }),
      })

      if (!res.ok) throw new Error("Failed to create task")

      const data = await res.json()
      onTaskCreated(data.task)
      resetForm()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to create task:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle className="font-serif">Create New Task</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add a task to your Kanban board
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                required
                className="border-border focus:border-primary focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Description</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add details, context, or instructions..."
                rows={4}
                className="border-border focus:border-primary focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Initial Status</Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v as TaskStatus)}>
                  <SelectTrigger className="border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => v && setPriority(v)}>
                  <SelectTrigger className="border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">{PRIORITY_LABELS[-1]}</SelectItem>
                    <SelectItem value="0">{PRIORITY_LABELS[0]}</SelectItem>
                    <SelectItem value="1">{PRIORITY_LABELS[1]}</SelectItem>
                    <SelectItem value="2">{PRIORITY_LABELS[2]}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

              <div className="space-y-2">
                <Label>Assign to Agent</Label>
                <Select value={assignee || ""} onValueChange={(v) => v !== null && setAssignee(v)}>
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.hermesProfile}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm()
                onOpenChange(false)
              }}
              className="border-border"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              {isLoading ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import type { Task } from "@/lib/kanban/types"
