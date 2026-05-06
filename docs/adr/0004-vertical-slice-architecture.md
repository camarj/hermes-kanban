# ADR-0004: Vertical Slice Architecture

## Status

Accepted

## Context

When implementing features, we need to decide how to structure work. Traditional approaches:

- **Layer-by-layer:** Implement all of UI, then all of API, then all of DB
- **Feature teams:** Different teams own different layers

Both approaches have problems:
- Layer-by-layer creates integration hell at the end
- Feature teams create communication overhead
- Hard to demo progress incrementally
- Testing happens late

## Decision

We will use **Vertical Slice Architecture** (Tracer Bullets) for all feature development.

Each slice cuts through **all layers** for a single piece of functionality:

```
Vertical Slice Example: "Create Task from UI"

├── UI Component (KanbanCard, CreateTaskModal)
├── API Route (POST /api/tasks)
├── Business Logic (TaskService.create)
├── Database (Prisma task.create)
├── Hermes Integration (kanban_create tool)
├── WebSocket Broadcast (task:created event)
└── Tests (unit, integration, e2e)
```

## Consequences

### Positive

- **Fast feedback** — Each slice is demoable immediately
- **Reduced risk** — Integration problems found early
- **Better testing** — Tests written for each slice, not batched
- **Parallel work** — Different slices can be developed in parallel
- **TDD-friendly** — Natural to write test for slice, then implement

### Negative

- **More refactoring** — May refactor same layer multiple times
- **Requires discipline** — Easy to fall back to layer-by-layer

### Neutral

- Each issue in `/to-issues` is a vertical slice
- Slices are thin: one feature, end-to-end

## Slice Guidelines

### Good Slice
- "User can create task via modal in Kanban"
- "CEO can delegate task to backend-dev"
- "Board Member can approve blocked task"

### Bad Slice (Too Thick)
- "Implement entire Kanban board"
- "Build all CRUD operations for tasks"

### Bad Slice (Horizontal)
- "Create all API routes"
- "Implement all database migrations"
- "Build all UI components"

## Workflow with Matt Pocock Skills

1. `/grill-with-docs` — Clarify the feature, update CONTEXT.md
2. `/to-issues` — Break into vertical slices
3. For each slice:
   - `/tdd` — Implement with tests first
   - Verify end-to-end
   - Merge
4. `/improve-codebase-architecture` — Refactor if needed

## Example Slice Breakdown

**Feature:** Kanban Board

**Vertical Slices:**
1. ✅ Display empty Kanban columns
2. ✅ Fetch and display tasks from Postgres
3. ✅ Create task via modal (no drag-drop)
4. ✅ Drag-drop tasks between columns
5. ✅ Real-time updates via WebSocket
6. ✅ Sync drag-drop to Hermes
7. ✅ Task detail drawer
8. ✅ Task dependencies (parent/child links)

Each slice can be demoed and tested independently.

## Related

- ADR-0001: Use Hermes Agent as Runtime
- `.opencode/testing/tdd-strategy.md`
