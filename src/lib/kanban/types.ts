export interface Task {
  id: string
  title: string
  body: string | null
  status: TaskStatus
  priority: number
  assignee: string | null
  projectId: string
  orgId: string
  createdAt: string
  completedAt: string | null
  project: {
    id: string
    name: string
  }
}

export type TaskStatus = 
  | "triage"
  | "todo"
  | "ready"
  | "running"
  | "blocked"
  | "done"
  | "archived"

export const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "triage", label: "Triage", color: "#6B6560" },
  { id: "todo", label: "To Do", color: "#2D9AA5" },
  { id: "ready", label: "Ready", color: "#3B82F6" },
  { id: "running", label: "Running", color: "#F59E0B" },
  { id: "blocked", label: "Blocked", color: "#EF4444" },
  { id: "done", label: "Done", color: "#10B981" },
]

export const PRIORITY_LABELS: Record<number, string> = {
  [-1]: "Low",
  0: "Normal",
  1: "High",
  2: "Critical",
}

export const PRIORITY_COLORS: Record<number, string> = {
  [-1]: "#6B6560",
  0: "#2D9AA5",
  1: "#F59E0B",
  2: "#EF4444",
}