# Hermes Multi-Agent Platform - Development Context

## Proyecto

Plataforma de orquestación multi-agente basada en Hermes Agent que replica y potencia el modelo de Paperclip, con gestión de organizaciones, proyectos y tareas coordinadas por un CEO Agent.

## Stack Tecnológico

**Frontend:** Next.js 16 + Tailwind CSS v4 + shadcn/ui + Inteliside Design System
**Backend:** Next.js API Routes + BetterAuth + PostgreSQL 16
**Agentes:** Hermes Agent + Gateway API (:8642)
**Testing:** Vitest + Playwright (TDD obligatorio)

## Reglas de Desarrollo

### TDD Obligatorio
1. **RED**: Escribir test que falla primero
2. **GREEN**: Implementar código mínimo para pasar
3. **REFACTOR**: Mejorar con tests en verde
4. **Commits**: Solo con todos los tests pasando
5. **Coverage mínimo**: 80% unit, 60% integration

### Código
- Sin emojis en código ni comentarios
- Seguir Inteliside Design System (`.claude/skills/inteliside-design/`)
- Commits en español, nombres técnicos en inglés
- TypeScript estricto habilitado

## Estructura del Proyecto

```
app/
├── (auth)/           # Auth pages: login, register
├── (dashboard)/      # Protected routes
│   ├── kanban/       # Kanban board
│   ├── agents/       # Agent management
│   └── settings/     # Org/user settings
├── api/              # API routes
└── layout.tsx

components/
├── ui/               # shadcn/ui components
├── kanban/           # Kanban-specific components
├── chat/             # Chat with CEO
└── agents/           # Agent cards, forms

lib/
├── db/               # Prisma client + queries
├── hermes/           # Hermes API client + sync
├── auth/             # BetterAuth config
└── utils/            # Utilities

tests/
├── unit/             # Vitest unit tests
├── integration/      # API + service tests
└── e2e/              # Playwright E2E tests
```

## Arquitectura Clave

Ver detalles en `architecture/`:
- `system-design.md` - Diagrama de arquitectura y flujos
- `data-model.md` - Schema SQL completo
- `hermes-integration.md` - Integración con Hermes Gateway

## Especificaciones

Ver detalles en `specs/`:
- `acceptance-criteria.md` - Criterios de aceptación por feature
- `edge-cases.md` - Casos de borde y manejo de errores

## Testing

Ver detalles en `testing/tdd-strategy.md`:
- Estructura de tests
- Ejemplos por tipo
- CI/CD pipeline

## Comandos Principales

```bash
# Desarrollo
npm run dev

# Testing
npm run test              # Unit tests (watch)
npm run test:coverage     # Coverage report
npm run test:e2e          # Playwright E2E
npm run test:all          # Full suite

# Database
npx prisma migrate dev    # Create migration
npx prisma studio         # GUI browser

# Hermes
hermes gateway start      # Start Hermes Gateway
hermes kanban init        # Initialize Kanban DB
```

## Flujo Git

```
feat/*    - Nuevas features
fix/*     - Bug fixes
refactor/* - Refactors
test/*    - Solo tests
docs/*    - Documentación
```

## PR Requirements

- [ ] Tests unit + integration pasando
- [ ] Coverage ≥ 80% (unit), ≥ 60% (integration)
- [ ] E2E smoke tests relevantes
- [ ] Sin console.logs ni debug code
- [ ] TypeScript sin errores
- [ ] Lint passing

## Design System (Inteliside)

Aplicar estilos desde `.claude/skills/inteliside-design/colors_and_type.css`:
- **Colores**: Teal `#2D9AA5` como accent, ivory `#F5F1EB` (light), ink `#070605` (dark)
- **Tipografía**: Fraunces (serif H1/H2), Geist (sans body), Geist Mono (meta)
- **Elevación**: Hairline dividers, sin sombras pesadas
- **Modos**: light / dark / system

## Roles de Usuario

- **Owner**: Control total, crea organización
- **Board Member**: Junta directiva, delega tareas, aprueba bloqueos
- **Member**: Visibilidad limitada (futuro)

## Notas Importantes

- Hermes usa SQLite para Kanban, Postgres para business data
- Sincronización bidireccional Hermes ↔ Postgres
- WebSocket para updates en tiempo real
- MCP servers configurables por agente
- Webhooks para integraciones externas

## Engram Memory System

### Project Configuration

**Project name:** `hermes-kanban-dev`

Configured in `.engram/config.json`. Engram auto-detects this project from the repo root.

### MCP Tools Available (14 agent-facing tools)

**Save & Update:**
- `mem_save` — Save a memory (title, type, What/Why/Where/Learned)
- `mem_update` — Update an existing memory
- `mem_delete` — Delete a memory
- `mem_suggest_topic_key` — Get suggested topic key for a memory

**Search & Retrieve:**
- `mem_search` — Full-text search across memories
- `mem_context` — Load recent context from previous sessions
- `mem_timeline` — Show chronological context around an observation
- `mem_get_observation` — Get a specific observation by ID

**Session Lifecycle:**
- `mem_session_start` — Start a new session
- `mem_session_end` — End current session
- `mem_session_summary` — Get summary of current session

**Conflict Surfacing:**
- `mem_judge` — Compare two observations for conflicts
- `mem_compare` — Deep comparison of observations

**Utilities:**
- `mem_current_project` — Confirm which project Engram detected
- `mem_stats` — Show memory system statistics

### When to Save Memories

Save to engram when:
- **Architectural decision made** → type: `decision`, topic: `architecture/*`
- **Bug fixed** → type: `bugfix`, topic: `bugs/*`
- **Pattern discovered** → type: `pattern`, topic: `patterns/*`
- **Integration completed** → type: `milestone`, topic: `features/*`
- **Convention established** → type: `convention`, topic: `conventions/*`

### Memory Protocol

Follow the What/Why/Where/Learned structure:

```
What: Brief description of what was done
Why: Context and motivation
Where: Files, functions, or components affected
Learned: Key insights or gotchas for future reference
```

### Example Usage

```bash
# Check current project
mem_current_project()

# Load context from previous sessions
mem_context(project: "hermes-kanban-dev")

# Search for past decisions
mem_search(project: "hermes-kanban-dev", query: "authentication")

# Save a decision
mem_save(
  title: "Use BetterAuth for authentication",
  type: "decision",
  project: "hermes-kanban-dev",
  topic_key: "architecture/auth",
  content: {
    what: "Configured BetterAuth for email/password + OAuth providers",
    why: "Need multi-tenant auth with organization scoping",
    where: "lib/auth/better-auth.ts, app/api/auth/[...all]/route.ts",
    learned: "BetterAuth requires adapter pattern for Prisma, session strategy must be JWT for serverless"
  }
)
```

## Agent Skills

### Issue tracker

GitHub Issues is used for task tracking. See `docs/agents/issue-tracker.md`.

### Triage labels

Labels used: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`, `blocked`, `in-progress`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repository with `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.

### Matt Pocock Skills Pipeline

Use these skills during development:

- `/grill-with-docs` — Before implementing: interview about the plan, update `CONTEXT.md`, create ADRs
- `/tdd` — Red-green-refactor loop for all code
- `/to-issues` — Break PRD into vertical slice issues
- `/diagnose` — Disciplined debugging loop
- `/improve-codebase-architecture` — Run periodically to prevent "ball of mud"
- `/zoom-out` — Explain code in system context

### Development Workflow (Matt Pocock Style)

1. **ALIGN** — Run `/grill-with-docs` before starting any feature
2. **DECOMPOSE** — Use `/to-issues` to create vertical slice issues
3. **IMPLEMENT** — Use `/tdd` for each issue (test first)
4. **DEBUG** — Use `/diagnose` for bugs (reproduce → minimise → hypothesise → instrument → fix)
5. **MAINTAIN** — Run `/improve-codebase-architecture` weekly
