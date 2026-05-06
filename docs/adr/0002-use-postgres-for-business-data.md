# ADR-0002: Use PostgreSQL for Business Data

## Status

Accepted

## Context

Hermes Agent uses SQLite for its internal Kanban system (`~/.hermes/kanban.db`). However, our platform requires:

- Multi-tenant organization data
- User authentication and sessions
- Agent configurations and templates
- Audit logs and analytics
- Relations between organizations, projects, and tasks

## Decision

We will use **PostgreSQL** for all business data, separate from Hermes Kanban SQLite.

Data separation:
- **Hermes SQLite:** Tasks, task states, dispatcher state
- **PostgreSQL:** Users, organizations, projects, agents, MCP configs, audit logs

Synchronization strategy: **Bidirectional sync via webhooks**

- Task created in Postgres → Create in Hermes via `kanban_create` tool
- Task updated in Hermes → Webhook to Postgres API
- UI actions → Update both stores atomically where possible

## Consequences

### Positive

- **Scalable** — Postgres handles multi-tenant data efficiently
- **Familiar stack** — Team knows Postgres, Prisma, SQL
- **Rich queries** — Can do analytics, reporting, search
- **Relations** — Proper foreign keys, joins, constraints
- **Cloud-ready** — Neon, Supabase, AWS RDS available

### Negative

- **Dual truth source** — Two databases means sync complexity
- **Potential drift** — If sync fails, states diverge
- **More infrastructure** — Need Postgres + connection pooling

### Neutral

- Hermes remains self-contained with SQLite
- Can run Hermes locally without Postgres
- Sync logic is custom code we maintain

## Sync Rules

| Event | Source | Target | Action |
|-------|--------|--------|--------|
| Create task from UI | Postgres | Hermes | `kanban_create` tool call |
| Task created by agent | Hermes | Postgres | Webhook `task_created` |
| Task status changed | Hermes | Postgres | Webhook `task_updated` |
| Task blocked | Hermes | Postgres | Webhook + notification |
| Task completed | Hermes | Postgres | Webhook + metadata |
| Drag-drop in UI | Postgres | Hermes | `kanban_*` tool call |

## Reconciliation

- Run periodic health check comparing Hermes tasks with Postgres tasks
- If drift detected, Hermes is source of truth for task state
- Postgres is source of truth for organization/project relationships

## Alternatives Considered

### Modify Hermes to use Postgres
- **Pros:** Single database, no sync
- **Cons:** Fork Hermes, maintenance burden, harder to upgrade

### Use only Hermes SQLite
- **Pros:** Simpler, no sync
- **Cons:** Can't do multi-tenant isolation, no analytics, limited scalability

### Use Supabase for everything
- **Pros:** All-in-one (auth, db, realtime)
- **Cons:** Can't replace Hermes Kanban, would still need sync

## Related

- ADR-0001: Use Hermes Agent as Runtime
- ADR-0004: Synchronization Strategy
