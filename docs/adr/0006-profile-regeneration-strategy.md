# ADR-0006: Profile Regeneration via Atomic Delete+Create

## Status

Accepted

## Context

Cuando un agente cambia (nombre, descripción, SOUL, skills, MCPs), el perfil en Hermes (`~/.hermes/profiles/{name}/`) tiene que reflejar esos cambios. Hermes no expone una operación atómica de "update profile" — solo `hermes profile create` y `hermes profile delete` por CLI, además de escritura directa al filesystem.

Restricciones:
- El `profileName` debe permanecer constante: cualquier task assignada al agente lo referencia por nombre.
- Una regeneración no debe interrumpir tasks en curso del agente.
- Si delete succeeds pero create falla, el agente queda en estado roto (sin perfil) hasta que un proceso lo arregle.
- La app y Hermes comparten filesystem (Docker compose con volumen `~/.hermes`), no hay HTTP profile API.

## Decision

**Estrategia atómica via staging dir + rename:**

```typescript
async createProfile(input) {
  const finalDir = `${hermesHome}/profiles/${name}`
  const stagingDir = `${hermesHome}/profiles/.staging-${name}-${ts}-${rand}`

  await writeProfileFiles(stagingDir, input)    // config.yaml + SOUL.md + skills/*
  await rm(finalDir, { recursive, force })       // best-effort cleanup
  await rename(stagingDir, finalDir)             // POSIX rename: atomic on same FS
}
```

**Detección de "agente ocupado" antes de regenerar:**

```typescript
const busy = await hermesClient.isProfileBusy(profileName)
if (busy) {
  await prisma.profileRegenJob.create({ status: "deferred", ... })
  return { status: "deferred", jobId }
}
// proceed with delete+create
```

`isProfileBusy` consulta `GET /v1/runs?profile=<name>` y filtra por `status IN (running, started)`.

## Consequences

### Positive
- **Atomicidad real** — POSIX `rename()` sobre el mismo filesystem es atómico. Si el create falla, el staging dir se borra y el viejo perfil queda intacto.
- **Sin downtime** — el agente nunca queda sin perfil mientras la regen está en curso.
- **Composable** — la misma primitiva soporta agent-edit, skill-edit, mcp-edit. Cada caller solo dice "regenera para esta razón".
- **Deferred** — agentes ocupados se procesan después; el usuario no pierde el edit.

### Negative
- **Single-host assumption** — staging+rename solo funciona si app y Hermes comparten el filesystem. Vercel/serverless queda fuera de scope (ya documentado en ADR-0001).
- **Race condition teórica** — dos regens concurrentes para el mismo profile pueden hacer staging en paralelo; el último rename gana. Pérdida silenciosa de cambios. Mitigado por single-flight drain (ADR-0008).
- **CLI shellout best-effort** — `createProfile` aún intenta `hermes profile create` (para metadatos extra que la CLI hace), pero ignora errores. El filesystem write es el source of truth.

### Neutral
- Skills se incluyen en `writeProfileFiles` como sub-directorios (ADR-0007).

## Alternatives Considered

### In-place update sin staging
- **Pros:** Menos código.
- **Cons:** Si create falla a mitad de camino, el perfil queda corrupto. Ningún rollback.

### Lock file + atomic update
- **Pros:** Bloquea regens concurrentes en disco.
- **Cons:** Locks de filesystem en Docker son frágiles (NFS / overlay drivers); la single-flight en proceso (ADR-0008) cubre el caso real.

### Llamar al CLI siempre (sin filesystem write)
- **Pros:** Hermes maneja todo.
- **Cons:** La CLI no soporta `update`. Para cada edit habría que `delete` + `create`, ya hace lo que necesitamos pero sin atomicidad ni control.

## Related

- ADR-0007: Skill Deployment to Hermes Filesystem
- ADR-0008: MCP Propagation Queue
- `src/lib/hermes/profiles.ts` ProfileManager
- `src/lib/agents/regenerate-agent.ts`
