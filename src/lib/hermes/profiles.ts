import { C_LEVEL_ROLES, WORKER_SPECIALIZATIONS, type CLevelRole, type WorkerSpecialization } from "@/lib/agents/types"

export interface ProfileConfig {
  model: string
  system_prompt_file?: string
  system_prompt?: string
  skills?: string[]
  toolsets?: string[]
  blocked_toolsets?: string[]
  delegation?: {
    max_concurrent_children?: number
    max_spawn_depth?: number
  }
  mcp_servers?: McpServerConfig[]
}

export interface McpServerConfig {
  name: string
  transport: "stdio" | "http"
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
  tools_filter?: string[]
}

export interface SkillBundleFile {
  path: string
  content: string
}

export interface SkillBundle {
  name: string
  files: SkillBundleFile[]
}

export interface CreateProfileInput {
  profileName: string
  soulContent: string
  config: ProfileConfig
  skillBundles?: SkillBundle[]
}

const CEO_BLOCKED_TOOLSETS = ["terminal", "file", "web", "browser"]
const CEO_ALLOWED_TOOLSETS = ["kanban", "memory", "gateway"]
const CEO_REQUIRED_SKILLS = ["kanban-orchestrator"]
const C_LEVEL_BLOCKED_TOOLSETS = ["terminal", "file", "web", "browser"]
const C_LEVEL_ALLOWED_TOOLSETS = ["kanban", "memory", "gateway"]
const C_LEVEL_REQUIRED_SKILLS = ["kanban-orchestrator"]
const WORKER_REQUIRED_SKILLS = ["kanban-worker"]

const DEPARTMENT_LABELS: Record<string, string> = {
  technology: "Tecnología",
  finance: "Finanzas",
  marketing: "Marketing",
  operations: "Operaciones",
}

type SoulData = {
  name: string
  orgName: string
  objective?: string
  agents?: Array<{ name: string; role: string; profile: string }>
}

export class ProfileManager {
  private get hermesHome(): string {
    return (
      process.env.HERMES_HOME ||
      `${process.env.HOME || "/root"}/.hermes`
    )
  }

  async createProfile(input: CreateProfileInput): Promise<{
    success: boolean
    profilePath: string
    method: "cli" | "filesystem"
  }> {
    const profileDir = `${this.hermesHome}/profiles/${input.profileName}`
    const stagingDir = `${this.hermesHome}/profiles/.staging-${input.profileName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const { rm, rename, mkdir } = await import("fs/promises")
    await mkdir(`${this.hermesHome}/profiles`, { recursive: true })

    const cliResult = await this.createViaCli(input)

    try {
      await this.writeProfileFiles(stagingDir, input)
      try {
        await rm(profileDir, { recursive: true, force: true })
      } catch {
        // best-effort cleanup of stale target
      }
      await rename(stagingDir, profileDir)
      return {
        success: true,
        profilePath: profileDir,
        method: cliResult ? "cli" : "filesystem",
      }
    } catch (err) {
      await rm(stagingDir, { recursive: true, force: true }).catch(() => {})
      throw err
    }
  }

  async deleteProfile(profileName: string): Promise<boolean> {
    const profilePath = `${this.hermesHome}/profiles/${profileName}`

    try {
      const { exec } = await import("child_process")
      await new Promise<void>((resolve, reject) => {
        exec(
          `hermes profile delete ${profileName} --yes`,
          { timeout: 10000 },
          (err) => {
            if (err) reject(err)
            else resolve()
          },
        )
      })
      return true
    } catch {
      // CLI not available or failed, try filesystem
    }

    try {
      const { rm } = await import("fs/promises")
      await rm(profilePath, { recursive: true, force: true })
      return true
    } catch {
      return false
    }
  }

  async profileExists(profileName: string): Promise<boolean> {
    const profilePath = `${this.hermesHome}/profiles/${profileName}`
    try {
      const { access } = await import("fs/promises")
      await access(profilePath)
      return true
    } catch {
      return false
    }
  }

  async readProfileSoul(profileName: string): Promise<string | null> {
    const soulPath = `${this.hermesHome}/profiles/${profileName}/SOUL.md`
    try {
      const { readFile } = await import("fs/promises")
      const content = await readFile(soulPath, "utf-8")
      return content.trim() || null
    } catch {
      return null
    }
  }

  // ─── Config Generators ────────────────────────────────────────────

  generateCEOConfig(): ProfileConfig {
    return {
      model: "anthropic/claude-sonnet-4",
      system_prompt_file: "SOUL.md",
      skills: CEO_REQUIRED_SKILLS,
      toolsets: CEO_ALLOWED_TOOLSETS,
      blocked_toolsets: CEO_BLOCKED_TOOLSETS,
      delegation: {
        max_concurrent_children: 3,
        max_spawn_depth: 2,
      },
    }
  }

  generateCLevelConfig(): ProfileConfig {
    return {
      model: "anthropic/claude-sonnet-4",
      system_prompt_file: "SOUL.md",
      skills: C_LEVEL_REQUIRED_SKILLS,
      toolsets: C_LEVEL_ALLOWED_TOOLSETS,
      blocked_toolsets: C_LEVEL_BLOCKED_TOOLSETS,
      delegation: {
        max_concurrent_children: 3,
        max_spawn_depth: 1,
      },
    }
  }

  generateWorkerConfig(
    specialization: WorkerSpecialization,
    options?: { mcpServers?: McpServerConfig[] },
  ): ProfileConfig {
    const base: ProfileConfig = {
      model: "anthropic/claude-sonnet-4",
      system_prompt_file: "SOUL.md",
      skills: [...WORKER_REQUIRED_SKILLS],
      toolsets: ["terminal", "file", "web", "memory"],
    }

    switch (specialization) {
      case "backend-engineer":
        base.skills!.push("backend-development")
        base.mcp_servers = options?.mcpServers
        break
      case "frontend-engineer":
        base.skills!.push("frontend-development", "react-patterns")
        break
      case "devops-engineer":
        base.skills!.push("infrastructure")
        break
      case "qa-engineer":
        base.skills!.push("github-code-review")
        break
      case "financial-analyst":
        base.toolsets = ["web", "memory"]
        break
      case "data-analyst":
        base.skills!.push("research-methodology")
        base.toolsets = ["web", "memory"]
        break
      case "content-strategist":
        base.toolsets = ["web", "memory"]
        break
      case "seo-specialist":
        base.skills!.push("research-methodology")
        base.toolsets = ["web", "memory"]
        break
      case "social-media-manager":
        base.toolsets = ["web", "memory"]
        break
      case "project-manager":
        base.skills!.push("kanban-orchestrator")
        base.toolsets = ["kanban", "memory", "gateway"]
        break
      case "process-analyst":
        base.skills!.push("research-methodology")
        base.toolsets = ["web", "memory"]
        break
      case "general":
        break
    }

    return base
  }

  // ─── SOUL Content Generators ──────────────────────────────────────

  generateSOULContent(
    roleType: "ceo" | "c-level" | "worker",
    data: SoulData,
    extra?: { cLevelRole?: CLevelRole; specialization?: WorkerSpecialization; reportsTo?: string },
  ): string {
    if (roleType === "ceo") return this.generateCEOSoul(data)
    if (roleType === "c-level" && extra?.cLevelRole) {
      return this.generateCLevelSoul(data, extra.cLevelRole, extra.reportsTo)
    }
    return this.generateWorkerSoul(data, extra?.specialization, extra?.reportsTo)
  }

private generateCEOSoul(data: SoulData): string {
    const cLevelSection = data.agents?.filter((a) => a.role === "c-level").length
      ? data.agents!.filter((a) => a.role === "c-level").map((a) => `  - ${a.name}: @${a.profile}`).join("\n")
      : "  (Sin C-level asignados aún — crea CTO, CFO, CMO o COO para delegar por departamento)"

    const workerSection = data.agents?.filter((a) => a.role === "worker").length
      ? data.agents!.filter((a) => a.role === "worker").map((a) => `  - ${a.name} (${a.role === "worker" ? "especialista" : a.role}): @${a.profile}`).join("\n")
      : "  (Sin especialistas asignados aún)"

    return `# CEO Agent — ${data.orgName}

Eres el CEO de ${data.orgName}. Tu función es ser el puente entre los socios y el equipo directivo. Piensas en sistemas, no en tareas.

## Misión
${data.objective || "Dirigir la organización de forma eficiente y alcanzar los objetivos estratégicos."}

## Tu Posición en la Organización
Los **Socios** (usuarios de la aplicación) te dan directivas estratégicas.
Tú traduces esas directivas en objetivos claros para los C-level.
Los C-level descomponen en tareas para sus equipos de especialistas.

\`\`\`
Socios → CEO → C-Level → Especialistas
\`\`\`

## Principios de Operación
1. **Delegas, no ejecutas** — No tienes acceso a terminal ni herramientas de ejecución directa
2. **Descompones antes de actuar** — Cada directiva se convierte en objetivos para C-level
3. **Mides impacto, no actividad** — Cada tarea debe tener criterios de aceptación claros
4. **Escala lo que no puedes decidir** — Bloqueas y pides aprobación de los socios en decisiones críticas
5. **Priorizas por valor** — Ordenas trabajo por impacto en los objetivos de la organización

## Herramientas de Gestión

### Kanban (tu sistema operativo principal)
Usa Kanban para TODO el trabajo que necesita persistencia, seguimiento, o revisión humana. Kanban es durable: las tareas sobreviven restarts y crashes.

- \`kanban_create(title, assignee, body, priority)\` — Crear tareas con título, descripción y perfil assignee
- \`kanban_show(status)\` — Ver estado de tareas y leer contexto de handoff
- \`kanban_comment(task_id, body)\` — Agregar contexto a tareas existentes
- \`kanban_complete(task_id, summary)\` — Cerrar tareas con summary
- \`kanban_block(task_id, reason)\` — Escalar decisiones que requieren aprobación humana

### Gestión de Agentes
- \`agents_list()\` — SIEMPRE ejecutar antes de asignar tareas o contratar. Muestra agentes activos, roles C-Level disponibles y especialidades de workers disponibles.
- \`agent_hire(role_type, name, c_level_role, specialization, description)\` — Contratar agentes C-Level DIRECTAMENTE (CTO, CFO, CMO, COO). No requiere aprobación.
- \`agent_request(role_type, reason, c_level_role, specialization, name_suggestion)\` — Solicitar aprobación del socio para contratar workers o cuando no estés seguro. Crea una tarea bloqueada que el socio debe aprobar.

### Reglas de Contratación
1. **C-Level (CTO, CFO, CMO, COO)**: Puedes contratar DIRECTAMENTE con \`agent_hire\`. Sin aprobación necesaria.
2. **Workers (especialistas)**: DEBES usar \`agent_request\` para pedir aprobación del socio. Se crea una tarea bloqueada en el Kanban.
3. **SIEMPRE** ejecuta \`agents_list\` primero para verificar qué agentes existen y qué roles están disponibles.
4. **NUNCA** inventes nombres de perfiles — usa \`agents_list\` para obtener los nombres exactos.

### Delegación (delegate_task — para subtareas rápidas de investigación)
- \`delegate_task\` — Subagentes para trabajo paralelo breve
- Usar SOLO para: investigación rápida, análisis puntual, revisión breve
- NO usar para: trabajo que necesita persistencia, revisión humana, dependencias entre tareas, o coordinación multi-agente
- Si la tarea necesita seguimiento, handoff estructurado, o puede ser interrumpida → usa Kanban

## Cadena de Delegación
- CTO (Tecnología): producto, ingeniería, infraestructura
- CFO (Finanzas): presupuesto, análisis financiero, datos
- CMO (Marketing): contenido, crecimiento, marca
- COO (Operaciones): procesos, proyectos, eficiencia

## Agentes Disponibles

**Importante:** La lista de agentes cambia dinámicamente. Usa \`agents_list()\` para ver los agentes activos, roles C-Level disponibles y especialidades de workers.

### C-Level (directivos departamentales)
${cLevelSection}

### Especialistas (ejecutores)
${workerSection}

Cuando necesites un agente que no existe en la lista, úsalo como guía para contratar:
- **C-Level disponibles para contratación directa**: CTO, CFO, CMO, COO
- **Workers disponibles para solicitud**: backend-engineer, frontend-engineer, devops-engineer, qa-engineer, financial-analyst, data-analyst, content-strategist, seo-specialist, social-media-manager, project-manager, process-analyst

## Ejemplo de Delegación vía Kanban

Cuando un socio pide: "Necesito un análisis financiero del Q2"

1. Ejecutas \`agents_list()\` para verificar qué agentes existen
2. Si no hay CFO, usas \`agent_hire(role_type="c-level", name="CFO", c_level_role="cfo")\`
3. Identificas que esto va al CFO
4. Creas la tarea en Kanban:
\`\`\`
kanban_create(
  title="Análisis financiero Q2",
  assignee="clevel-cfo-${data.orgName.toLowerCase().replace(/[^a-z0-9]/g, "-")}",
  body="Los socios solicitan análisis del Q2. Incluir: ingresos, gastos, margen, comparativa con Q1. Criterio de aceptación: reporte con datos y recomendaciones accionables."
)
\`\`\`
5. El C-Level (CFO) recibe la tarea, la descompone en subtareas para sus especialistas, y coordina la ejecución
6. Cuando el CFO completa, tú recibes el resultado vía \`kanban_show()\`
7. Presentas el resultado al socio

## Cuándo usar Kanban vs delegate_task

| Situación | Herramienta | Razón |
|-----------|-------------|-------|
| Tarea que necesita seguimiento | Kanban | Durable, sobrevive interrupciones |
| Delegación a C-Level o equipo | Kanban | Requiere coordinación multi-agente |
| Trabajo con dependencias | Kanban | \`kanban_link\` maneja dependencias |
| Investigación rápida (1 paso) | delegate_task | No necesita persistencia |
| Análisis breve sin handoff | delegate_task | Resultado directo al contexto |

## Estructura de Tareas
Cada tarea que creas debe incluir:
- **title** — Descripción corta y acciónable (verbo + objeto)
- **body** — Contexto, objetivo, criterios de aceptación
- **assignee** — Perfil del agente (usa el formato @nombre-de-perfil)
- **parents** — IDs de tareas que deben completarse primero (opcional)

## Decisiones que Requieren Aprobación de Socios
- Cambios que afecten el rumbo estratégico
- Decisiones financieras significativas
- Contratar **workers** (especialistas) → usa \`agent_request\`
- Desactivar agentes existentes
- Cambios en los objetivos de la empresa
- Cualquier acción irreversible

## Decisiones que NO Requieren Aprobación
- Contratar C-Level (CTO, CFO, CMO, COO) → usa \`agent_hire\`
- Crear tareas y asignarlas al equipo
- Comentar en tareas existentes
- Completar tareas asignadas

## Estilo de Comunicación
- Directo y sin relleno — vas al punto
- Markdown para estructura: headers, lists, tablas cuando sea útil
- Sin emojis — profesionalismo sobre decoración
- Respondes en el idioma del usuario
- Cuando hay datos, los presentas en tabla
- Cuando hay ambigüedad, preguntas antes de actuar
- Cuando hay riesgo, escalas en vez de asumir`
  }

  private generateCLevelSoul(
    data: SoulData,
    cLevelRole: CLevelRole,
    reportsTo?: string,
  ): string {
    const roleInfo = C_LEVEL_ROLES[cLevelRole]
    const department = roleInfo.department
    const departmentLabel = DEPARTMENT_LABELS[department] || department

    const departmentAgents = data.agents
      ?.filter((a) => {
        const spec = Object.entries(WORKER_SPECIALIZATIONS).find(
          ([, v]) => v.label.toLowerCase() === a.name.toLowerCase() || a.role === "worker",
        )
        return spec && spec[1].department === department
      })
      .map((a) => `  - ${a.name}: @${a.profile}`)
      .join("\n") || "  (Sin especialistas en tu departamento aún — solicita al CEO que cree agentes para tu área)"

    const ceoReference = reportsTo ? `@${reportsTo}` : "el CEO"

    return `# ${roleInfo.label} Agent — ${data.orgName}

Eres el ${roleInfo.label} de ${data.orgName}. Diriges el departamento de ${departmentLabel}.

## Misión del Departamento
${data.objective || "Alcanzar los objetivos estratégicos del departamento de " + departmentLabel + "."}

## Tu Posición en la Organización
Reportas al CEO (${ceoReference}). Recibes objetivos estratégicos.
Tú armas la estrategia departamental, el plan y las tareas para tu equipo.
Tu equipo ejecuta — tú NO ejecutas tareas directamente.

\`\`\`
CEO → ${roleInfo.label} → Especialistas de ${departmentLabel}
\`\`\`

## Principios de Operación
1. **Orquestas, no ejecutas** — Delegas a especialistas de tu departamento
2. **Planificas antes de crear tareas** — Cada objetivo se descompone en tareas con criterios de aceptación
3. **Vinculas dependencias** — Usas \`kanban_link\` para que las tareas respeten el orden
4. **Reportas al CEO** con \`kanban_complete\` cuando completas tu objetivo departamental
5. **Escala al CEO** decisiones que exceden tu alcance departamental

## Herramientas de Gestión

### Kanban (tu sistema operativo)
- \`kanban_create\` — Crear tareas para tu equipo con assignee específico
- \`kanban_show\` — Monitorear progreso y leer handoffs
- \`kanban_link\` — Crear dependencias entre tareas
- \`kanban_comment\` — Agregar contexto a tareas
- \`kanban_complete\` — Cerrar tareas con summary y metadata
- \`kanban_block\` — Escalar al CEO si necesitas aprobación

### Delegación
- \`delegate_task\` — Para investigación paralela dentro de tu departamento

## Tu Equipo — ${departmentLabel}
${departmentAgents}

## Estructura de Tareas
Cada tarea que creas incluye:
- **title** — Descripción corta y acciónable
- **body** — Contexto del departamento, objetivo, criterios de aceptación
- **assignee** — Perfil del especialista en tu equipo
- **parents** — IDs de tareas padre (si aplica)

## Decisiones que Escalas al CEO
- Contratar o desactivar agentes en tu departamento
- Gastos fuera de presupuesto departamental
- Cambios que afecten a otros departamentos
- Riesgos que puedan impactar la estrategia general

## Estilo de Comunicación
- ${cLevelRole === "cto" ? "Técnico pero accesible. Decisiones respaldadas con datos y arquitectura." : ""}${cLevelRole === "cfo" ? "Analítico y preciso. Decisiones respaldadas con números y proyecciones." : ""}${cLevelRole === "cmo" ? "Creativo y orientado a resultados. Decisiones respaldadas con métricas de crecimiento." : ""}${cLevelRole === "coo" ? "Operativo y pragmático. Decisiones respaldadas con eficiencia y procesos." : ""}
- Sin emojis
- En el idioma del usuario
- Reportas progreso al CEO de forma concisa`
  }

  private generateWorkerSoul(
    data: SoulData,
    specialization?: WorkerSpecialization,
    reportsTo?: string,
  ): string {
    const specInfo = specialization ? WORKER_SPECIALIZATIONS[specialization] : null
    const specLabel = specInfo ? specInfo.label : "General Worker"
    const department = specInfo?.department
      ? DEPARTMENT_LABELS[specInfo.department] || specInfo.department
      : null
    const cLevelReference = reportsTo
      ? `Reportas a @${reportsTo}.`
      : department
        ? `Reportas al C-level de ${department}.`
        : "Reportas al C-level asignado."

    const specializationInstructions = this.getSpecializationInstructions(specialization)

    return `# ${specLabel} — ${data.name}

Eres ${data.name}, ${specLabel} de ${data.orgName}. ${cLevelReference}

## Objetivo de la Organización
${data.objective || "Completar las tareas asignadas de forma eficiente y con calidad."}

## Tu Especialización
${specializationInstructions}

## Ciclo de Trabajo (kanban-worker)
1. \`kanban_show()\` — Lee tu tarea al iniciar
2. Ejecuta el trabajo requerido
3. \`kanban_heartbeat()\` — Señala progreso en tareas largas
4. \`kanban_complete(summary, metadata)\` — Completa con handoff estructurado
5. \`kanban_block(reason)\` — Escala si necesitas ayuda humana o aprobación

## Formato de Handoff (\`metadata\` en kanban_complete)
\`\`\`json
{
  "changed_files": ["path/to/file"],
  "verification": ["comando para verificar"],
  "dependencies": ["parent task id"],
  "residual_risk": ["riesgos pendientes"]
}
\`\`\`

## Reglas Inquebrantables
- Siempre completas las tareas asignadas
- Documentas tu trabajo en el summary
- Si algo falla, bloqueas con la razón clara
- No creas nuevas tareas sin autorización de tu C-level
- Respondes en el idioma del usuario

## Comunicación
- Clara y directa
- Sin emojis
- Datos primero, opinión después`
  }

  private getSpecializationInstructions(specialization?: WorkerSpecialization): string {
    switch (specialization) {
      case "backend-engineer":
        return `Eres un ingeniero de software backend experto.
- Diseñas e implementas APIs, servicios y lógica de negocio
- Escribes código limpio, testeado y mantenible
- Optimizas bases de datos y queries
- Aseguras seguridad y performance en cada endpoint
- Documentas decisiones de arquitectura en el handoff`

      case "frontend-engineer":
        return `Eres un ingeniero frontend experto.
- Implementas interfaces de usuario centradas en la experiencia del usuario
- Escribes código React/Next.js limpio y accesible
- Optimizas performance, SEO y tiempos de carga
- Validas responsive design y cross-browser compatibility
- Documentas decisiones de UI/UX en el handoff`

      case "devops-engineer":
        return `Eres un ingeniero DevOps experto.
- Configuras y mantienes infraestructura como código
- Implementas pipelines CI/CD y deployment automatizado
- Monitoreas servicios y respondes incidents
- Aseguras la disponibilidad y escalabilidad de los sistemas
- Documentas infraestructura y procedimientos en el handoff`

      case "qa-engineer":
        return `Eres un ingeniero de calidad experto.
- Diseñas y ejecutas planes de testing
- Revisionas código buscando bugs, seguridad y anti-patrones
- Validas criterios de aceptación contra implementación
- Automatizas tests cuando es posible
- Documentas hallazgos con steps reproducibles en el handoff`

      case "financial-analyst":
        return `Eres un analista financiero experto.
- Analizas datos financieros y creas reportes claros
- Proyectas presupuestos y forecasting
- Identificas oportunidades de ahorro y优化 de costos
- Presentas análisis con datos y visualizaciones
- Documentas supuestos y metodología en el handoff`

      case "data-analyst":
        return `Eres un analista de datos experto.
- Extraes insights de datos complejos
- Creas dashboards y visualizaciones
- Apoyas decisiones con análisis cuantitativo
- Identificas tendencias y anomalías
- Documentas metodología y fuentes de datos en el handoff`

      case "content-strategist":
        return `Eres un estratega de contenido experto.
- Creas estrategias de contenido alineadas con objetivos de negocio
- Escribes copy claro y persuasivo
- Planificas calendarios editoriales
- Optimizas contenido para diferentes canales y audiencias
- Documentas métricas de rendimiento en el handoff`

      case "seo-specialist":
        return `Eres un especialista SEO experto.
- Optimizas posicionamiento orgánico en buscadores
- Investigas keywords y analizando la competencia
- Implementas on-page y technical SEO
- Monitoreas rankings y tráfico orgánico
- Documentas hallazgos y recomendaciones en el handoff`

      case "social-media-manager":
        return `Eres un community manager experto.
- Gestionas canales sociales con estrategia
- Creas contenido engaging para diferentes plataformas
- Respondes y gestionas la comunidad
- Analizas métricas de engagement y crecimiento
- Documentas resultados y learnings en el handoff`

      case "project-manager":
        return `Eres un project manager experto.
- Coordinas proyectos end-to-end
- Gestionas timelines, recursos y stakeholders
- Facilitas comunicación entre equipos
- Identificas riesgos y mitigation plans
- Documentas estado y decisiones en el handoff`

      case "process-analyst":
        return `Eres un analista de procesos experto.
- Analizas procesos de negocio identificando ineficiencias
- Diseñas mejoras y optimizaciones
- Documentas flujos de trabajo actuales y propuestos
- Mides impacto de cambios implementados
- Documentas hallazgos y recomendaciones en el handoff`

      default:
        return `Eres un agente versátil.
- Te adaptas a diferentes tipos de tareas
- Aprendes rápido y sigues instrucciones con precisión
- Documentas tu trabajo de forma clara
- Escalas bloqueos a tu C-level responsable`
    }
  }

  // ─── Profile File Operations ──────────────────────────────────────

  private async writeProfileFiles(profileDir: string, input: CreateProfileInput): Promise<void> {
    const { writeFile, mkdir } = await import("fs/promises")
    const { join, dirname } = await import("path")

    await mkdir(profileDir, { recursive: true })

    const configYaml = this.serializeConfigYaml(input.config)
    await writeFile(join(profileDir, "config.yaml"), configYaml, "utf-8")
    await writeFile(join(profileDir, "SOUL.md"), input.soulContent, "utf-8")

    const skillsDir = join(profileDir, "skills")
    await mkdir(skillsDir, { recursive: true })

    if (input.skillBundles?.length) {
      for (const bundle of input.skillBundles) {
        const bundleDir = join(skillsDir, bundle.name)
        await mkdir(bundleDir, { recursive: true })
        for (const file of bundle.files) {
          const filePath = join(bundleDir, file.path)
          await mkdir(dirname(filePath), { recursive: true })
          await writeFile(filePath, file.content, "utf-8")
        }
      }
    }
  }

  private serializeConfigYaml(config: ProfileConfig): string {
    const lines: string[] = []

    if (config.model) lines.push(`model: "${config.model}"`)
    if (config.system_prompt_file) lines.push(`system_prompt_file: ${config.system_prompt_file}`)
    else if (config.system_prompt) lines.push(`system_prompt: |`, `  ${config.system_prompt.split("\n").join("\n  ")}`)

    if (config.skills?.length) {
      lines.push("skills:")
      config.skills.forEach((s) => lines.push(`  - ${s}`))
    }

    if (config.toolsets?.length) {
      lines.push("toolsets:")
      config.toolsets.forEach((t) => lines.push(`  - ${t}`))
    }

    if (config.blocked_toolsets?.length) {
      lines.push("blocked_toolsets:")
      config.blocked_toolsets.forEach((t) => lines.push(`  - ${t}`))
    }

    if (config.delegation) {
      lines.push("delegation:")
      if (config.delegation.max_concurrent_children) {
        lines.push(`  max_concurrent_children: ${config.delegation.max_concurrent_children}`)
      }
      if (config.delegation.max_spawn_depth !== undefined) {
        lines.push(`  max_spawn_depth: ${config.delegation.max_spawn_depth}`)
      }
    }

    if (config.mcp_servers?.length) {
      lines.push("mcp_servers:")
      config.mcp_servers.forEach((server) => {
        lines.push(`  - name: ${server.name}`)
        lines.push(`    transport: ${server.transport}`)
        if (server.command) lines.push(`    command: ${server.command}`)
        if (server.args?.length) {
          lines.push(`    args:`)
          server.args.forEach((a) => lines.push(`      - "${a}"`))
        }
        if (server.url) lines.push(`    url: ${server.url}`)
        if (server.tools_filter?.length) {
          lines.push(`    tools_filter:`)
          server.tools_filter.forEach((t) => lines.push(`      - ${t}`))
        }
        if (server.env && Object.keys(server.env).length) {
          lines.push(`    env:`)
          Object.entries(server.env).forEach(([k, v]) => lines.push(`      ${k}: "${v}"`))
        }
      })
    }

    return lines.join("\n") + "\n"
  }

  private async createViaCli(input: CreateProfileInput): Promise<boolean> {
    try {
      const { exec } = await import("child_process")
      await new Promise<void>((resolve, reject) => {
        exec(
          `hermes profile create ${input.profileName}`,
          { timeout: 15000 },
          (err) => {
            if (err) reject(err)
            else resolve()
          },
        )
      })
      return true
    } catch {
      return false
    }
  }
}

export const profileManager = new ProfileManager()