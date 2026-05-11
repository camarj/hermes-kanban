# ADR-0009: Skill Versioning — Always-Latest with Manual Re-pull

## Status

Accepted

## Context

Skills externas (GitHub) y curadas pueden cambiar upstream. ¿Cuándo actualizamos las copias locales?

Riesgos:
- **Auto-pull** abre la puerta a prompt-injection: un repo público actualizado a malicioso entre install y next-regen podría inyectar instrucciones a los agentes.
- **Sin versioning** los usuarios no saben qué versión están corriendo.
- **Semver complejo** requiere parsing + resolución, sobrecarga para v1.

## Decision

**Versionado simple sin semver, sin auto-pull**:

1. `Skill.sourceRef` guarda el commit SHA al momento del install (para `source = github`) o el `version` string del seed (para `source = curated`).
2. Las copias instaladas en orgs NUNCA se auto-actualizan.
3. UI muestra "Installed from commit abc1234 — Check for updates" (futuro — Fase 4).
4. Update path manual: el usuario re-ejecuta install desde la URL, opcionalmente con confirm-diff.
5. Skills curadas: cada bump de `seed-curated-skills.ts` actualiza el `version` field. Las copias en orgs **no** se tocan. Quien quiera la última versión, re-installa desde el marketplace (esto resetea cualquier customización local).

## Consequences

### Positive
- **Seguridad** — un repo público no puede inyectar prompts a agentes existentes.
- **Determinismo** — la skill que ejecuta el agente es exactamente la que está en DB. Cero sorpresas.
- **Simple** — sin parser de semver, sin lockfiles, sin resolución de dependencias.

### Negative
- **Updates manuales** — si una skill curada gets un bugfix importante, cada org tiene que re-install. Documentar en changelog.
- **Sin "show me the diff"** v1 — el usuario re-instala a ciegas o se va al repo. Plan: agregar diff modal en Fase 4.

### Neutral
- Skills custom no tienen "source upstream" — solo viven en DB. `sourceRef` queda null.

## Alternatives Considered

### Auto-pull en cada regen
- **Pros:** Siempre la última versión.
- **Cons:** Prompt-injection risk inaceptable. Latencia (cada regen hace HTTP a GitHub). Rate-limits.

### Semver con lockfile
- **Pros:** Updates predecibles, compatible con ecosistema npm-like.
- **Cons:** Skills no tienen ecosistema. Sobre-diseño.

### Pin a tag de GitHub en vez de commit SHA
- **Pros:** Más legible (`v1.2.3` vs `abc1234`).
- **Cons:** Tags se pueden mover en GitHub. SHA es inmutable.

## Related

- ADR-0005: Skill Storage Model
- `src/lib/skills/github-installer.ts` captura SHA al install
- `prisma/seed-curated-skills.ts` bumps de version
