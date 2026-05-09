"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Task, PRIORITY_COLORS, PRIORITY_LABELS, isAgentRequestTask } from "@/lib/kanban/types"
import { cn } from "@/lib/utils"
import { GripVertical, AlertCircle } from "lucide-react"

interface TaskCardProps {
  task: Task
  onClick?: () => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        "group relative bg-card rounded-lg border border-border p-3 transition-all cursor-pointer hover:border-primary",
        isDragging && "opacity-50 rotate-2 border-primary"
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="pl-5">
        {/* Priority Indicator */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[0] }}
            title={PRIORITY_LABELS[task.priority]}
          />
          <span className="text-xs text-muted-foreground">
            {task.project.name}
          </span>
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium text-foreground mb-1 line-clamp-2">
          {task.title}
        </h4>

        {/* Body Preview */}
        {task.body && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {task.body}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2">
          {task.assignee ? (
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {task.assignee.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-muted-foreground truncate max-w-[100px]">{task.assignee}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          )}

          {task.status === "blocked" && isAgentRequestTask(task) ? (
            <span className="text-xs bg-warning/10 text-warning px-1.5 py-0.5 rounded-full">
              Hiring
            </span>
          ) : task.status === "blocked" ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : null}
        </div>
      </div>
    </div>
  )
}