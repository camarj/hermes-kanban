# ADR-0003: CEO Agent Architecture

## Status

Accepted

## Context

The CEO Agent is the central orchestrator for each organization. It must:

- Receive instructions from Board Members via chat
- Decompose strategic goals into tasks
- Delegate tasks to specialized Worker Agents
- Monitor progress across multiple workers
- Escalate decisions requiring human approval

The key question: **Should the CEO be a regular agent with orchestration skills, or a special system component?**

## Decision

The CEO is a **Hermes Profile** with the `kanban-orchestrator` skill, following the same architecture as Worker Agents.

### CEO Profile Characteristics

**Has:**
- `kanban-orchestrator` skill — teaches delegation patterns
- `kanban` toolset — can create, link, show tasks
- `memory` toolset — remembers past decisions
- `gateway` toolset — can communicate

**Does NOT have:**
- `terminal` toolset — CEO never executes code
- `file` toolset — CEO never edits files
- `web` toolset — CEO delegates research to workers

### SOUL.md Philosophy

```
Eres el CEO de {organization_name}.

Tu objetivo: {objective}

REGLAS:
- NUNCA ejecutas tareas tú mismo
- SIEMPRE delegas a especialistas
- Bloqueas tareas que requieran aprobación
- Reportas progreso de forma clara
```

## Consequences

### Positive

- **Consistent architecture** — CEO is just another agent, same infrastructure
- **Testable** — Can test CEO behavior like any other agent
- **Customizable** — Each org can tune their CEO's personality
- **No special code** — Don't need to build separate orchestration engine

### Negative

- **Model-dependent** — CEO quality depends on underlying LLM
- **Token costs** — CEO uses tokens for reasoning about delegation
- **Potential loops** — Bad prompting could cause CEO to delegate to itself

### Neutral

- CEO runs in same Hermes runtime as workers
- Each organization has exactly one CEO profile
- CEO profile named: `ceo-[org-slug]`

## Delegation Pattern

```
Board Member → Chat → CEO Agent
                        ↓
                  [Analyzes request]
                        ↓
              [Decomposes into tasks]
                        ↓
         kanban_create(assignee="backend-dev")
         kanban_create(assignee="frontend-dev")
         kanban_link(parent=..., child=...)
                        ↓
                  [Monitors via kanban_show]
                        ↓
         [Reports back to Board Member]
```

## Anti-patterns Prevented

- CEO with `terminal` access → Blocked in profile config
- CEO executing tasks → `kanban-orchestrator` skill teaches delegation only
- Worker with orchestration → Workers get `kanban-worker` skill, not orchestrator

## Alternatives Considered

### CEO as System Component (not agent)
- **Pros:** More control, deterministic
- **Cons:** Build orchestration engine from scratch, not flexible

### CEO as Fine-tuned Model
- **Pros:** Better at orchestration
- **Cons:** Expensive to fine-tune, can't use off-the-shelf models

### Human CEO
- **Pros:** Real human judgment
- **Cons:** Doesn't scale, defeats purpose of autonomous agents

## Related

- ADR-0001: Use Hermes Agent as Runtime
- ADR-0005: Worker Agent Architecture
