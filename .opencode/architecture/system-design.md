# System Design

## Arquitectura General

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

## Flujo de Datos Principal

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

## Flujo de Creación de Organización

```
1. Usuario completa formulario
   ├─ Nombre: "Mi Empresa"
   ├─ Slug: "mi-empresa"
   ├─ Objetivo: "..."
   └─ Primer proyecto: "Proyecto 1"
         │
         ▼
2. POST /api/organizations
   ├─ Validación de datos
   ├─ Verificar slug único
   └─ Crear registro en Postgres
         │
         ▼
3. Crear CEO Agent
   ├─ Generar profile en Hermes
   │   └─ ~/.hermes/profiles/ceo-mi-empresa/
   ├─ Crear SOUL.md con contexto de org
   └─ Asignar skill kanban-orchestrator
         │
         ▼
4. Crear proyecto inicial
   └─ INSERT INTO projects (org_id, name, ...)
         │
         ▼
5. Crear Kanban Board en Hermes
   └─ hermes kanban boards create mi-empresa
         │
         ▼
6. Redirigir a /dashboard
```

## Flujo de Delegación de Tarea

```
1. Board Member escribe en chat
   "Crea una API REST para autenticación"
         │
         ▼
2. POST /api/chat → Hermes Gateway API
   ├─ Profile: ceo-[org-slug]
   └─ Mensaje del usuario
         │
         ▼
3. CEO Agent procesa
   ├─ Analiza request
   ├─ Identifica que requiere backend-dev
   └─ Ejecuta kanban_create tool
         │
         ▼
4. Hermes Kanban
   ├─ Crea tarea con assignee="backend-dev"
   ├─ Estado: triage → todo → ready
   └─ Guarda en SQLite
         │
         ▼
5. Sincronización
   ├─ Webhook desde Hermes → POST /api/webhooks/hermes
   ├─ Crea mirror en Postgres.tasks
   └─ WebSocket broadcast a UIs conectadas
         │
         ▼
6. Dispatcher (Hermes Gateway)
   ├─ Detecta tarea ready
   ├─ Spawnea profile "backend-dev"
   └─ Worker ejecuta tarea
         │
         ▼
7. Worker completa
   ├─ kanban_complete(summary, metadata)
   ├─ Estado: done
   └─ Notificación a CEO + Board Members
```

## Flujo de Aprobación

```
1. Agente detecta decisión crítica
   └─ Llama kanban_block(reason="Necesita aprobación para...")
         │
         ▼
2. Tarea pasa a estado "blocked"
   ├─ Update en Hermes Kanban
   ├─ Sync a Postgres
   └─ WebSocket broadcast
         │
         ▼
3. Sistema de notificaciones
   ├─ Identificar board members relevantes
   │   └─ Según responsabilidades
   ├─ Crear notificación en Postgres
   ├─ Enviar email (si configurado)
   └─ In-app notification
         │
         ▼
4. Board Member ve notificación
   ├─ Click → Abre tarea en Kanban
   └─ Ve razón de bloqueo
         │
         ▼
5. Board Member aprueba
   ├─ PUT /api/tasks/[id]
   │   └─ { status: "ready", approval: true }
   ├─ Sync a Hermes: kanban_unblock
   └─ Notificar al agente
         │
         ▼
6. Agente continúa ejecución
   └─ Dispatcher pickup en próximo tick
```

## Sistema de WebSocket

```typescript
// Server-side (Next.js API Route)
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3001 });

const clients = new Map<string, Set<WebSocket>>();

// Broadcast a usuarios de una org
function broadcast(orgId: string, event: string, data: any) {
  const orgClients = clients.get(orgId);
  if (!orgClients) return;
  
  const message = JSON.stringify({ event, data });
  orgClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Eventos principales
events = {
  'task:created': { task: Task },
  'task:updated': { task: Task, changes: Partial<Task> },
  'task:status_changed': { taskId, oldStatus, newStatus },
  'task:blocked': { taskId, reason, blockedBy },
  'task:completed': { taskId, summary },
  'agent:spawned': { agent, taskId },
  'notification:new': { notification },
};
```

## Sincronización Hermes ↔ Postgres

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

### Reglas de Sincronización

| Evento | Source | Target | Acción |
|--------|--------|--------|--------|
| Crear tarea desde UI | UI | Postgres → Hermes | INSERT + kanban_create |
| Crear tarea desde Hermes | Hermes | Postgres | Webhook → INSERT |
| Actualizar estado drag-drop | UI | Postgres → Hermes | UPDATE + kanban_* tool |
| Agente completa tarea | Hermes | Postgres | Webhook → UPDATE |
| Tarea bloqueada | Hermes | Postgres | Webhook → UPDATE + notification |

## Estados de Tarea

```
triage ──► todo ──► ready ──► running ──► done
   │                   │          │
   │                   │          └──► blocked
   │                   │                   │
   └───────────────────┴───────────────────┘
```

### Transiciones Válidas

| Desde | Hacia | Trigger | Requiere Aprobación |
|-------|-------|---------|---------------------|
| triage | todo | Manual (board member) | No |
| triage | ready | Manual (board member) | No |
| todo | ready | Automático (sin dependencias) | No |
| ready | running | Dispatcher (assignee disponible) | No |
| running | done | Agente (kanban_complete) | No |
| running | blocked | Agente (kanban_block) | Sí |
| blocked | ready | Board member (unblock) | - |
| done | archived | Manual | No |

## Seguridad

### Autenticación

```typescript
// BetterAuth config
export const auth = betterauth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24,     // Actualizar cada día
  },
  rateLimit: {
    enabled: true,
    max: 100,
    window: 60,
  },
});
```

### Autorización (RBAC)

```typescript
// Middleware de autorización
export function requireRole(role: 'owner' | 'board' | 'member') {
  return async (req: NextRequest, context: { params: any }) => {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');
    
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        orgId: context.params.orgId,
      },
    });
    
    if (!membership) throw new Error('Forbidden');
    
    const roleHierarchy = { owner: 3, board: 2, member: 1 };
    if (roleHierarchy[membership.role] < roleHierarchy[role]) {
      throw new Error('Forbidden');
    }
    
    return { session, membership };
  };
}
```

### API Keys y Secrets

- MCP secrets encriptados con AES-256
- Webhook secrets hasheados con bcrypt
- Hermes API key en environment variables
- No logs de secrets, solo máscaras

## Performance

### Optimizaciones Frontend

- Virtualización de listas largas (+100 tareas)
- Lazy loading de componentes pesados
- Debounce de operaciones frecuentes (drag, search)
- WebSocket con reconnect y heartbeat
- Cache de queries con React Query

### Optimizaciones Backend

- Connection pooling PostgreSQL
- Índices en columnas frecuentes (org_id, project_id, status)
- Batch inserts/updates
- Webhook queue con retry
- CDN para assets estáticos
