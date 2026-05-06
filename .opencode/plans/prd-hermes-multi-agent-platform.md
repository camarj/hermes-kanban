# PRD — Hermes Multi-Agent Orchestration Platform

## Resumen Ejecutivo

**Producto:** Plataforma de orquestación multi-agente basada en Hermes Agent que replica y potencia el modelo de Paperclip, permitiendo que organizaciones operen con equipos de agentes autónomos coordinados por un CEO agente.

**Objetivo:** Crear una UI propia con design system Inteliside que integre Hermes como motor de orquestación, con gestión de organizaciones, proyectos y tareas en un modelo multi-tenant con roles de usuario diferenciados.

---

## 1. Visión del Producto

### 1.1 Propuesta de Valor

| Aspecto | Paperclip | Esta Plataforma |
|---------|-----------|-----------------|
| Motor de agentes | Propietario | Hermes Agent (open source, extendible) |
| UI | Genérica | Personalizada Inteliside Design System |
| Nivel de abstracción | Agentes directos | Organización → Proyectos → Tareas |
| Roles | Owner + agentes | Owner + Junta Directiva + Agentes |
| Aislamiento | Por usuario | Multi-tenant con organizaciones |
| Extensibilidad | Limitada | MCP, Tools, Skills, Webhooks, APIs |

### 1.2 Principales Capacidades

1. **CEO Agent:** Agente orquestador que recibe instrucciones de la junta directiva y delega a agentes especializados
2. **Agentes Empleados:** Templates + custom agents con skills, MCP servers, tools y webhooks
3. **Kanban Visual:** Drag & drop con sincronización bidireccional Hermes ↔ Postgres
4. **Human-in-the-loop:** Bloqueo de tareas para aprobación de junta directiva
5. **Tiempo Real:** WebSockets para actualizaciones instantáneas del tablero

---

## 2. Arquitectura del Sistema

### 2.1 Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 16)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Kanban    │  │    Chat     │  │   Agent Manager     │ │
│  │  (dnd-kit)  │  │(Vercel SDK) │  │   (Profiles/MCP)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│         │                │                    │            │
│  ┌──────────────────────────────────────────────────────────┤
│  │              Inteliside Design System                     │
│  │  Tailwind + shadcn/ui + colors_and_type.css              │
│  └──────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API LAYER (Next.js API)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ BetterAuth  │  │  WebSocket  │  │   Hermes Bridge     │ │
│  │   (Auth)    │  │   (Real-time)│  │   (Gateway API)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│   PostgreSQL    │  │ Hermes Gateway  │  │   Hermes Kanban     │
│  (Business Data)│  │   (API :8642)   │  │   (SQLite)          │
│                 │  │                 │  │                     │
│ - Users         │  │ /v1/chat/       │  │ ~/.hermes/          │
│ - Organizations │  │ completions     │  │ kanban.db           │
│ - Projects      │  │                 │  │                     │
│ - Tasks (sync)  │  │                 │  │                     │
│ - Agents        │  │                 │  │                     │
│ - MCP Configs   │  │                 │  │                     │
└─────────────────┘  └─────────────────┘  └─────────────────────┘
```

### 2.2 Flujo de Datos

```
Usuario (Junta Directiva)
        │
        ▼
    [Chat UI] ───────────────────────────────┐
        │                                    │
        ▼                                    ▼
   CEO Agent (Hermes Profile)         [Kanban Board]
        │                                    │
        │ delegate_task / kanban_create      │
        ▼                                    ▼
   Hermes Kanban (SQLite) ◄────────────► Postgres (Sync)
        │                                    │
        ▼                                    ▼
   Dispatcher spawns workers          WebSocket updates UI
        │
        ▼
   Agentes Especializados (Profiles)
        │
        ▼
   Ejecución de tareas → kanban_complete
```

---

## 3. Modelo de Datos

### 3.1 Entidades de Negocio (Postgres)

```sql
-- USERS & AUTH
users (
  id              UUID PRIMARY KEY,
  email           VARCHAR(255) UNIQUE NOT NULL,
  name            VARCHAR(255),
  avatar_url     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
)

-- ORGANIZATIONS
organizations (
  id              UUID PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) UNIQUE NOT NULL,
  owner_id        UUID REFERENCES users(id),
  objective       TEXT,           -- Objetivo inicial de la organización
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
)

-- MEMBERSHIP
organization_members (
  id              UUID PRIMARY KEY,
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id),
  role            VARCHAR(50) DEFAULT 'member', -- 'owner', 'board', 'member'
  responsibilities TEXT[],      -- Áreas de responsabilidad
  domains         TEXT[],       -- Áreas de dominio
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
)

-- PROJECTS
projects (
  id              UUID PRIMARY KEY,
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  status          VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'completed', 'archived'
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
)

-- TASKS (mirror de Hermes Kanban)
tasks (
  id              UUID PRIMARY KEY,
  hermes_task_id  VARCHAR(50) UNIQUE, -- t_xxx de Hermes
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  org_id          UUID REFERENCES organizations(id),
  title           VARCHAR(500) NOT NULL,
  body            TEXT,
  status          VARCHAR(50) DEFAULT 'triage',
  -- triage, todo, ready, running, blocked, done, archived
  priority        INTEGER DEFAULT 0,
  assignee        VARCHAR(100),    -- Profile name del agente
  tenant          VARCHAR(100),    -- Namespace dentro del board
  workspace_type  VARCHAR(50) DEFAULT 'scratch',
  -- scratch, worktree, dir:<path>
  workspace_path  TEXT,
  blocked_reason  TEXT,
  blocked_by      UUID REFERENCES users(id), -- Quién debe aprobar
  approval_required BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  -- Metadata from Hermes
  hermes_metadata JSONB DEFAULT '{}'
)

-- TASK RELATIONS
task_links (
  id              UUID PRIMARY KEY,
  parent_task_id  UUID REFERENCES tasks(id) ON DELETE CASCADE,
  child_task_id   UUID REFERENCES tasks(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_task_id, child_task_id)
)

-- TASK COMMENTS
task_comments (
  id              UUID PRIMARY KEY,
  task_id         UUID REFERENCES tasks(id) ON DELETE CASCADE,
  author_type     VARCHAR(50), -- 'user', 'agent'
  author_id       VARCHAR(100), -- user_id o profile_name
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
)

-- AGENT TEMPLATES
agent_templates (
  id              UUID PRIMARY KEY,
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  display_name    VARCHAR(255),
  description     TEXT,
  role_type       VARCHAR(50) DEFAULT 'worker', -- 'ceo', 'orchestrator', 'worker'
  soul_content    TEXT,           -- Contenido de SOUL.md
  default_skills   TEXT[],        -- Skills por defecto
  default_tools    TEXT[],        -- Tools disponibles
  default_toolsets TEXT[],        -- Toolsets disponibles
  model_override  VARCHAR(100),   -- Modelo específico si aplica
  created_by      UUID REFERENCES users(id),
  is_public       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
)

-- AGENT INSTANCES
agents (
  id              UUID PRIMARY KEY,
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  template_id     UUID REFERENCES agent_templates(id),
  hermes_profile  VARCHAR(100) NOT NULL, -- Nombre del profile en Hermes
  name            VARCHAR(100) NOT NULL,
  description     TEXT,
  soul_content    TEXT,
  skills          TEXT[],
  tools           TEXT[],
  toolsets        TEXT[],
  mcp_servers     JSONB DEFAULT '[]', -- [{server_name, config}]
  webhooks        JSONB DEFAULT '[]', -- [{url, events[], secret}]
  api_integrations JSONB DEFAULT '[]', -- [{name, endpoint, auth_type, credentials_ref}]
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
)

-- MCP SERVER CONFIGS
mcp_servers (
  id              UUID PRIMARY KEY,
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  transport       VARCHAR(50) DEFAULT 'stdio', -- 'stdio', 'http'
  command         TEXT,           -- Para stdio
  url             TEXT,           -- Para http
  env_vars        JSONB DEFAULT '{}',
  tools_filter    TEXT[],         -- Tools permitidos (null = todos)
  created_at      TIMESTAMPTZ DEFAULT NOW()
)

-- NOTIFICATIONS
notifications (
  id              UUID PRIMARY KEY,
  user_id         UUID REFERENCES users(id),
  org_id          UUID REFERENCES organizations(id),
  type            VARCHAR(50), -- 'task_blocked', 'task_completed', 'approval_required'
  task_id         UUID REFERENCES tasks(id),
  title           VARCHAR(255),
  body            TEXT,
  read_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
)

-- WEBHOOK EVENTS (para integraciones externas)
webhook_events (
  id              UUID PRIMARY KEY,
  org_id          UUID REFERENCES organizations(id),
  event_type      VARCHAR(100),
  payload         JSONB,
  delivered_at    TIMESTAMPTZ,
  status          VARCHAR(50) DEFAULT 'pending',
  retries         INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
)
```

### 3.2 Sincronización Hermes ↔ Postgres

El sistema mantiene sincronía bidireccional:

| Evento | Acción |
|--------|--------|
| `kanban_create` en Hermes | Insert en `tasks` (Postgres) |
| `kanban_complete` en Hermes | Update status + metadata en `tasks` |
| `kanban_block` en Hermes | Update status + blocked_reason |
| Drag-drop en UI | `kanban_*` tool call vía Hermes Gateway API |
| Crear agente en UI | Crear profile Hermes + insert en `agents` |

---

## 4. Roles y Permisos

### 4.1 Roles de Usuario

| Rol | Permisos |
|-----|----------|
| **Owner** | Todo. Crea la organización. Puede eliminarla. |
| **Board Member** (Junta Directiva) | Chat con CEO. Delegar tareas. Aprobar bloqueos. Ver todos los proyectos. Configurar agentes. |
| **Member** | Ver proyectos asignados. Ver tareas. (Futuro: interactuar con agentes específicos) |

### 4.2 Matriz de Permisos

| Acción | Owner | Board | Member |
|--------|-------|-------|--------|
| Crear organización | ✅ | ❌ | ❌ |
| Eliminar organización | ✅ | ❌ | ❌ |
| Invitar miembros | ✅ | ✅ | ❌ |
| Crear proyectos | ✅ | ✅ | ❌ |
| Delegar tareas al CEO | ✅ | ✅ | ❌ |
| Aprobar tareas bloqueadas | ✅ | ✅ | ❌ |
| Crear/editar agentes | ✅ | ✅ | ❌ |
| Ver dashboard | ✅ | ✅ | ❌ |
| Configurar MCP/Webhooks | ✅ | ✅ | ❌ |

---

## 5. UI/UX — Design System Inteliside

### 5.1 Principios Visuales

- **Modo:** 3 modos (light/dark/system). Light = warm ivory `#F5F1EB`. Dark = warm ink `#070605`.
- **Tipografía:** Fraunces (serif) para H1/H2/display. Geist (sans) para body/UI. Geist Mono para meta/eyebrows.
- **Color primario:** Teal `#2D9AA5` — links, CTAs, labels. Nunca borders ni glows.
- **Elevación:** Hairline dividers (`var(--rule)`), nunca sombras pesadas.
- **Sin emojis.** Copy en español, segunda persona informal.

### 5.2 Páginas Principales

#### 5.2.1 Dashboard Principal (`/dashboard`)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ [Logo]    Proyectos  Agentes  Config   [Notificaciones] [Avatar]         │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────┐ │
│  │                                     │ │                             │ │
│  │          KANBAN BOARD               │ │      CHAT CON CEO          │ │
│  │          (70% width)                │ │      (30% width)           │ │
│  │                                     │ │                             │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │ │  [Message input]           │ │
│  │  │Triage│ │ TODO│ │Ready│ │ Run │   │ │                             │ │
│  │  └─────┘ └─────┘ └─────┘ └─────┘   │ │  Mensajes del CEO...        │ │
│  │                                     │ │                             │ │
│  │  Drag & drop con dnd-kit           │ │  [●●●] typing...           │ │
│  │  Updates en tiempo real (WS)       │ │                             │ │
│  │                                     │ │                             │ │
│  └─────────────────────────────────────┘ └─────────────────────────────┘ │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

#### 5.2.2 Gestión de Agentes (`/agents`)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  Agentes de [Organización]                              [+ Nuevo Agente]  │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│  │ [Avatar]    │ │ [Avatar]    │ │ [Avatar]    │ │ [Avatar]    │         │
│  │             │ │             │ │             │ │             │         │
│  │ CEO         │ │ Backend Dev │ │ Researcher  │ │ Writer      │         │
│  │ ─────────── │ │ ─────────── │ │ ─────────── │ │ ─────────── │         │
│  │ Orchestrates│ │ Python, API │ │ Web search  │ │ Content     │         │
│  │ delegates   │ │ Supabase    │ │ Analysis    │ │ editing     │         │
│  │             │ │             │ │             │ │             │         │
│  │ Skills: 3   │ │ Skills: 5   │ │ Skills: 2   │ │ Skills: 4   │         │
│  │ MCP: 2      │ │ MCP: 1      │ │ MCP: 0      │ │ MCP: 0      │         │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘         │
│                                                                           │
│  Templates Públicos ───────────────────────────────────────────────────── │
│  [Backend Engineer] [Frontend Dev] [QA Engineer] [DevOps] [Data Analyst] │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

#### 5.2.3 Editor de Agente (`/agents/[id]/edit`)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  ← Volver a Agentes                                      [Guardar]        │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────┐ │
│  │ BÁSICO                              │ │ AVANZADO                    │ │
│  │                                     │ │                             │ │
│  │ Nombre: [Backend Developer]        │ │ MCP Servers                 │ │
│  │ Display: [Backend Developer]       │ │ ┌─────────────────────────┐ │ │
│  │                                     │ │ │ ☑ github-mcp           │ │ │
│  │ Rol: [Worker ▼]                     │ │ │   repos: read, write    │ │ │
│  │                                     │ │ │                         │ │ │
│  │ ─────────────────────────────────── │ │ │ ☑ supabase-mcp         │ │ │
│  │                                     │ │ │   projects: admin       │ │ │
│  │ ALMA (SOUL.md)                     │ │ │                         │ │ │
│  │ ┌─────────────────────────────────┐ │ │ │ ☐ linear-mcp           │ │ │
│  │ │ Eres un desarrollador backend   │ │ │ └─────────────────────────┘ │ │
│  │ │ experto en Python, FastAPI y    │ │ │                             │ │
│  │ │ Supabase. Tu trabajo es...      │ │ │ ─────────────────────────── │ │
│  │ │                                 │ │ │                             │ │
│  │ └─────────────────────────────────┘ │ │ Webhooks                    │ │
│  │                                     │ │ ┌─────────────────────────┐ │ │
│  │ ─────────────────────────────────── │ │ │ URL: [              ]   │ │ │
│  │                                     │ │ │ Events: ☑ task_complete │ │ │
│  │ SKILLS                              │ │ │         ☑ task_blocked  │ │ │
│  │ ☑ backend-development              │ │ │         ☐ task_failed   │ │ │
│  │ ☑ database-operations              │ │ │ Secret: [********]       │ │ │
│  │ ☐ devops                          │ │ └─────────────────────────┘ │ │
│  │ ☐ testing                         │ │                             │ │
│  │                                     │ │ API Integrations            │ │
│  │ ─────────────────────────────────── │ │ ┌─────────────────────────┐ │ │
│  │                                     │ │ │ Linear API Key: [****]   │ │ │
│  │ TOOLS DISPONIBLES                  │ │ │ Slack Webhook: [****]    │ │ │
│  │ ☑ terminal                        │ │ │                         │ │ │
│  │ ☑ file                            │ │ │ [+ Add Integration]     │ │ │
│  │ ☐ web                             │ │ └─────────────────────────┘ │ │
│  │ ☐ browser                        │ │                             │ │
│  │ ☐ memory                         │ │                             │ │
│  └─────────────────────────────────────┘ └─────────────────────────────┘ │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Flujo de Onboarding

### 6.1 Onboarding de Organización

```
Step 1: Información básica
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│   Crea tu organización                                                    │
│   ─────────────────────────                                               │
│                                                                           │
│   Nombre de la organización                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐ │
│   │ Inteliside Studio                                                   │ │
│   └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│   Slug (URL identifier)                                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐ │
│   │ inteliside-studio                                                   │ │
│   └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│                                              [Siguiente →]                │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

Step 2: Objetivo inicial
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│   ¿Cuál es el objetivo principal?                                         │
│   ─────────────────────────────────                                       │
│                                                                           │
│   Este objetivo ayudará al CEO a entender la dirección de la empresa.    │
│   Puedes modificarlo más tarde.                                           │
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────────┐ │
│   │                                                                     │ │
│   │ Lanzar MVP de plataforma de gestión de agentes en Q2 2026          │ │
│   │                                                                     │ │
│   └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│                                              [Siguiente →]                │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

Step 3: Primer proyecto
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│   Crea tu primer proyecto                                                 │
│   ─────────────────────────────                                           │
│                                                                           │
│   Nombre del proyecto                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐ │
│   │ Hermes Multi-Agent Platform                                         │ │
│   └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│   Descripción (opcional)                                                  │
│   ┌─────────────────────────────────────────────────────────────────────┐ │
│   │ Desarrollo de la plataforma de orquestación multi-agente...         │ │
│   └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│                                              [Crear organización →]      │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Onboarding de Miembro (Junta Directiva)

```
Step 1: Bienvenida
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│   ¡Bienvenido a [Organización]!                                          │
│   ──────────────────────────────                                          │
│                                                                           │
│   Has sido invitado como miembro de la Junta Directiva.                   │
│                                                                           │
│   Como miembro de la junta, puedes:                                       │
│   • Delegar tareas estratégicas al CEO                                   │
│   • Aprobar decisiones que requieran confirmación                         │
│   • Configurar y gestionar agentes                                       │
│   • Ver el progreso de todos los proyectos                               │
│                                                                           │
│                                              [Siguiente →]                │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

Step 2: Responsabilidades
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│   Define tus responsabilidades                                            │
│   ─────────────────────────────────                                       │
│                                                                           │
│   El CEO usará esta información para saber a quién acudir                │
│   cuando necesite aprobación para decisiones específicas.                │
│                                                                           │
│   ¿Cuáles son tus áreas de responsabilidad?                              │
│   ☑ Estrategia de producto                                                │
│   ☑ Decisiones técnicas                                                   │
│   ☐ Finanzas y presupuesto                                                │
│   ☐ Marketing y ventas                                                    │
│   ☐ Recursos humanos                                                      │
│   ☑ Relaciones con clientes                                               │
│                                                                           │
│   Áreas de dominio específicas:                                           │
│   ┌─────────────────────────────────────────────────────────────────────┐ │
│   │ Desarrollo de software, Arquitectura de sistemas, UX/UI            │ │
│   └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│                                              [Completar →]                │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Integración con Hermes

### 7.1 Hermes Gateway API

La UI se comunica con Hermes a través de su Gateway API:

```typescript
// Configuración del cliente Hermes
const HERMES_API_URL = process.env.HERMES_API_URL || 'http://127.0.0.1:8642/v1';
const HERMES_API_KEY = process.env.HERMES_API_KEY;

// Endpoints disponibles
const endpoints = {
  chat: `${HERMES_API_URL}/chat/completions`,
  models: `${HERMES_API_URL}/models`,
  // Kanban operations via chat con tool calls
};
```

### 7.2 CEO Agent Profile

El CEO Agent es un Hermes Profile específico:

```yaml
# ~/.hermes/profiles/ceo-[org-slug]/config.yaml
model: "anthropic/claude-3.5-sonnet"
system_prompt: |
  Eres el CEO de {organization_name}.
  
  Tu objetivo principal: {objective}
  
  Responsabilidades:
  - Recibir instrucciones de la Junta Directiva
  - Descomponer objetivos en tareas
  - Delegar tareas a agentes especializados
  - Monitorear progreso y reportar
  - Escalar decisiones que requieran aprobación
  
  Reglas:
  - NO ejecutas tareas tú mismo
  - SIEMPRE delegas a especialistas
  - Bloqueas tareas que requieran aprobación humana
  - Reportas progreso en tiempo real

skills:
  - kanban-orchestrator
  
toolsets:
  - kanban
  - memory
  - gateway

# No acceso a terminal ni file operations
blocked_toolsets:
  - terminal
  - file
```

### 7.3 Worker Agent Profiles

Templates de agentes trabajadores:

```yaml
# ~/.hermes/profiles/[org-slug]-backend-dev/config.yaml
model: "anthropic/claude-3.5-sonnet"
system_prompt: |
  Eres un desarrollador backend especializado.
  
  Expertise: Python, FastAPI, Supabase, PostgreSQL
  Proyecto actual: {project_name}
  
  Tu trabajo: Implementar APIs, servicios, integraciones

skills:
  - kanban-worker
  - backend-development
  
toolsets:
  - terminal
  - file
  - web
  
mcp_servers:
  - name: supabase
    command: npx
    args: ["-y", "@supabase/mcp-server-supabase"]
    env:
      SUPABASE_URL: "${SUPABASE_URL}"
      SUPABASE_SERVICE_ROLE_KEY: "${SUPABASE_SERVICE_ROLE_KEY}"
```

---

## 8. API Endpoints (Next.js)

### 8.1 Autenticación

```typescript
// BetterAuth configuration
export const auth = betterauth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
});
```

### 8.2 API Routes

```typescript
// Organizaciones
GET    /api/organizations                    // List user's orgs
POST   /api/organizations                    // Create org
GET    /api/organizations/[id]               // Get org details
PUT    /api/organizations/[id]              // Update org
DELETE /api/organizations/[id]              // Delete org

// Miembros
GET    /api/organizations/[id]/members      // List members
POST   /api/organizations/[id]/members      // Invite member
PUT    /api/organizations/[id]/members/[uid] // Update member
DELETE /api/organizations/[id]/members/[uid] // Remove member

// Proyectos
GET    /api/organizations/[id]/projects     // List projects
POST   /api/organizations/[id]/projects     // Create project
GET    /api/projects/[id]                   // Get project
PUT    /api/projects/[id]                   // Update project
DELETE /api/projects/[id]                   // Delete project

// Tareas
GET    /api/projects/[id]/tasks             // List tasks
POST   /api/projects/[id]/tasks             // Create task (sync to Hermes)
GET    /api/tasks/[id]                      // Get task
PUT    /api/tasks/[id]                      // Update task (sync to Hermes)
DELETE /api/tasks/[id]                      // Delete task

// Agentes
GET    /api/organizations/[id]/agents        // List agents
POST   /api/organizations/[id]/agents       // Create agent
GET    /api/agents/[id]                     // Get agent
PUT    /api/agents/[id]                     // Update agent
DELETE /api/agents/[id]                     // Delete agent

// MCP Servers
GET    /api/organizations/[id]/mcp-servers  // List MCP configs
POST   /api/organizations/[id]/mcp-servers  // Create MCP config
PUT    /api/mcp-servers/[id]                // Update MCP config
DELETE /api/mcp-servers/[id]                // Delete MCP config

// Chat con CEO
POST   /api/chat                            // Stream chat with CEO
GET    /api/chat/history                    // Get chat history

// Notificaciones
GET    /api/notifications                   // List notifications
PUT    /api/notifications/[id]/read         // Mark as read

// Webhooks
POST   /api/webhooks/hermes                 // Hermes event webhook
POST   /api/webhooks/external               // External integrations
```

### 8.3 WebSocket Events

```typescript
// Real-time updates
ws://localhost:3000/api/ws

// Events
interface WSEvents {
  // Task updates
  'task:created': { task: Task };
  'task:updated': { task: Task; changes: Partial<Task> };
  'task:status_changed': { taskId: string; oldStatus: string; newStatus: string };
  'task:blocked': { taskId: string; reason: string; blockedBy: User };
  'task:completed': { taskId: string; summary: string };
  
  // Agent updates
  'agent:spawned': { agent: Agent; taskId: string };
  'agent:heartbeat': { agentId: string; note?: string };
  
  // Notifications
  'notification:new': { notification: Notification };
}
```

---

## 9. Notificaciones

### 9.1 Canales de Notificación

| Canal | Evento | Contenido |
|-------|--------|-----------|
| In-App | Tarea bloqueada | "La tarea '[nombre]' requiere tu aprobación" |
| In-App | Tarea completada | "La tarea '[nombre]' fue completada" |
| Email | Aprobación requerida | Resumen de tarea bloqueada + link |
| Telegram/Slack | (Configurable) | Notificaciones críticas |

### 9.2 Configuración de Notificaciones

```typescript
interface NotificationSettings {
  email: boolean;
  telegram?: string;  // chat_id
  slack?: string;     // webhook_url
  inApp: boolean;
}
```

---

## 10. Roadmap de Desarrollo

### Fase 1: MVP (4-6 semanas)

| Sprint | Entregables |
|--------|-------------|
| Sprint 1-2 | - Setup Next.js + BetterAuth + Postgres<br>- UI básica con Design System<br>- CRUD Organizaciones/Proyectos |
| Sprint 3-4 | - Integración Hermes Gateway API<br>- CEO Profile básico<br>- Kanban visual (sin drag-drop) |
| Sprint 5-6 | - Drag & drop (dnd-kit)<br>- Chat básico con CEO<br>- Sincronización Hermes ↔ Postgres |

### Fase 2: Agentes (3-4 semanas)

| Sprint | Entregables |
|--------|-------------|
| Sprint 7-8 | - CRUD Agentes<br>- Templates básicos<br>- MCP config UI |
| Sprint 9-10 | - Crear Hermes profiles dinámicamente<br>- Skills management<br>- Worker agents funcionales |

### Fase 3: Human-in-the-Loop (2-3 semanas)

| Sprint | Entregables |
|--------|-------------|
| Sprint 11-12 | - Sistema de aprobaciones<br>- Notificaciones in-app<br>- Email notifications |
| Sprint 13 | - Webhooks salientes<br>- Integración Telegram/Slack |

### Fase 4: Polish (2 semanas)

| Sprint | Entregables |
|--------|-------------|
| Sprint 14 | - Optimización WebSocket<br>- Error handling robusto<br>- Tests E2E |
| Sprint 15 | - Documentación<br>- Onboarding flow completo<br>- Deploy producción |

---

## 11. Consideraciones Técnicas

### 11.1 Sincronización Hermes Kanban

```
┌─────────────────────────────────────────────────────────────┐
│                    SYNC SERVICE                              │
│                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────┐  │
│  │ Postgres     │     │ Hermes       │     │ WebSocket   │  │
│  │ Tasks Table  │     │ kanban.db    │     │ Broadcast   │  │
│  └──────┬───────┘     └──────┬───────┘     └──────┬──────┘  │
│         │                    │                    │         │
│         │   Webhook/Event    │                    │         │
│         │ ◄──────────────────┤                    │         │
│         │                    │                    │         │
│         │   kanban_create    │                    │         │
│         ├───────────────────►│                    │         │
│         │                    │                    │         │
│         │                    │   task_events      │         │
│         │                    ├───────────────────►│         │
│         │                    │                    │         │
│         │                    │                    ▼         │
│         │                    │              [UI Updates]     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 11.2 Manejo de Estados

| Estado Hermes | Estado UI | Acción UI permitida |
|---------------|-----------|---------------------|
| triage | Triage | Mover a TODO, editar |
| todo | TODO | Mover a Ready, editar |
| ready | Ready | Mover a TODO/Running (dispatcher lo mueve) |
| running | Running | Solo ver (agente trabajando) |
| blocked | Blocked | Unblock, comentar |
| done | Done | Archivar, ver detalles |
| archived | Archived | Restaurar |

### 11.3 Seguridad

- **Auth:** BetterAuth con sesiones JWT
- **RBAC:** Middleware por organización y rol
- **Hermes Gateway:** API Key + restricción por profile
- **MCP Secrets:** Encriptados en Postgres, inyectados como env vars
- **CORS:** Restrictivo, solo dominios configurados

---

## 12. Métricas de Éxito

| Métrica | Target | Medición |
|---------|--------|----------|
| Tareas completadas por día | > 10 | Analytics interno |
| Tiempo de bloqueo promedio | < 2h | Delta blocked → unblocked |
| Uptime Hermes Gateway | > 99.5% | Health checks |
| Latencia WebSocket | < 100ms | Client-side metrics |
| NPS usuarios | > 50 | Encuesta trimestral |

---

## 13. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Hermes API inestable | Media | Alto | Fallback a SQLite directo + retry logic |
| Sincronización drift | Media | Medio | Health checks + reconsiliación periódica |
| Sobrecarga de agentes | Baja | Alto | Rate limiting + queue de dispatcher |
| Fugas de API keys | Baja | Crítico | Encriptación + rotation + audit logs |

---

## 14. Dependencias Críticas

### NPM Packages

```json
{
  "dependencies": {
    "next": "^16.0.0",
    "@better-auth/core": "^1.0.0",
    "@better-auth/prisma": "^1.0.0",
    "@prisma/client": "^5.0.0",
    "dnd-kit": "^6.0.0",
    "@ai-sdk/openai": "^1.0.0",
    "ai": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "@radix-ui/react-*": "latest",
    "ws": "^8.0.0"
  }
}
```

### Servicios Externos

- PostgreSQL 16+
- Hermes Agent (última versión)
- BetterAuth provider (self-hosted o cloud)
- Email service (Resend/SendGrid)
- (Opcional) Telegram Bot API
- (Opcional) Slack Webhooks

---

## Aprobación

| Rol | Nombre | Fecha | Firma |
|-----|--------|-------|-------|
| Product Owner | | | |
| Tech Lead | | | |
| Designer | | | |

---

## Anexos

### A. Hermes Gateway API Reference

Ver documentación: https://hermes-agent.nousresearch.com/docs/user-guide/messaging/

### B. Inteliside Design System

Ver archivos: `~/.claude/skills/inteliside-design/`

### C. Paperclip Reference

Ver documentación: https://docs.paperclip.ing/#/
