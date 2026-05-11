# ADR-0008: MCP Propagation via In-Process Job Queue

## Status

Accepted

## Context

Cuando un MCP server se edita (cambio de env vars, command, URL, etc.), todos los agentes que lo usan tienen perfiles desactualizados en Hermes. Antes de Fase 3, esto era invisible: el agente seguía corriendo con valores viejos hasta una recreación manual.

Requisitos:
- Editar un MCP debe regenerar todos los agentes afectados sin acción manual.
- Edits rápidos sucesivos del mismo MCP (typo + corrección) no deben encolar N×M jobs.
- Si un agente está ocupado con una task, su regen se difiere (ADR-0006).
- Si una regen falla, debe ser visible y reintentable.
- v1: una sola instancia de la app, no requiere coordinación entre nodes.

## Decision

**Cola in-process via tabla `ProfileRegenJob`** con drain single-flight.

```typescript
async function propagateMcpUpdate(orgId, serverId) {
  const agents = await prisma.agent.findMany({
    where: { orgId, mcpServerIds: { has: serverId }, isActive: true },
  })
  for (const a of agents) {
    try {
      await prisma.profileRegenJob.create({
        data: { agentId: a.id, reason: `mcp-edit:${serverId}`, status: "pending" }
      })
    } catch (err) {
      // P2002 = partial unique index dedupe
      if (err.code === "P2002") continue
      throw err
    }
  }
  if (agents.length > 0) kickRegenDrain() // fire-and-forget
}
```

**Partial unique index para dedup:**

```sql
CREATE UNIQUE INDEX "profile_regen_jobs_agentId_pending_unique"
  ON "profile_regen_jobs"("agentId") WHERE status = 'pending';
```

Dos edits rápidos del mismo MCP colapsan en un solo job pending — cuando el drain lo procesa, lee el snapshot final del MCP.

**Drain single-flight:**

```typescript
let processing = false
async function processNextJob() {
  if (processing) return false
  processing = true
  try {
    const job = await prisma.profileRegenJob.findFirst({
      where: { status: "pending" }, orderBy: { createdAt: "asc" }
    })
    if (!job) return false
    // mark running, call regenerateAgentProfile, mark done/failed
  } finally {
    processing = false
  }
}
```

## Consequences

### Positive
- **Dedup garantizado** — el unique index hace imposible tener dos jobs pending para el mismo agente. Edits sucesivos no inflan la cola.
- **Reintentable** — failed jobs persisten; el usuario puede ver el error y dar click en Retry, que pone status a `pending` y kickea el drain.
- **Sin dependencias externas** — sin Redis, sin BullMQ. Una tabla y un flag.
- **Deferred handling** — `regenerateAgentProfile` detecta si el profile está ocupado y crea job en status `deferred` directamente, sin pasar por la cola general (lo procesa cuando el agente termina).

### Negative
- **No-distribuido** — el `processing` flag vive en memoria de UN proceso de Node. Si en el futuro corremos múltiples instancias de la app, dos instancias podrían procesar el mismo job. Mitigación futura: Postgres advisory lock o BullMQ.
- **Failure handling simple** — un job failed queda failed hasta retry manual. Sin backoff exponencial, sin auto-retry. Aceptable porque la mayoría de fallos son user-action (env var mal escrito).
- **Latencia variable** — el drain solo se kickea desde la request que enqueue. Si nadie kickea (otros edits), los jobs deferred esperan que algo más los despierte.

### Neutral
- v1 es suficiente para single-tenant docker compose. Multi-instance requiere upgrade del lock.

## Alternatives Considered

### BullMQ con Redis
- **Pros:** Persistencia, retry policies, distributable.
- **Cons:** Nueva dependencia (Redis), complejidad de operación. Overkill para el volumen actual (single-digit MCPs, double-digit agents).

### Llamada síncrona en el PATCH endpoint
- **Pros:** Determinista, sin cola.
- **Cons:** Un edit de MCP que afecta 10 agentes bloquearía la response ~10 × N segundos. Bad UX.

### Trigger Postgres → NOTIFY/LISTEN
- **Pros:** No requiere kickear desde código.
- **Cons:** Cada subscriber necesita conexión Postgres con LISTEN. Más complejidad que el flag in-process.

## Related

- ADR-0006: Profile Regeneration Strategy
- `src/lib/mcp/propagate.ts`
- `src/lib/hermes/regen-drain.ts`
- `prisma/schema.prisma` ProfileRegenJob + partial unique index
