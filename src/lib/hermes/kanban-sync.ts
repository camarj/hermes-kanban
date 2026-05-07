import { hermesClient } from "./client"
import { prisma } from "@/lib/db/prisma"

export type KanbanTaskStatus =
  | "triage"
  | "todo"
  | "ready"
  | "running"
  | "blocked"
  | "done"
  | "archived"

export interface KanbanTask {
  id: string
  title: string
  body: string | null
  status: KanbanTaskStatus
  priority: number
  assignee: string | null
  tenant: string | null
  workspace_type: string
  workspace_path: string | null
  blocked_reason: string | null
  result: string | null
  created_at: string
  completed_at: string | null
  parents: string[]
  children: string[]
}

export interface KanbanSyncOptions {
  board?: string
  dryRun?: boolean
}

export class KanbanSync {
  /**
   * Pull tasks from Hermes kanban.db (via CLI) and upsert into Postgres.
   * This uses `hermes kanban list --json` to read the board state.
   */
  async pullFromHermes(orgId: string, options?: KanbanSyncOptions): Promise<{
    synced: number
    created: number
    updated: number
    errors: number
  }> {
    const tasks = await this.fetchHermesTasks(options?.board)
    if (!tasks.length) return { synced: 0, created: 0, updated: 0, errors: 0 }

    let created = 0
    let updated = 0
    let errors = 0

    for (const task of tasks) {
const existing = await prisma.task.findUnique({ where: { hermesTaskId: task.id } })
      try {
        if (existing) {
          await prisma.task.update({
            where: { hermesTaskId: task.id },
            data: {
              title: task.title,
              body: task.body,
              status: task.status,
              priority: task.priority,
              assignee: task.assignee,
              workspaceType: task.workspace_type,
              workspacePath: task.workspace_path,
              blockedReason: task.blocked_reason,
            },
          })
          updated++
        } else {
          await prisma.task.create({
            data: {
              hermesTaskId: task.id,
              title: task.title,
              body: task.body,
              status: task.status,
              priority: task.priority,
              assignee: task.assignee,
              projectId: "", // Will need a default project
              orgId,
              workspaceType: task.workspace_type,
              workspacePath: task.workspace_path,
              blockedReason: task.blocked_reason,
              hermesMetadata: {},
            },
          })
          created++
        }
      } catch (error) {
        console.error(`Error syncing task ${task.id}:`, error)
        errors++
      }
    }

    return { synced: tasks.length, created, updated, errors }
  }

  /**
   * Push a task from Postgres to Hermes kanban via CLI.
   */
  async pushToHermes(taskId: string): Promise<{ hermesTaskId: string | null; success: boolean }> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return { hermesTaskId: null, success: false }
    }

    // If already synced, skip
    if (task.hermesTaskId) {
      return { hermesTaskId: task.hermesTaskId, success: true }
    }

    const args = [
      "kanban", "create",
      `"${task.title.replace(/"/g, '\\"')}"`,
      "--assignee", task.assignee || "unassigned",
      "--priority", String(task.priority),
      "--json",
    ]

    if (task.body) {
      args.push("--body", `"${task.body.replace(/"/g, '\\"')}"`)
    }

    const result = await this.execHermes(args.join(" "))
    if (!result) {
      return { hermesTaskId: null, success: false }
    }

    try {
      const parsed = JSON.parse(result)
      const hermesTaskId = parsed.id

      await prisma.task.update({
        where: { id: taskId },
        data: { hermesTaskId },
      })

      return { hermesTaskId, success: true }
    } catch {
      return { hermesTaskId: null, success: false }
    }
  }

  /**
   * Update task status transition in Hermes.
   */
  async updateTaskStatus(hermesTaskId: string, action: "complete" | "block" | "unblock" | "archive", reason?: string): Promise<boolean> {
    let command: string

    switch (action) {
      case "complete":
        command = `hermes kanban complete ${hermesTaskId}`
        break
      case "block":
        command = `hermes kanban block ${hermesTaskId} "${reason || "Blocked from Hermes Kanban UI"}"`
        break
      case "unblock":
        command = `hermes kanban unblock ${hermesTaskId}`
        break
      case "archive":
        command = `hermes kanban archive ${hermesTaskId}`
        break
    }

    const result = await this.execHermes(command)
    return result !== null
  }

  /**
   * Check if Hermes Gateway is running and responsive.
   */
  async isGatewayRunning(): Promise<boolean> {
    return hermesClient.health()
  }

  /**
   * Initialize the kanban.db if it doesn't exist.
   */
  async initKanban(): Promise<boolean> {
    const result = await this.execHermes("kanban init")
    return result !== null
  }

  private async fetchHermesTasks(board?: string): Promise<KanbanTask[]> {
    const boardArg = board ? `--board ${board}` : ""
    const output = await this.execHermes(`kanban list --json ${boardArg}`)
    if (!output) return []

    try {
      const parsed = JSON.parse(output)
      return Array.isArray(parsed) ? parsed : parsed.tasks || []
    } catch {
      console.error("Failed to parse kanban list output")
      return []
    }
  }

  private async execHermes(args: string): Promise<string | null> {
    try {
      const { exec } = await import("child_process")
      return new Promise((resolve) => {
        exec(
          `hermes ${args}`,
          {
            timeout: 30000,
            env: { ...process.env, HERMES_HOME: hermesClient.hermesHomePath },
          },
          (error, stdout, stderr) => {
            if (error) {
              console.error("Hermes CLI error:", error.message, stderr)
              resolve(null)
            } else {
              resolve(stdout.trim())
            }
          },
        )
      })
    } catch {
      return null
    }
  }
}

export const kanbanSync = new KanbanSync()