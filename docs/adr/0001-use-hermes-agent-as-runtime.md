# ADR-0001: Use Hermes Agent as Multi-Agent Runtime

## Status

Accepted

## Context

We need to build a multi-agent orchestration platform similar to Paperclip, where a CEO Agent coordinates specialized Worker Agents. The key requirements are:

- Agents must be autonomous and persistent
- Task delegation and coordination
- Built-in Kanban board for task management
- Human-in-the-loop approval flows
- Extensible via MCP servers and skills

## Decision

We will use **Hermes Agent** as the runtime for all agents in the system.

## Consequences

### Positive

- **Built-in Kanban system** — No need to implement task management from scratch
- **Profile-based agents** — Each agent (CEO, Workers) is a Hermes Profile with isolated memory
- **Dispatcher included** — Background process that picks up ready tasks automatically
- **MCP support** — Can extend agent capabilities with external tools
- **Gateway API** — OpenAI-compatible HTTP API for UI integration
- **Skills system** — Agents can load knowledge on-demand
- **Open source** — Full control, can modify if needed

### Negative

- **SQLite for Kanban** — Hermes uses SQLite internally, requires sync with Postgres for business data
- **Single-host design** — Hermes designed for single machine, multi-tenant isolation is logical, not physical
- **Learning curve** — Team needs to learn Hermes concepts (profiles, skills, kanban tools)

### Neutral

- Agents run on local machine, not cloud-native by default
- Dispatcher runs inside Gateway process
- WebSocket updates via custom implementation

## Alternatives Considered

### Paperclip
- **Pros:** Purpose-built for multi-agent orchestration, managed service
- **Cons:** Proprietary, less control, can't customize runtime

### Custom Agent System
- **Pros:** Full control over architecture
- **Cons:** Months of development, need to build Kanban, dispatcher, profiles from scratch

### LangGraph / LangChain
- **Pros:** Popular, good for workflows
- **Cons:** No built-in Kanban, no profile-based agents, more like function orchestration than autonomous agents

## Related

- ADR-0002: Use PostgreSQL for Business Data
- ADR-0003: CEO Agent Architecture
