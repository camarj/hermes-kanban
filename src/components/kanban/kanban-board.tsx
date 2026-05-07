"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"

interface KanbanTask {
  id: string
  title: string
  assignee?: string
  priority: "low" | "medium" | "high"
  status: "triage" | "todo" | "ready" | "running" | "blocked" | "done"
}

const COLUMNS = [
  { id: "triage", title: "Triage", color: "bg-gray-100" },
  { id: "todo", title: "To Do", color: "bg-blue-50" },
  { id: "ready", title: "Ready", color: "bg-yellow-50" },
  { id: "running", title: "Running", color: "bg-purple-50" },
  { id: "blocked", title: "Blocked", color: "bg-red-50" },
  { id: "done", title: "Done", color: "bg-green-50" },
]

const SAMPLE_TASKS: KanbanTask[] = [
  { id: "1", title: "Setup project structure", priority: "high", status: "done", assignee: "CEO Agent" },
  { id: "2", title: "Configure Hermes Gateway", priority: "high", status: "running", assignee: "Worker Agent" },
  { id: "3", title: "Implement authentication", priority: "medium", status: "ready" },
  { id: "4", title: "Design database schema", priority: "medium", status: "todo" },
  { id: "5", title: "Write API documentation", priority: "low", status: "triage" },
]

const priorityColors = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
}

export function KanbanBoard() {
  const getTasksByStatus = (status: KanbanTask["status"]) => {
    return SAMPLE_TASKS.filter((task) => task.status === status)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#D4CFC7] bg-white">
        <h2 className="font-serif text-xl font-semibold text-[#070605]">Kanban Board</h2>
        <Button size="sm" className="bg-[#2D9AA5] hover:bg-[#1A7A82]">
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto p-6 bg-[#F5F1EB]">
        <div className="flex gap-4 h-full min-w-max">
          {COLUMNS.map((column) => {
            const tasks = getTasksByStatus(column.id as KanbanTask["status"])
            return (
              <div key={column.id} className="w-72 flex flex-col">
                <div className={`${column.color} rounded-t-lg px-3 py-2 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-[#070605]">{column.title}</span>
                    <Badge variant="secondary" className="h-5 px-2 text-xs">
                      {tasks.length}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 bg-white/50 rounded-b-lg p-2 space-y-2 border border-t-0 border-[#D4CFC7]">
                  {tasks.map((task) => (
                    <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow border-[#D4CFC7]">
                      <CardContent className="p-3">
                        <p className="text-sm font-medium text-[#070605] mb-2">{task.title}</p>
                        <div className="flex items-center justify-between">
                          <Badge className={`text-xs ${priorityColors[task.priority]}`}>{task.priority}</Badge>
                          {task.assignee && (
                            <div className="flex items-center gap-1">
                              <div className="h-5 w-5 rounded-full bg-[#2D9AA5] flex items-center justify-center">
                                <span className="text-[10px] text-white font-medium">
                                  {task.assignee.charAt(0)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {tasks.length === 0 && (
                    <div className="text-center py-8 text-sm text-[#6B6560]">No tasks</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
