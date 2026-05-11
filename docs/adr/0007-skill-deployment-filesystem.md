# ADR-0007: Skill Deployment to Hermes via Per-Profile Filesystem

## Status

Accepted

## Context

Hermes soporta skills en dos scopes:
1. **Global** — `~/.hermes/skills/{name}/` — instalado via CLI `hermes skills install <name>`. Compartido entre todos los profiles del mismo host.
2. **Per-profile** — `~/.hermes/profiles/{profile-name}/skills/{name}/` — específico a un profile.

Necesitamos decidir dónde escribir las skills cuando un agente las usa.

Restricciones:
- Multi-tenancy: la org A no debe ver/usar las skills custom de la org B.
- Custom skills nuevas (creadas en la UI) no están en ningún registro global de Hermes.
- Cada agente puede tener un conjunto distinto de skills.

## Decision

**Deployment per-profile**: extender `ProfileManager.writeProfileFiles` para aceptar `skillBundles: SkillBundle[]`, donde cada bundle escribe sus archivos en `{profileDir}/skills/{skill-name}/`.

```typescript
interface SkillBundle {
  name: string
  files: Array<{ path: string; content: string }>
}

private async writeProfileFiles(profileDir, input) {
  // ... write config.yaml + SOUL.md
  await mkdir(join(profileDir, "skills"), { recursive: true })
  for (const bundle of input.skillBundles ?? []) {
    const bundleDir = join(profileDir, "skills", bundle.name)
    for (const file of bundle.files) {
      const filePath = join(bundleDir, file.path)
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, file.content, "utf-8")
    }
  }
}
```

**NO** usar `hermes skills install` CLI: instala global y rompe el aislamiento entre orgs.

## Consequences

### Positive
- **Aislamiento garantizado** — org A puede tener `react-patterns` con prompt X mientras org B tiene `react-patterns` con prompt Y. Cero interferencia.
- **Determinismo** — el contenido de la skill que se ejecuta es exactamente lo que persistimos en DB. Sin sorpresas de "hermes pulled updates".
- **Atomic con la regen** — la skill se despliega como parte del staging-rename del perfil (ADR-0006). Si la regen falla, la skill queda atómicamente intacta.
- **Simplicidad** — no hay sync separado entre DB y Hermes para skills.

### Negative
- **Duplicación en disco** — si 5 agentes en una org usan la misma skill, hay 5 copias del SKILL.md. ~5KB por skill, despreciable a esta escala.
- **Re-deploy en cada regen** — incluso si la skill no cambió, se reescribe. Optimización futura: hash comparison antes de write.

### Neutral
- Esto significa que ediar una skill no actualiza inmediatamente los agentes — necesitas regenerar cada agente que la usa. La propagación se hace via `ProfileRegenJob` (ADR-0008).

## Alternatives Considered

### Skills globales con `hermes skills install`
- **Pros:** Una sola copia por host. Hermes maneja el lifecycle.
- **Cons:** Sin aislamiento entre orgs — orgs comparten skills, rompe multi-tenancy.

### Symlinks a una storage centralizada
- **Pros:** Sin duplicación.
- **Cons:** Edits a la skill afectan a todos los profiles inmediatamente, sin pasar por la regen atómica. Diff vs prompt injection risk.

### Hermes API para upload de skills
- **Pros:** Sin necesidad de compartir filesystem.
- **Cons:** Hermes no expone tal API. Implementarla en Hermes está fuera de scope.

## Related

- ADR-0005: Skill Storage Model
- ADR-0006: Profile Regeneration Strategy
- `src/lib/hermes/profiles.ts` writeProfileFiles
- `src/lib/agents/regenerate-agent.ts` build SkillBundles desde Skill rows
