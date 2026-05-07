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
import { Task, TaskStatus, COLUMNS, PRIORITY_LABELS } from "@/lib/kanban/types"
import { AlertCircle, Trash2, Save, X } from "lucide-react"
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

interface TaskDetailDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskUpdated?: (task: Task) => void
  onTaskDeleted?: (taskId: string) => void
  orgId: string
  availableAgents?: string[]
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onTaskUpdated,
  onTaskDeleted,
  orgId,
  availableAgents,
}: TaskDetailDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // Form state
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [status, setStatus] = useState<TaskStatus>("triage")
  const [priority, setPriority] = useState<string>("0")
  const [assignee, setAssignee] = useState("")

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setBody(task.body || "")
      setStatus(task.status)
      setPriority(task.priority.toString())
      setAssignee(task.assignee || "")
    }
  }, [task])

  if (!task) return null

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !task) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/tasks/${task.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim() || null,
            status,
            priority: parseInt(priority),
            assignee: assignee.trim() || null,
          }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to update task")
      }

      const data = await response.json()
      onTaskUpdated?.(data.task)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update task:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    if (!task) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/tasks/${task.id}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error("Failed to delete task")
      }

      onTaskDeleted?.(task.id)
      setShowDeleteDialog(false)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to delete task:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="font-serif flex items-center gap-2">
                Edit Task
                {task.status === "blocked" && (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
              </DialogTitle>
              <DialogDescription className="text-[#6B6560]">
                Created on {new Date(task.createdAt).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter task title"
                  required
                  className="border-[#D4CFC7] focus:border-[#2D9AA5] focus:ring-[#2D9AA5]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-body">Description</Label>
                <Textarea
                  id="edit-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Add details about this task..."
                  rows={4}
                  className="border-[#D4CFC7] focus:border-[#2D9AA5] focus:ring-[#2D9AA5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={status} onValueChange={(v) => v && setStatus(v as TaskStatus)}>
                    <SelectTrigger className="border-[#D4CFC7]">
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
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select value={priority} onValueChange={(v) => v && setPriority(v)}>
                    <SelectTrigger className="border-[#D4CFC7]">
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
                <Label htmlFor="edit-assignee">Assignee</Label>
                {availableAgents && availableAgents.length > 0 ? (
                  <Select value={assignee} onValueChange={(v) => v && setAssignee(v)}>
                    <SelectTrigger className="border-[#D4CFC7]">
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {availableAgents.map((agent) => (
                        <SelectItem key={agent} value={agent}>
                          {agent}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="edit-assignee"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder="Assign to an agent or user"
                    className="border-[#D4CFC7] focus:border-[#2D9AA5] focus:ring-[#2D9AA5]"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Project</Label>
                <p className="text-sm text-[#6B6560]">{task.project.name}</p>
              </div>

              {task.completedAt && (
                <div className="space-y-2">
                  <Label>Completed</Label>
                  <p className="text-sm text-green-600">
                    {new Date(task.completedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <div className="flex-1"></div>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-[#D4CFC7]"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !title.trim()}
                className="bg-[#2D9AA5] hover:bg-[#1A7A82]"
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Delete Task</AlertDialogTitle>
            <AlertDialogDescription className="text-[#6B6560]">
              Are you sure you want to delete &quot;{task.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#D4CFC7]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}