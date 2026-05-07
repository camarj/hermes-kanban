import { hermesClient } from "./client"

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

export interface CreateProfileInput {
  profileName: string
  soulContent: string
  config: ProfileConfig
}

const CEO_BLOCKED_TOOLSETS = ["terminal", "file", "web", "browser"]
const CEO_ALLOWED_TOOLSETS = ["kanban", "memory", "gateway"]
const CEO_REQUIRED_SKILLS = ["kanban-orchestrator"]
const WORKER_REQUIRED_SKILLS = ["kanban-worker"]

export class ProfileManager {
  private hermesHome: string

  constructor() {
    this.hermesHome = hermesClient.hermesHomePath
  }

  /**
   * Create a Hermes profile for an agent.
   * Uses the Hermes CLI `hermes profile create` if available,
   * otherwise writes files directly to disk.
   */
  async createProfile(input: CreateProfileInput): Promise<{
    success: boolean
    profilePath: string
    method: "cli" | "filesystem"
  }> {
    const profilePath = `${this.hermesHome}/profiles/${input.profileName}`
    const profileDir = profilePath

    // Try CLI first
    const cliResult = await this.createViaCli(input)
    if (cliResult) {
      // CLI creates the profile, but we need to overwrite config.yaml and SOUL.md
      await this.writeProfileFiles(profileDir, input)
      return { success: true, profilePath: profileDir, method: "cli" }
    }

    // Fallback: write files directly
    await this.writeProfileFiles(profileDir, input)
    return { success: true, profilePath: profileDir, method: "filesystem" }
  }

  async deleteProfile(profileName: string): Promise<boolean> {
    const profilePath = `${this.hermesHome}/profiles/${profileName}`

    // Try CLI first
    try {
      const { exec } = await import("child_process")
      const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        exec(
          `hermes profile delete ${profileName} --yes`,
          { timeout: 10000 },
          (err, stdout, stderr) => {
            if (err) reject(err)
            else resolve({ stdout, stderr })
          },
        )
      })
      if (result.stdout.includes("deleted") || result.stdout.includes("removed")) {
        return true
      }
    } catch {
      // CLI not available, try filesystem
    }

    // Fallback: remove directory
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

  generateCEOConfig(): ProfileConfig {
    return {
      model: "anthropic/claude-sonnet-4",
      system_prompt_file: "SOUL.md",
      skills: CEO_REQUIRED_SKILLS,
      toolsets: CEO_ALLOWED_TOOLSETS,
      blocked_toolsets: CEO_BLOCKED_TOOLSETS,
      delegation: {
        max_concurrent_children: 3,
        max_spawn_depth: 1,
      },
    }
  }

  generateWorkerConfig(
    specialization: "backend" | "frontend" | "research" | "general",
    options?: { mcpServers?: McpServerConfig[] },
  ): ProfileConfig {
    const base: ProfileConfig = {
      model: "anthropic/claude-sonnet-4",
      system_prompt_file: "SOUL.md",
      skills: WORKER_REQUIRED_SKILLS,
      toolsets: ["terminal", "file", "web", "memory"],
    }

    switch (specialization) {
      case "backend":
        base.skills?.push("backend-development")
        base.mcp_servers = options?.mcpServers
        break
      case "frontend":
        base.skills?.push("frontend-development", "react-patterns")
        break
      case "research":
        base.skills?.push("research-methodology")
        base.toolsets = ["web", "memory"]
        break
      case "general":
        break
    }

    return base
  }

  generateSOULContent(
    roleType: "ceo" | "orchestrator" | "worker",
    data: {
      name: string
      orgName: string
      objective?: string
      agents?: Array<{ name: string; role: string; profile: string }>
    },
  ): string {
    if (roleType === "ceo") {
      return this.generateCEOSoul(data)
    }
    if (roleType === "orchestrator") {
      return this.generateOrchestratorSoul(data)
    }
    return this.generateWorkerSoul(data)
  }

  private generateCEOSoul(data: {
    name: string
    orgName: string
    objective?: string
    agents?: Array<{ name: string; role: string; profile: string }>
  }): string {
    const agentsList = data.agents?.map((a) => `- ${a.name} (${a.role}): @${a.profile}`).join("\n") || "No agents registered yet"

    return `# CEO Agent - ${data.orgName}

Eres el CEO de ${data.orgName}.

## Objetivo Principal
${data.objective || "Dirigir la organización de forma eficiente y alcanzar los objetivos estratégicos."}

## Tu Rol
No ejecutas tareas directamente. Tu trabajo es:
1. Recibir instrucciones de la Junta Directiva (usuarios humanos)
2. Descomponer objetivos en tareas específicas
3. Delegar tareas a agentes especializados usando kanban_create
4. Monitorear progreso con kanban_show
5. Escalar decisiones que requieran aprobación humana con kanban_block

## Reglas Inquebrantables
- NUNCA ejecutas tareas tú mismo (no tienes acceso a terminal)
- SIEMPRE delegas a especialistas
- Bloqueas tareas que requieran aprobación de la Junta
- Reportas progreso de forma clara y concisa
- Respondes siempre en el idioma del usuario

## Agentes Disponibles
${agentsList}

## Flujo de Trabajo
1. Recibes una instrucción del usuario
2. Analizas y descompones en tareas
3. Creas tareas con kanban_create (status: ready)
4. Asignas al agente especialista (assignee)
5. Monitoreas con kanban_show
6. Reportas resultados al usuario

## Decisiones que Requieren Aprobación
- Cambios que afecten producción
- Gastos mayores a $100
- Contratar/despedir agentes
- Cambios en objetivos de la empresa

## Comunicación
- Clara y directa
- Sin emojis
- Usa markdown para estructurar`
  }

  private generateOrchestratorSoul(data: {
    name: string
    orgName: string
    objective?: string
    agents?: Array<{ name: string; role: string; profile: string }>
  }): string {
    return `# Orchestrator - ${data.orgName}

Eres un orquestador de tareas para ${data.orgName}.

## Objetivo
${data.objective || "Coordinar múltiples agentes para completar tareas complejas."}

## Tu Rol
1. Recibir tareas del CEO o usuarios
2. Descomponer en subtareas
3. Asignar a agentes especializados
4. Coordinar dependencias entre tareas
5. Reportar progreso

## Herramientas
- kanban_show: Ver estado de tareas
- kanban_create: Crear nuevas tareas
- kanban_link: Crear dependencias
- kanban_comment: Agregar comentarios
- kanban_complete: Marcar como completado

## Comunicación
- Clara y directa
- Sin emojis
- En el idioma del usuario`
  }

  private generateWorkerSoul(data: {
    name: string
    orgName: string
    objective?: string
  }): string {
    return `# Worker Agent - ${data.name}

Eres ${data.name}, un agente trabajador de ${data.orgName}.

## Objetivo
${data.objective || "Completar las tareas asignadas de forma eficiente."}

## Tu Rol
1. Al iniciar, llama kanban_show() para ver tu tarea
2. Ejecuta el trabajo requerido
3. Envía heartbeat con kanban_heartbeat() si la tarea es larga
4. Al completar, usa kanban_complete() con summary y metadata
5. Si necesitas ayuda humana, usa kanban_block() con la razón

## Reglas
- Siempre completa las tareas asignadas
- Documenta tu trabajo en el summary
- Si algo falla, bloquea la tarea con la razón
- No crees nuevas tareas sin autorización

## Comunicación
- Clara y directa
- Sin emojis
- En el idioma del usuario`
  }

  private async writeProfileFiles(profileDir: string, input: CreateProfileInput): Promise<void> {
    const { writeFile, mkdir } = await import("fs/promises")
    const { join } = await import("path")

    await mkdir(profileDir, { recursive: true })

    // Write config.yaml
    const configYaml = this.serializeConfigYaml(input.config)
    await writeFile(join(profileDir, "config.yaml"), configYaml, "utf-8")

    // Write SOUL.md
    await writeFile(join(profileDir, "SOUL.md"), input.soulContent, "utf-8")

    // Create skills directory
    await mkdir(join(profileDir, "skills"), { recursive: true })
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