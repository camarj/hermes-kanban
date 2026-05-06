# Domain Documentation Configuration

## Layout Type

**Single-context repository**

This project has one global `CONTEXT.md` and one `docs/adr/` directory.

## File Locations

```
/
├── CONTEXT.md                    # Domain glossary and key concepts
├── docs/
│   ├── adr/                      # Architecture Decision Records
│   │   ├── 0001-use-postgres-for-business-data.md
│   │   ├── 0002-hermes-as-agent-runtime.md
│   │   └── ...
│   └── agents/                   # Agent configuration files
│       ├── issue-tracker.md
│       ├── triage-labels.md
│       └── domain.md             # This file
├── .opencode/                    # Project context for AI agents
│   ├── AGENTS.md
│   ├── plans/
│   ├── specs/
│   ├── architecture/
│   ├── stack/
│   └── testing/
└── [project files...]
```

## CONTEXT.md Purpose

`CONTEXT.md` provides the **ubiquitous language** for this project. It:

- Defines domain terms precisely
- Eliminates ambiguity in communication
- Ensures consistent naming in code and conversation
- Serves as the first reference for AI agents joining the project

**Guidelines:**
- Keep terms domain-focused, not implementation-focused
- Update inline as new terms crystallize
- Cross-reference with code when possible
- Avoid coupling to specific technologies (unless architecturally significant)

## ADRs (Architecture Decision Records)

ADRs capture **significant** architectural decisions. An ADR is needed when:

1. **Hard to reverse** — Cost of changing mind later is meaningful
2. **Surprising without context** — Future reader will wonder "why?"
3. **Result of trade-off** — Real alternatives existed, we picked one for specific reasons

### ADR Format

```markdown
# [ADR-NNNN] Title

## Status

[Proposed | Accepted | Deprecated | Superseded]

## Context

What is the issue we're addressing?

## Decision

What is the change we're proposing/have made?

## Consequences

What becomes easier or harder because of this change?

## Alternatives Considered

What other options were evaluated?
```

### Creating ADRs

ADRs are created by:
1. Running `/grill-with-docs` during planning
2. Making significant architectural decisions
3. Explicitly requesting: "Create an ADR for this decision"

ADRs are numbered sequentially: `0001-`, `0002-`, etc.

## Consumer Rules

### For AI Agents

When exploring the codebase:

1. **Read `CONTEXT.md` first** — Understand the domain language
2. **Check `docs/adr/`** — Learn past architectural decisions
3. **Use domain terms** — Name files, functions, variables consistently
4. **Update `CONTEXT.md`** — When new terms crystallize
5. **Create ADRs sparingly** — Only for significant, hard-to-reverse decisions

### For `/grill-with-docs` Skill

During grilling sessions:
- Challenge terms against `CONTEXT.md` glossary
- Propose precise canonical terms for fuzzy language
- Update `CONTEXT.md` inline as terms resolve
- Offer ADR creation for significant decisions

### For `/improve-codebase-architecture` Skill

When analyzing architecture:
- Read `CONTEXT.md` to understand domain boundaries
- Check `docs/adr/` for past decisions
- Identify deep modules (simple interface, complex implementation)
- Propose refinements that respect domain language

## Multi-Context Repositories

This project is **NOT** multi-context. If it becomes a monorepo with separate frontend/backend contexts in the future, create:

```
/
├── CONTEXT-MAP.md               # Points to each context
├── src/
│   ├── frontend/
│   │   └── CONTEXT.md
│   └── backend/
│       └── CONTEXT.md
```

For now, single-context is sufficient.

## Related Documentation

- `.opencode/AGENTS.md` — Agent instructions for development
- `.opencode/specs/` — Acceptance criteria and edge cases
- `.opencode/architecture/` — System design details
