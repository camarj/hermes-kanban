# Phase 3 Acceptance Criteria

## Edit agente

| # | Criterio | Verificado por |
|---|---|---|
| 1 | Botón Edit (Pencil icon) en cada agent card abre dialog pre-filled con nombre, descripción, SOUL, skills, MCPs. | E2E `agent-edit.spec.ts` |
| 2 | Cambiar SOUL → guardar → en < 2s el archivo `~/.hermes/profiles/{name}/SOUL.md` contiene el nuevo contenido. | Smoke test manual (Bloque 12) |
| 3 | Quitar una skill → guardar → `config.yaml` ya no la lista Y el directorio `skills/{nombre}/` desaparece. | Smoke test manual + unit `regenerate-agent.test.ts` |
| 4 | Agregar MCP a un worker → guardar → `config.yaml` tiene la entrada `mcp_servers` con el server. | Smoke test manual |
| 5 | Cambiar role/template → bloqueado en UI (no hay inputs); si se intenta via API directa con `{templateId: "x"}`, retorna 400. | Unit `patch-agent.test.ts` + E2E `agent-edit.spec.ts` |
| 6 | Si el agente está procesando una task (Hermes reporta run activo), la response trae `{ regen: { status: "deferred", jobId } }` y la UI muestra el banner correspondiente. | Unit `regenerate-agent.test.ts` |
| 7 | Cambios a `isActive` solo (toggle del switch) NO disparan regen — operación cheap. | Unit `patch-agent.test.ts` |

## Skills system

| # | Criterio | Verificado por |
|---|---|---|
| 1 | `/[orgSlug]/skills` muestra tabs Installed | Marketplace con counter en Installed. | E2E `skills-flow.spec.ts` |
| 2 | Crear skill custom (Simple): name + description + body → al guardar, row en DB con `source=custom`, `files = [{ path: "SKILL.md", content: <frontmatter+body> }]`. | E2E `skills-flow.spec.ts` + unit `skill-queries.test.ts` |
| 3 | Modo Avanzado del editor permite agregar tools.yaml / hooks.yaml / requirements.txt; cada uno persiste como file adicional. | Manual + unit (validation) |
| 4 | Marketplace: click Install en una skill curada → aparece en Installed con `source=curated`, `orgId=<org>`, `isPublic=false`. | E2E `skills-flow.spec.ts` + unit `install-curated.test.ts` |
| 5 | Install from GitHub: URL válida → preview muestra name/description parseados → confirm → row en DB con `source=github`, `sourceRef = commit SHA actual`. | Unit `github-installer.test.ts` (12 tests con mock fetch) + smoke manual |
| 6 | Attach skill a un agente → regen → directorio `skills/{name}/` aparece en `~/.hermes/profiles/{agent}/skills/` con todos los archivos. | Smoke test manual |
| 7 | Borrar skill que un agente usa → 409 con lista de agentes en `agentsUsing`. UI muestra banner bloqueante con los nombres. | Unit `skill-queries.test.ts` |
| 8 | Editar skill instalada → PATCH retorna `affectedAgents > 0` → cada agente afectado tiene un `ProfileRegenJob pending`. | Unit `skill-queries.test.ts` (via route handler integration) |

## MCP propagación

| # | Criterio | Verificado por |
|---|---|---|
| 1 | Editar env vars de un MCP que 2 agentes usan → response `{ affectedAgents: 2 }` → banner aparece en MCP page con auto-hide 8s. | E2E `mcp-propagation.spec.ts` |
| 2 | `GET /regen-jobs` retorna progreso (`pending → running → done`). | Unit + manual |
| 3 | Si un regen falla, status queda `failed` con `error`; botón Retry en banner re-encola con `status=pending`. | Unit `regen-drain.test.ts` |
| 4 | Dos edits rápidos del mismo MCP no duplican jobs: el segundo `create` falla con P2002 y se trata como `deduped`. | Unit `mcp-propagation.test.ts` |
| 5 | Agentes de **otras orgs** no se ven afectados — query scopea por `orgId`. | Unit `mcp-propagation.test.ts` |
| 6 | `RegenJobsBanner` en agents page hace polling cada 3s y muestra jobs activos con detalle expandible. | Manual + visual inspection |

## Hermes integration real

| # | Criterio | Verificado por |
|---|---|---|
| 1 | `ProfileManager.createProfile` usa staging dir + atomic rename. Tras un create exitoso, no quedan `.staging-*` en `~/.hermes/profiles/`. | Unit `profile-files-skills.test.ts` |
| 2 | `writeProfileFiles` con `skillBundles` crea sub-directorios `skills/{name}/` con cada archivo. | Unit `profile-files-skills.test.ts` |
| 3 | `hermesClient.isProfileBusy` retorna true si hay runs en `running` o `started` para el profile name. | Unit `hermes-client-runs.test.ts` |
| 4 | Edit de un agente idle dispara delete + create en orden estricto. | Unit `regenerate-agent.test.ts` |

## Coverage objetivo

- Unit tests: ≥ 80% lines/branches en `src/lib/skills/`, `src/lib/agents/regenerate-agent.ts`, `src/lib/agents/patch-agent.ts`, `src/lib/hermes/regen-drain.ts`, `src/lib/mcp/propagate.ts`.
- Integration: ≥ 60% lineas en route handlers.
- E2E: 3 specs cubren los 3 flows críticos. Github install se cubre por unit con mock fetch (12 tests dedicados).

## Pre-merge checklist

```bash
npx prisma migrate dev               # migraciones aplican limpio
npm run db:seed:curated-skills       # 8 skills curadas en DB
npm run test:unit:run                # 171+ tests verde
docker compose up hermes -d          # Hermes Gateway corriendo (smoke)
npm run test:e2e                     # Playwright verde
npm run lint                         # sin nuevos errores
npx tsc --noEmit                     # sin errores TS
```
