# ADR-0005: Skill Storage Model

## Status

Accepted

## Context

Fase 3 introduce un sistema de skills que permite tres flujos:
1. **Custom skills** — el usuario crea skills personalizadas en la UI.
2. **Marketplace curado** — un catálogo de skills oficiales que la organización puede "instalar".
3. **GitHub install** — skills desde URLs públicas de GitHub.

Necesitamos un modelo de datos que soporte los tres flujos sin sobre-diseñar.

Restricciones:
- Hermes resuelve skills por **nombre** desde el directorio `~/.hermes/profiles/{name}/skills/{skill-name}/` en runtime. El "name" es el contract con Hermes.
- Una skill curada no debe permitir modificación accidental entre orgs.
- Postgres trata `NULL` como distinct en `UNIQUE`, lo que complica usar `orgId` nullable como parte de un compound unique.

## Decision

Una sola tabla `Skill` con un enum `SkillSource ∈ { custom, github, curated }`:

```prisma
model Skill {
  id            String       @id @default(cuid())
  orgId         String?      // null = catalogo publico curado
  name          String       // matches dir name en skills/
  description   String?
  source        SkillSource
  sourceUrl     String?
  sourceRef     String?      // commit SHA (para github)
  version       String       @default("1.0.0")
  isPublic      Boolean      @default(false)
  files         Json
  triggers      String[]
  userInvocable Boolean      @default(false)
  ...
  @@unique([orgId, name])
}
```

- Skills **curadas** se seedean (`orgId = null`, `isPublic = true`, `source = curated`).
- "Instalar" una skill curada en un org **copia el row** a `orgId = <org>` con `source = curated`. Esto permite forks per-org sin afectar el catálogo público.
- Skills **custom** y **github** siempre tienen `orgId` settled, `isPublic = false`.

`Agent.skills String[]` queda como está — una lista de **nombres**. Hermes resuelve por nombre, no por ID. Meter FKs crea impedancia con la resolución de Hermes y obligaría a JOINs en cada regen.

## Consequences

### Positive
- Modelo simple: 1 tabla, 1 enum, 1 unique compound.
- "Install curated" es literalmente copiar el row con `orgId` settled — fácil de razonar.
- Borrar una skill curada del seed NO afecta las copias en orgs (cascada solo va desde Organization).
- Migración aditiva, sin tocar `Agent`.

### Negative
- Duplicación de contenido: cada org que instala `react-patterns` guarda su propio `files` JSON. Para 100 orgs son 100 copias de los mismos ~5KB. Aceptable a esta escala.
- Updates al seed curado no propagan a copias instaladas hasta que el usuario haga "Update from source" (Fase 4).

### Neutral
- `@@unique([orgId, name])` no enforcea unicidad entre rows curadas (NULL ≠ NULL en Postgres). El seed-curated-skills.ts hace `deleteMany` + `createMany` para garantizar idempotencia.

## Alternatives Considered

### M:N table `AgentSkill`
- **Pros:** FK refs, evita string-matching.
- **Cons:** Hermes resuelve por name; agregamos JOIN sin beneficio. Si el name cambia (rename), igual rompemos la referencia en el filesystem de Hermes.

### Skills curadas como constantes TS (sin DB)
- **Pros:** Cero DB para el marketplace.
- **Cons:** "Install" tendría que hacer una conversión TS → DB row. Forks per-org requerirían lookup en dos lugares. Más complejidad que beneficio.

### Tabla separada `SkillMarketplace`
- **Pros:** Separación clara.
- **Cons:** Endpoints duplicados (`/marketplace` vs `/skills`), conversión en cada install. La discriminada via enum es más limpia.

## Related

- ADR-0007: Skill Deployment to Hermes Filesystem
- `prisma/schema.prisma` modelo Skill
- `src/lib/skills/queries.ts`
- `src/lib/skills/install-curated.ts`
- `src/lib/skills/github-installer.ts`
- `src/lib/skills/curated-catalog.ts` (seed)
