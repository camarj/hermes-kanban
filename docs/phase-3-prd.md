# Phase 3 PRD — Editable Agents, Skills System, MCP Propagation

## Por qué

Fase 2 dejó la plataforma en un estado donde los agentes se podían crear pero no se podían editar de manera efectiva. Tres brechas bloqueaban considerar la plataforma usable:

1. **Agentes congelados**: el endpoint PATCH existía pero no regeneraba el perfil en Hermes. SOUL, skills y MCPs quedaban congelados en el momento de creación.
2. **Sin sistema de skills**: `Agent.skills` era un `String[]` con nombres hardcodeados. Cero CRUD, cero marketplace, cero forma de extender el comportamiento de agentes via skills propias o de terceros.
3. **MCPs aislados de agentes**: el CRUD de MCP funcionaba, pero editar uno no propagaba el cambio a los agentes que lo referenciaban. La propagación era manual y silenciosa (los agentes seguían con valores viejos).

## Qué entrega Fase 3

### Agent edit completo
- UI `EditAgentDialog` con form pre-filled (nombre, descripción, SOUL, skills, MCPs).
- Role/template/level **locked** — para cambiar el rol, archivas el agente y creas uno nuevo.
- Tras guardar, la app regenera atómicamente el perfil de Hermes (delete + create con staging+rename — ver ADR-0006).
- Si el agente está ocupado con una task, el regen se difiere a un `ProfileRegenJob` y se procesa cuando el agente termina.

### Sistema de skills
- Tabla `Skill` con enum `source ∈ { custom, github, curated }` (ADR-0005).
- 3 flows de install:
  - **Custom**: form con name + description + body Markdown + (opcional) tools.yaml/hooks.yaml/requirements.txt. Serializa SKILL.md con frontmatter YAML.
  - **Marketplace**: catálogo curado seedeado en DB (`/api/skills/marketplace`). Click "Install to org" copia el row con `orgId` settled.
  - **GitHub**: input URL → preview parseado (dryRun) → confirm → fetch raw.githubusercontent.com con commit SHA capturado.
- 7 endpoints: GET/POST/PATCH/DELETE skills, install-github, install-curated, marketplace, regen-jobs (list + retry).
- Skills se despliegan al filesystem de Hermes per-profile (ADR-0007), no globales — garantiza aislamiento entre orgs.

### MCP propagation
- PATCH a un MCP server encola un `ProfileRegenJob` por cada agente que lo referencia (vía nuevo campo `Agent.mcpServerIds: String[]`).
- Drain in-process single-flight procesa los jobs uno a uno (ADR-0008).
- Dedup automático via partial unique index `(agentId) WHERE status='pending'`.
- UI banner en MCP page: "Regenerating N agents that use <server>".
- UI banner global en agents page: lista jobs activos con polling cada 3s, retry button para fallidos.

## Out of scope (queda para Fase 4)

- **Update from source** para skills curadas/github (re-pull con diff).
- **CEO pide hiring por skill** (agent_request mencionando skills).
- **Migración de role/template** (cambiar un worker a c-level).
- **Multi-instance lock** para el drain (Redis o pg advisory lock).
- **WebSocket real-time** para jobs (polling 3s suficiente v1).
- **Agent.tools / Agent.toolsets** editables (no son parte de las quejas del usuario).
- **Spy infra para E2E** que verifica filesystem state directo (los E2Es actuales verifican DB).

## Constraints arquitectónicas

- App y Hermes corren co-localizados (Docker compose con volumen `~/.hermes`) — Vercel/serverless está fuera de scope.
- Skills se resuelven por **nombre** en runtime de Hermes — `Agent.skills String[]` queda sin FK.
- MCP edits propagan asíncronamente. UX muestra el banner pero no bloquea la response.

## Métricas de éxito

- Editar SOUL de un agente: < 2s desde click "Save" hasta `~/.hermes/profiles/{name}/SOUL.md` actualizado.
- Editar MCP que 5 agentes usan: banner aparece inmediatamente, los 5 jobs se procesan secuencialmente sin user-action.
- Crear custom skill, attachearla a un agente: `~/.hermes/profiles/{agent}/skills/<skill-name>/SKILL.md` existe en filesystem.
- Test suite: ≥ 80% coverage unit, ≥ 60% integration (CLAUDE.md compliance).

## Commits de la Fase 3

```
be854e1  test(integration): delegacion CEO -> CTO -> Worker via executeKanbanTool   [Fase 2 - prerequisito]
<bloque 1>  feat(phase3): schema Skill + ProfileRegenJob + seed curated
<bloque 2>  feat(phase3): regen primitives (atomic rename + skill bundles + drain)
<bloque 3>  feat(phase3): skill primitives (parse SKILL.md + queries CRUD)
<bloque 4>  feat(phase3): API skills (7 endpoints + helpers)
<bloque 5>  feat(phase3): agent PATCH con regen + reject role/template changes
<bloque 6>  feat(phase3): MCP PATCH con propagacion a agentes afectados
<bloque 7>  feat(phase3): UI skills page (editor + marketplace + github installer)
<bloque 8>  feat(phase3): UI agent edit (dialog + skills-section + edit button)
<bloque 9>  feat(phase3): UI MCP propagation banner + global regen jobs banner
<bloque 10> test(e2e): 3 Playwright specs para flows criticos de Fase 3
```

Ver `docs/phase-3-acceptance-criteria.md` para los criterios de aceptación detallados.
