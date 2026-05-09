"use client"

import { useDroppable } from "@dnd-kit/core"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { useDraggable } from "@dnd-kit/core"
import { COLUMNS, PRIORITY_LABELS, type Task, type TaskStatus } from "@/lib/kanban/types"

const priorityColors: Record<number, string> = {
  2: "bg-red-100 text-red-700",
  1: "bg-yellow-100 text-yellow-700",
  0: "bg-gray-100 text-gray-700",
  [-1]: "bg-gray-50 text-gray-600",
}

interface KanbanColumnProps {
  id: TaskStatus
  title: string
  color: string
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}

function TaskCard({ task, onTaskClick }: { task: Task; onTaskClick?: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: { task },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onTaskClick?.(task)}
    >
      <Card 
        className="cursor-grab hover:shadow-md transition-shadow border-[#D4CFC7] active:shadow-lg mb-2" 
        data-testid="task-card"
        data-task-id={task.id}
      >
        <CardContent className="p-3">
          <p className="text-sm font-medium text-[#070605] mb-2">{task.title}</p>
          {task.body && (
            <p className="text-xs text-[#6B6560] mb-2 line-clamp-2">{task.body}</p>
          )}
          <div className="flex items-center justify-between">
            <Badge className={`text-xs ${priorityColors[task.priority] || priorityColors[0]}`}>
              {PRIORITY_LABELS[task.priority] || "Normal"}
            </Badge>
            {task.assignee && (
              <div className="h-5 w-5 rounded-full bg-[#2D9AA5] flex items-center justify-center">
                <span className="text-[10px] text-white font-medium">
                  {task.assignee.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function KanbanColumn({ id, title, color, tasks, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="w-72 flex flex-col" data-testid={`kanban-column-${id}`}>
      <div className="rounded-t-lg px-3 py-2 flex items-center justify-between" style={{ backgroundColor: color + "20" }}>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-[#070605]">{title}</span>
          <Badge variant="secondary" className="h-5 px-2 text-xs">
            {tasks.length}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 bg-white/50 rounded-b-lg p-2 border border-t-0 border-[#D4CFC7] min-h-[200px] ${
          isOver ? "bg-[#2D9AA5]/10" : ""
        }`}
      >
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} />
        ))}

        {tasks.length === 0 && (
          <div className="text-center py-8 text-sm text-[#6B6560]">No tasks</div>
        )}
      </div>
    </div>
  )
}
