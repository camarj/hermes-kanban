"use client"

import { useState, useCallback } from "react"
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
  DragStartEvent,
  closestCorners,
} from "@dnd-kit/core"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTasks } from "@/hooks/use-tasks"
import { useTasksSSE } from "@/hooks/use-tasks-sse"
import { KanbanColumn } from "./kanban-column"
import { TaskDetailDialog } from "./task-detail-dialog"
import { TaskCreateDialog } from "./task-create-dialog"
import { COLUMNS, PRIORITY_LABELS, type Task, type TaskStatus } from "@/lib/kanban/types"
import type { Agent } from "@/lib/agents/types"

const priorityColors: Record<number, string> = {
  2: "bg-red-100 text-red-700",
  1: "bg-yellow-100 text-yellow-700",
  0: "bg-gray-100 text-gray-700",
  [-1]: "bg-gray-50 text-gray-600",
}

interface KanbanBoardProps {
  orgId: string
  agents: Agent[]
}

export function KanbanBoard({ orgId, agents }: KanbanBoardProps) {
  const { tasks, loading, updateTask, refetch, syncWithHermes } = useTasks(orgId)
  const [isSyncing, setIsSyncing] = useState(false)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  useTasksSSE(
    orgId,
    (task) => refetch(),
    (task) => refetch(),
    (taskId) => refetch()
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as TaskStatus

    const task = tasks.find((t) => t.id === taskId)
    if (task && task.status !== newStatus) {
      await updateTask(taskId, { status: newStatus })
    }
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setShowEditDialog(true)
  }

  const handleTaskUpdated = () => {
    refetch()
  }

  const handleTaskCreated = () => {
    refetch()
  }

  const handleTaskDeleted = () => {
    refetch()
  }

  const handleSync = useCallback(async () => {
    setIsSyncing(true)
    try {
      await syncWithHermes()
    } catch {
      // Error handled in hook
    } finally {
      setIsSyncing(false)
    }
  }, [syncWithHermes])

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F5F1EB]">
        <div className="text-[#6B6560]">Loading tasks...</div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D4CFC7] bg-white">
          <h2 className="font-serif text-xl font-semibold text-[#070605]">Kanban Board</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="border-[#D4CFC7] text-[#6B6560]"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
              Sync
            </Button>
            <Button
              size="sm"
              className="bg-[#2D9AA5] hover:bg-[#1A7A82]"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto p-6 bg-[#F5F1EB]">
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.label}
                color={column.color}
                tasks={getTasksByStatus(column.id)}
                onTaskClick={handleTaskClick}
              />
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeTask && (
          <Card className="cursor-grabbing shadow-lg border-[#2D9AA5] border-2 opacity-90">
            <CardContent className="p-3">
              <p className="text-sm font-medium text-[#070605] mb-2">{activeTask.title}</p>
              <div className="flex items-center justify-between">
                <Badge className={`text-xs ${priorityColors[activeTask.priority] || priorityColors[0]}`}>
                  {PRIORITY_LABELS[activeTask.priority] || "Normal"}
                </Badge>
                {activeTask.assignee && (
                  <div className="h-5 w-5 rounded-full bg-[#2D9AA5] flex items-center justify-center">
                    <span className="text-[10px] text-white font-medium">
                      {activeTask.assignee.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </DragOverlay>

      <TaskCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        orgId={orgId}
        agents={agents}
        onTaskCreated={handleTaskCreated}
      />

      <TaskDetailDialog
        task={selectedTask}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        orgId={orgId}
        availableAgents={agents.map((a) => a.hermesProfile)}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
      />
    </DndContext>
  )
}
