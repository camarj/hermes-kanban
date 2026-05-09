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
  private containerName = "hermes-gateway"
  private dbPath = "/data/kanban.db"

  /**
   * Pull tasks from Hermes kanban.db (inside Docker container) and upsert into Postgres.
   */
  async pullFromHermes(orgId: string, options?: KanbanSyncOptions): Promise<{
    synced: number
    created: number
    updated: number
    errors: number
  }> {
    const tasks = await this.fetchHermesTasks()
    if (!tasks.length) return { synced: 0, created: 0, updated: 0, errors: 0 }

    let created = 0
    let updated = 0
    let errors = 0

    for (const task of tasks) {
      try {
        const existing = await prisma.task.findUnique({ where: { hermesTaskId: task.id } })
        if (existing) {
          if (!options?.dryRun) {
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
          }
          updated++
        } else {
          if (!options?.dryRun) {
            let defaultProject = await prisma.project.findFirst({
              where: { orgId },
              orderBy: { createdAt: "asc" },
            })
            if (!defaultProject) {
              defaultProject = await prisma.project.create({
                data: {
                  orgId,
                  name: "Default",
                },
              })
            }
            await prisma.task.create({
              data: {
                hermesTaskId: task.id,
                title: task.title,
                body: task.body,
                status: task.status,
                priority: task.priority,
                assignee: task.assignee,
                projectId: defaultProject.id,
                orgId,
                workspaceType: task.workspace_type,
                workspacePath: task.workspace_path,
                blockedReason: task.blocked_reason,
                hermesMetadata: {},
              },
            })
          }
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
   * Push a task from Postgres to Hermes kanban via docker exec.
   */
  async pushToHermes(taskId: string): Promise<{ hermesTaskId: string | null; success: boolean }> {
    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task) return { hermesTaskId: null, success: false }
    if (task.hermesTaskId) return { hermesTaskId: task.hermesTaskId, success: true }

    const payload = JSON.stringify({
      dbPath: this.dbPath,
      title: task.title,
      body: task.body ?? null,
      assignee: task.assignee ?? null,
      priority: task.priority ?? 0,
      workspacePath: task.workspacePath ?? null,
    })

    const pythonScript = `
import sqlite3, json, sys, uuid
data = json.loads(sys.stdin.read())
conn = sqlite3.connect(data['dbPath'])
cursor = conn.cursor()
task_id = str(uuid.uuid4())
cursor.execute(
    "INSERT INTO tasks (id, title, body, assignee, status, priority, workspace_kind, workspace_path, created_at) VALUES (?, ?, ?, ?, 'triage', ?, 'scratch', ?, strftime('%s','now'))",
    (task_id, data['title'], data['body'], data['assignee'], data['priority'], data['workspacePath'])
)
conn.commit()
conn.close()
print(json.dumps({"id": task_id}))
`
    const result = await this.execInContainer(["python3", "-c", pythonScript], payload)
    if (!result) return { hermesTaskId: null, success: false }

    try {
      const parsed = JSON.parse(result)
      const hermesTaskId = parsed.id
      await prisma.task.update({ where: { id: taskId }, data: { hermesTaskId } })
      return { hermesTaskId, success: true }
    } catch {
      return { hermesTaskId: null, success: false }
    }
  }

  /**
   * Update task status transition in Hermes.
   */
  async updateTaskStatus(hermesTaskId: string, action: "complete" | "block" | "unblock" | "archive", reason?: string): Promise<boolean> {
    let status: string
    let resultCol: string | null = null
    switch (action) {
      case "complete": status = "done"; resultCol = reason || null; break
      case "block": status = "blocked"; break
      case "unblock": status = "ready"; break
      case "archive": status = "archived"; break
    }

    const payload = JSON.stringify({
      dbPath: this.dbPath,
      taskId: hermesTaskId,
      status,
      result: resultCol,
    })

    const pythonScript = `
import sqlite3, json, sys
data = json.loads(sys.stdin.read())
conn = sqlite3.connect(data['dbPath'])
cursor = conn.cursor()
if data['result'] is not None:
    cursor.execute(
        "UPDATE tasks SET status = ?, completed_at = strftime('%s','now'), result = ? WHERE id = ?",
        (data['status'], data['result'], data['taskId'])
    )
else:
    cursor.execute(
        "UPDATE tasks SET status = ? WHERE id = ?",
        (data['status'], data['taskId'])
    )
conn.commit()
conn.close()
print('ok')
`
    const result = await this.execInContainer(["python3", "-c", pythonScript], payload)
    return result === "ok"
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
    const payload = JSON.stringify({ dbPath: this.dbPath })
    const pythonScript = `
import sqlite3, json, sys
data = json.loads(sys.stdin.read())
conn = sqlite3.connect(data['dbPath'])
cursor = conn.cursor()
cursor.execute('CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT, assignee TEXT, status TEXT NOT NULL DEFAULT "triage", priority INTEGER DEFAULT 0, created_by TEXT, created_at INTEGER NOT NULL, started_at INTEGER, completed_at INTEGER, workspace_kind TEXT NOT NULL DEFAULT "scratch", workspace_path TEXT, claim_lock TEXT, claim_expires INTEGER, tenant TEXT, result TEXT, idempotency_key TEXT, consecutive_failures INTEGER DEFAULT 0, worker_pid INTEGER, last_failure_error TEXT, max_runtime_seconds INTEGER, last_heartbeat_at INTEGER, current_run_id INTEGER, workflow_template_id TEXT, current_step_key TEXT, skills TEXT)')
cursor.execute('CREATE TABLE IF NOT EXISTS task_links (parent_id TEXT, child_id TEXT, PRIMARY KEY (parent_id, child_id))')
cursor.execute('CREATE TABLE IF NOT EXISTS task_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL)')
cursor.execute('CREATE TABLE IF NOT EXISTS task_events (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT NOT NULL, event_type TEXT NOT NULL, payload TEXT, created_at INTEGER NOT NULL)')
conn.commit()
conn.close()
print('ok')
`
    const result = await this.execInContainer(["python3", "-c", pythonScript], payload)
    return result === "ok"
  }

  private async fetchHermesTasks(): Promise<KanbanTask[]> {
    const payload = JSON.stringify({ dbPath: this.dbPath })
    const pythonScript = `
import sqlite3, json, sys
data = json.loads(sys.stdin.read())
conn = sqlite3.connect(data['dbPath'])
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute('SELECT id, title, body, assignee, status, priority, workspace_kind, workspace_path, tenant, result, created_at, completed_at FROM tasks ORDER BY created_at DESC')
rows = cursor.fetchall()
tasks = []
for row in rows:
    tasks.append({
        "id": row["id"],
        "title": row["title"],
        "body": row["body"],
        "status": row["status"],
        "priority": row["priority"],
        "assignee": row["assignee"],
        "tenant": row["tenant"],
        "workspace_type": row["workspace_kind"],
        "workspace_path": row["workspace_path"],
        "blocked_reason": None,
        "result": row["result"],
        "created_at": str(row["created_at"]),
        "completed_at": str(row["completed_at"]) if row["completed_at"] else None,
        "parents": [],
        "children": []
    })
conn.close()
print(json.dumps(tasks))
`
    const output = await this.execInContainer(["python3", "-c", pythonScript], payload)
    if (!output) return []
    try {
      return JSON.parse(output)
    } catch {
      console.error("Failed to parse kanban tasks JSON:", output)
      return []
    }
  }

  /**
   * Run a command inside the Hermes Gateway container with stdin payload.
   * Uses spawn with an args array to avoid shell interpretation; values flow
   * through stdin as JSON so Python can json.loads them and pass to parametrized
   * SQL — no string interpolation across shell/Python/SQL layers.
   */
  private async execInContainer(args: string[], stdin?: string): Promise<string | null> {
    try {
      const { spawn } = await import("child_process")
      return new Promise((resolve) => {
        const proc = spawn("docker", ["exec", "-i", this.containerName, ...args], {
          timeout: 30000,
        })
        let stdout = ""
        let stderr = ""
        proc.stdout.on("data", (d: Buffer) => { stdout += d.toString() })
        proc.stderr.on("data", (d: Buffer) => { stderr += d.toString() })
        proc.on("error", (err) => {
          console.error("Docker exec error:", err.message, stderr)
          resolve(null)
        })
        proc.on("close", (code) => {
          if (code !== 0) {
            console.error(`Docker exec exited with code ${code}:`, stderr)
            resolve(null)
          } else {
            resolve(stdout.trim())
          }
        })
        if (stdin) {
          proc.stdin.write(stdin)
        }
        proc.stdin.end()
      })
    } catch {
      return null
    }
  }
}

export const kanbanSync = new KanbanSync()
