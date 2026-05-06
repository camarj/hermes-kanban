# Hermes Integration

## Hermes Gateway API

### Configuración Base

```typescript
// lib/hermes/client.ts
const HERMES_API_URL = process.env.HERMES_API_URL || 'http://127.0.0.1:8642/v1';
const HERMES_API_KEY = process.env.HERMES_API_KEY;

export class HermesClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = HERMES_API_URL;
    this.apiKey = HERMES_API_KEY!;
  }

  async chat(messages: Message[], profile?: string) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        profile,
        stream: true,
      }),
    });
    return response;
  }
}
```

### Endpoints Disponibles

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/v1/models` | GET | Listar modelos disponibles |
| `/v1/chat/completions` | POST | Chat con agente (streaming) |
| `/health` | GET | Health check |

## CEO Agent Profile

### Estructura de Directorios

```
~/.hermes/
├── config.yaml
├── .env
└── profiles/
    └── ceo-[org-slug]/
        ├── config.yaml
        ├── SOUL.md
        └── skills/
```

### Configuración del CEO

```yaml
# ~/.hermes/profiles/ceo-[org-slug]/config.yaml

model: "anthropic/claude-3.5-sonnet"

system_prompt_file: SOUL.md

# Skills obligatorias
skills:
  - kanban-orchestrator
  - kanban-worker

# Toolsets disponibles (solo kanban operations)
toolsets:
  - kanban  # kanban_show, kanban_create, kanban_complete, etc.
  - memory
  - gateway

# Sin acceso a terminal ni archivos (NO ejecuta, solo orquesta)
blocked_toolsets:
  - terminal
  - file
  - web
  - browser

# Configuración de delegación
delegation:
  max_concurrent_children: 3
  max_spawn_depth: 1  # Flat, el CEO no delega a orchestrators
```

### SOUL.md Template

```markdown
# CEO Agent - {organization_name}

Eres el CEO de {organization_name}, una empresa de {industry}.

## Objetivo Principal
{objective}

## Tu Rol
No ejecutas tareas directamente. Tu trabajo es:
1. Recibir instrucciones de la Junta Directiva
2. Descomponer objetivos en tareas específicas
3. Delegar tareas a agentes especializados
4. Monitorear progreso y reportar
5. Escalar decisiones que requieran aprobación humana

## Reglas Inquebrantables
- NUNCA ejecutas tareas tú mismo (no tienes acceso a terminal)
- SIEMPRE delegas a especialistas
- Bloqueas tareas que requieran aprobación de la Junta
- Reportas progreso de forma clara y concisa

## Agentes Disponibles
{agents_list}

## Flujo de Trabajo
1. Recibes una instrucción del usuario
2. Analizas y descompones en tareas
3. Creas tareas con kanban_create
4. Asignas al agente especialista
5. Monitorea con kanban_show
6. Reportas resultados

## Decisiones que Requieren Aprobación
- Cambios que afecten producción
- Gastos mayores a $100
- Contratar/despedir agentes
- Cambios en objetivos de la empresa
- Cualquier decisión que menciones "requiere aprobación"

## Comunicación
- Clara y directa
- En español
- Sin emojis
- Usa markdown para estructurar
```

## Worker Agent Profiles

### Backend Developer

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
  - api-design
  
toolsets:
  - terminal
  - file
  - web
  - memory
  
mcp_servers:
  - name: supabase
    command: npx
    args: ["-y", "@supabase/mcp-server-supabase"]
    env:
      SUPABASE_URL: "${SUPABASE_URL}"
      SUPABASE_SERVICE_ROLE_KEY: "${SUPABASE_SERVICE_ROLE_KEY}"
```

### Frontend Developer

```yaml
# ~/.hermes/profiles/[org-slug]-frontend-dev/config.yaml

model: "anthropic/claude-3.5-sonnet"

system_prompt: |
  Eres un desarrollador frontend especializado.
  
  Expertise: React, Next.js, TypeScript, Tailwind CSS
  Design System: Inteliside (ver ~/.claude/skills/inteliside-design/)
  
  Tu trabajo: Implementar UIs, componentes, integraciones con APIs

skills:
  - kanban-worker
  - frontend-development
  - react-patterns
  
toolsets:
  - terminal
  - file
  - web
  - memory
```

### Researcher

```yaml
# ~/.hermes/profiles/[org-slug]-researcher/config.yaml

model: "anthropic/claude-3.5-sonnet"

system_prompt: |
  Eres un investigador especializado.
  
  Tu trabajo: Investigar tecnologías, mercados, competidores
  
  Output: Informes estructurados en markdown

skills:
  - kanban-worker
  - research-methodology
  
toolsets:
  - web
  - memory
  # Sin terminal ni file (solo investigación)
```

## Kanban Operations

### Crear Tarea (CEO)

```typescript
// CEO agent llama este tool
await hermesClient.callTool('kanban_create', {
  title: 'Implementar API de autenticación',
  body: 'Crear endpoints POST /register, POST /login, POST /logout',
  assignee: 'backend-dev',
  priority: 2,
  parents: ['t_research_auth'], // Dependencias
  board: 'mi-empresa', // org-slug
});
// Retorna: { task_id: 't_abc123', status: 'todo' }
```

### Completar Tarea (Worker)

```typescript
// Worker agent llama este tool
await hermesClient.callTool('kanban_complete', {
  summary: 'API de autenticación implementada con JWT',
  metadata: {
    changed_files: ['src/api/auth.ts', 'tests/auth.test.ts'],
    tests_run: 12,
    tests_passed: 12,
  },
});
```

### Bloquear Tarea (Worker)

```typescript
// Worker detecta que necesita aprobación
await hermesClient.callTool('kanban_block', {
  reason: 'Se requiere aprobación para deploy a producción. ¿Proceder?',
});
```

## Sincronización

### Webhook desde Hermes

```typescript
// app/api/webhooks/hermes/route.ts

export async function POST(req: Request) {
  const event = await req.json();
  
  // Verificar signature
  const signature = req.headers.get('x-hermes-signature');
  if (!verifySignature(signature, event)) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Procesar evento
  switch (event.type) {
    case 'task_created':
      await syncTaskToPostgres(event.data);
      break;
    case 'task_completed':
      await updateTaskInPostgres(event.data);
      await notifyBoardMembers(event.data);
      break;
    case 'task_blocked':
      await updateTaskInPostgres(event.data);
      await createNotification(event.data);
      break;
  }
  
  // Broadcast a clientes WebSocket
  broadcast(event.org_id, event.type, event.data);
  
  return new Response('OK', { status: 200 });
}
```

### Eventos de Hermes

| Evento | Trigger | Datos |
|--------|---------|-------|
| `task_created` | kanban_create | task_id, title, assignee |
| `task_updated` | Drag-drop, edit | task_id, changes |
| `task_completed` | kanban_complete | task_id, summary, metadata |
| `task_blocked` | kanban_block | task_id, reason |
| `task_unblocked` | kanban_unblock | task_id |
| `agent_spawned` | Dispatcher pickup | task_id, profile_name |

## Dispatcher Configuration

```yaml
# ~/.hermes/config.yaml

kanban:
  dispatch_in_gateway: true
  dispatch_interval_seconds: 60
  failure_limit: 3
```

### Comportamiento del Dispatcher

1. Cada 60 segundos, revisa tareas en estado `ready`
2. Verifica que el assignee (profile) existe
3. Spawnea un worker con el profile asignado
4. Worker lee tarea con `kanban_show()`
5. Ejecuta la tarea
6. Completa con `kanban_complete()` o bloquea con `kanban_block()`

## Creación Dinámica de Profiles

```typescript
// lib/hermes/profile-manager.ts

export class ProfileManager {
  async createAgentProfile(agent: Agent) {
    const profileDir = `${HERMES_HOME}/profiles/${agent.hermes_profile}`;
    
    // Crear directorio
    await fs.mkdir(profileDir, { recursive: true });
    
    // Escribir config.yaml
    const config = this.generateConfig(agent);
    await fs.writeFile(`${profileDir}/config.yaml`, yaml.stringify(config));
    
    // Escribir SOUL.md
    await fs.writeFile(`${profileDir}/SOUL.md`, agent.soul_content);
    
    // Configurar MCP servers si aplica
    if (agent.mcp_servers.length > 0) {
      await this.configureMCP(profileDir, agent.mcp_servers);
    }
  }
  
  private generateConfig(agent: Agent) {
    const config = {
      model: agent.model_override || 'anthropic/claude-3.5-sonnet',
      system_prompt_file: 'SOUL.md',
      skills: agent.skills,
      toolsets: agent.toolsets,
    };
    
    if (agent.role_type === 'ceo') {
      config.blocked_toolsets = ['terminal', 'file', 'web', 'browser'];
    }
    
    return config;
  }
}
```

## MCP Server Configuration

```typescript
// Ejemplo: Configurar Supabase MCP
const supabaseMCP = {
  name: 'supabase',
  transport: 'stdio',
  command: 'npx',
  args: ['-y', '@supabase/mcp-server-supabase'],
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  tools_filter: ['query', 'insert', 'update', 'delete'], // Solo estos tools
};
```

## Health Checks

```typescript
// Verificar que Hermes Gateway está vivo
export async function checkHermesHealth() {
  try {
    const response = await fetch(`${HERMES_API_URL}/health`, {
      timeout: 5000,
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Verificar que un profile existe
export async function checkProfileExists(profileName: string) {
  const profileDir = `${HERMES_HOME}/profiles/${profileName}`;
  return fs.exists(profileDir);
}
```

## Troubleshooting

### Problema: CEO no puede crear tareas

**Causa:** Profile no tiene skill `kanban-orchestrator`
**Solución:** Agregar skill al config.yaml del CEO

### Problema: Worker no tiene acceso a herramientas

**Causa:** Toolsets bloqueados o no configurados
**Solución:** Verificar `toolsets` y `blocked_toolsets` en config.yaml

### Problema: Sincronización desactualizada

**Causa:** Webhooks no llegan o fallan
**Solución:**
1. Verificar URL del webhook en Hermes
2. Revisar logs en `~/.hermes/logs/gateway.log`
3. Ejecutar reconciliación manual: `POST /api/sync/hermes`

### Problema: Dispatcher no spawnea workers

**Causa:** Gateway no corriendo o intervalo muy alto
**Solución:**
```bash
hermes gateway start
# Verificar en logs
tail -f ~/.hermes/logs/gateway.log
```
