"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Task, TaskStatus } from "@/lib/kanban/types"
import { TaskCard } from "./task-card"
import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface KanbanColumnProps {
  id: TaskStatus
  label: string
  color: string
  tasks: Task[]
  onAddTask?: () => void
  onTaskClick?: (task: Task) => void
}

export function KanbanColumn({ id, label, color, tasks, onAddTask, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full min-h-[500px] rounded-lg bg-[#F5F1EB] border-2 transition-colors",
        isOver ? "border-[#2D9AA5] bg-[#2D9AA5]/5" : "border-transparent"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#D4CFC7]">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h3 className="font-medium text-[#070605]">{label}</h3>
          <span className="text-xs text-[#6B6560] bg-white px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        {onAddTask && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddTask}
            className="h-7 w-7 p-0 hover:bg-[#E8E4DE]"
          >
            <Plus className="h-4 w-4 text-[#6B6560]" />
          </Button>
        )}
      </div>

      {/* Tasks List */}
      <div className="flex-1 p-2 overflow-y-auto">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
            ))}
          </div>
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-32 text-[#6B6560] text-sm">
            No tasks
          </div>
        )}
      </div>
    </div>
  )
}