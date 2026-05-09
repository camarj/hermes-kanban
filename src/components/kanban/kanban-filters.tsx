"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TaskStatus, PRIORITY_LABELS } from "@/lib/kanban/types"
import { Search, Filter, X } from "lucide-react"

export interface TaskFilters {
  search: string
  status: TaskStatus | "all"
  priority: string | "all"
  assignee: string
}

interface KanbanFiltersProps {
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
}

export function KanbanFilters({ filters, onFiltersChange }: KanbanFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.assignee.trim() !== ""

  function clearFilters() {
    onFiltersChange({
      search: "",
      status: "all",
      priority: "all",
      assignee: "",
    })
  }

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="pl-9 border-border focus:border-primary focus:ring-primary"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={`border-border ${hasActiveFilters ? "bg-primary/10 border-primary" : ""}`}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-1.5">
              !
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-3 bg-card rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select
              value={filters.status}
              onValueChange={(v) => v &&
                onFiltersChange({ ...filters, status: v as TaskFilters["status"] })
              }
            >
              <SelectTrigger className="w-32 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="triage">Triage</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Priority:</span>
            <Select
              value={filters.priority}
              onValueChange={(v) => v &&
                onFiltersChange({ ...filters, priority: v })
              }
            >
              <SelectTrigger className="w-32 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="-1">{PRIORITY_LABELS[-1]}</SelectItem>
                <SelectItem value="0">{PRIORITY_LABELS[0]}</SelectItem>
                <SelectItem value="1">{PRIORITY_LABELS[1]}</SelectItem>
                <SelectItem value="2">{PRIORITY_LABELS[2]}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Assignee:</span>
            <Input
              placeholder="Filter by assignee"
              value={filters.assignee}
              onChange={(e) =>
                onFiltersChange({ ...filters, assignee: e.target.value })
              }
              className="w-40 border-border focus:border-primary focus:ring-primary"
            />
          </div>
        </div>
      )}
    </div>
  )
}