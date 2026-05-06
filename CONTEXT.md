# Domain Context

Glossary of domain terms for the Hermes Multi-Agent Platform.

## Core Concepts

### Organization
A company or entity that uses the platform. Each organization has its own CEO Agent, agents, projects, and tasks. Organizations are multi-tenant isolated.

**Examples:**
- "Inteliside Studio"
- "Acme Corporation"

### Board Member (Junta Directiva)
A member of the organization's board of directors who can delegate tasks to the CEO, approve blocked tasks, and configure agents. They define their responsibilities and domains during onboarding.

**Synonyms:** Board, Junta Directiva, Director

### CEO Agent
The orchestrator agent for an organization. It receives instructions from Board Members, decomposes goals into tasks, delegates to Worker Agents, and escalates decisions that require human approval. It never executes tasks itself.

**Responsibilities:**
- Receive strategic instructions from Board Members
- Decompose objectives into tasks
- Delegate to specialists
- Monitor progress
- Escalate decisions requiring approval

### Worker Agent
A specialized agent that executes tasks. Has access to specific tools, skills, and MCP servers. Examples: Backend Developer, Frontend Developer, Researcher, Writer.

**Also called:** Employee Agent, Specialist Agent

### Agent Template
A reusable configuration for creating Worker Agents. Contains SOUL.md content, default skills, tools, toolsets, and MCP configurations. Can be public (shared across organizations) or private (organization-specific).

### Task
A unit of work managed on the Kanban board. Tasks are assigned to agents (Worker or CEO), have statuses, priorities, and can be linked in dependency chains.

**Task Statuses:**
- **Triage** — Rough idea, needs specification
- **TODO** — Created, waiting on dependencies or assignment
- **Ready** — Assigned, waiting for dispatcher pickup
- **Running** — Agent actively working
- **Blocked** — Waiting for human approval
- **Done** — Completed
- **Archived** — Historical record

### Project
A collection of tasks under an organization. Projects group related work and provide context for task execution.

### Kanban Board
Visual task board showing all tasks organized by status. Supports drag-and-drop, filtering, and real-time updates via WebSocket.

### Delegation
The process of assigning a task to an agent. CEO delegates to Workers; Workers can create child tasks via `kanban_create` tool.

### Approval Flow
When an agent encounters a decision requiring human judgment, it blocks the task with `kanban_block`. A Board Member receives notification and must approve or reject before the task can continue.

**Also called:** Human-in-the-Loop, HITL

### MCP Server (Model Context Protocol)
External tool server that extends an agent's capabilities. Examples: GitHub MCP (repo operations), Supabase MCP (database operations).

### Skill
A knowledge document that teaches an agent how to perform specific tasks. Skills are loaded on-demand and follow the agentskills.io specification.

**Examples:**
- `kanban-orchestrator` — Teaches CEO how to delegate
- `kanban-worker` — Teaches Workers how to read and complete tasks
- `backend-development` — Backend coding patterns

### SOUL.md
The personality and role definition file for an agent. Defines expertise, responsibilities, rules, and communication style. The first thing in an agent's system prompt.

### Hermes Profile
A named agent configuration in Hermes Agent runtime. Each agent (CEO, Workers) has its own profile with specific tools, skills, and MCP servers.

**Location:** `~/.hermes/profiles/[profile-name]/`

### Hermes Kanban
The SQLite-based task management system built into Hermes Agent. Tasks are stored in `~/.hermes/kanban.db` and managed via `kanban_*` tools.

### Dispatcher
Background process that picks up `ready` tasks and spawns worker agents to execute them. Runs inside Hermes Gateway by default.

### Hermes Gateway API
HTTP API exposed by Hermes Agent at `:8642/v1`. Provides OpenAI-compatible endpoints for chat completions, model listing, and tool calls.

## Relationships

```
Organization
  ├── Board Members (users with 'board' role)
  ├── CEO Agent (one per org)
  ├── Worker Agents (many per org)
  │     └── Agent Templates (reusable configs)
  ├── Projects (many per org)
  │     └── Tasks (many per project)
  └── MCP Servers (org-level configs)
```

## Task Lifecycle

```
[Board Member] creates task
       ↓
  triage (needs spec)
       ↓
  todo (dependencies resolved)
       ↓
  ready (assigned to agent)
       ↓
  running (agent executing)
       ↓
  blocked? ←─────┐
       ↓          │
  done           │
       ↑          │
       └──────────┘
  [Board Member] approves
```

## Key Actions

### Delegate
CEO creates a task and assigns it to a Worker Agent using `kanban_create` tool.

### Block
Agent calls `kanban_block(reason)` when it needs human decision. Task status becomes `blocked`.

### Approve/Unblock
Board Member reviews blocked task, adds comment, and calls `kanban_unblock` or uses UI to approve.

### Complete
Agent finishes task and calls `kanban_complete(summary, metadata)` with structured handoff.

### Sync
Bidirectional synchronization between Hermes Kanban (SQLite) and Postgres (business data). Webhooks from Hermes trigger Postgres updates; UI actions trigger Hermes tool calls.

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Owner** | Full control, creates org, can delete it |
| **Board Member** | Chat with CEO, delegate tasks, approve blocks, manage agents, view all projects |
| **Member** | Limited visibility (future feature) |

## Communication Patterns

### Board Member → CEO
Chat interface in UI. CEO responds with streaming text, delegates tasks to Workers as needed.

### CEO → Worker
Creates task on Kanban board with `kanban_create`. Worker picks up when dispatcher runs.

### Worker → Board Member
Blocks task with `kanban_block`. Board Member receives in-app notification, email, or webhook.

### Worker → Worker
Creates child tasks with `kanban_create(parents=[...])`. Dependency chain ensures execution order.

## Technical Terms

### WebSocket Broadcast
Real-time updates pushed to all connected UI clients when tasks change state.

### Vertical Slice
A thin implementation that cuts through all layers (UI → API → DB → Hermes) for a single feature.

### Tracer Bullet
Same as vertical slice. A minimal but complete implementation path used to validate architecture.

### ADR (Architecture Decision Record)
Document capturing a significant architectural decision, its context, and consequences. Stored in `docs/adr/`.

---

## Naming Conventions

- **Organizations:** kebab-case slugs (e.g., `inteliside-studio`)
- **Agents:** kebab-case profile names (e.g., `backend-dev`, `ceo-inteliside`)
- **Tasks:** Human-readable titles (e.g., "Implement authentication API")
- **Projects:** Human-readable names (e.g., "Hermes Multi-Agent Platform")

## Anti-patterns to Avoid

- **CEO executing tasks:** CEO should only orchestrate, never execute
- **Workers with orchestration skills:** Workers should have `kanban-worker`, not `kanban-orchestrator`
- **Missing SOUL.md:** Every agent must have personality definition
- **Broken sync:** Postgres and Hermes Kanban must stay synchronized
- **Approval bottleneck:** All Board Members can approve, no single-point-of-failure
