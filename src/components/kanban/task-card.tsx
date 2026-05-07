"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Task, PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/kanban/types"
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
        "group relative bg-white rounded-lg border border-[#D4CFC7] p-3 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-[#2D9AA5]",
        isDragging && "opacity-50 rotate-2 shadow-lg border-[#2D9AA5]"
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-[#6B6560]" />
      </div>

      <div className="pl-5">
        {/* Priority Indicator */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[0] }}
            title={PRIORITY_LABELS[task.priority]}
          />
          <span className="text-xs text-[#6B6560]">
            {task.project.name}
          </span>
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium text-[#070605] mb-1 line-clamp-2">
          {task.title}
        </h4>

        {/* Body Preview */}
        {task.body && (
          <p className="text-xs text-[#6B6560] line-clamp-2 mb-2">
            {task.body}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2">
          {task.assignee ? (
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-[#2D9AA5] text-white text-xs flex items-center justify-center">
                {task.assignee.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-[#6B6560] truncate max-w-[100px]">{task.assignee}</span>
            </div>
          ) : (
            <span className="text-xs text-[#6B6560]">Unassigned</span>
          )}

          {task.status === "blocked" && (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>
    </div>
  )
}