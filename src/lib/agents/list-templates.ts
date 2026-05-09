import { prisma } from "@/lib/db/prisma"
import {
  CEO_TEMPLATE,
  C_LEVEL_TEMPLATES,
  WORKER_TEMPLATES,
  type TemplateDefinition,
} from "./default-templates"
import type { CLevelRole, WorkerSpecialization } from "./types"

export interface TemplateOption {
  id: string
  source: "code" | "db"
  name: string
  displayName: string
  description: string
  roleType: "ceo" | "c-level" | "worker"
  cLevelRole?: CLevelRole
  specialization?: WorkerSpecialization
  defaultSkills: string[]
  defaultTools: string[]
  defaultToolsets: string[]
  isPublic: boolean
  orgId: string | null
}

export interface TemplateGroups {
  ceo: TemplateOption[]
  cLevel: TemplateOption[]
  worker: TemplateOption[]
}

interface DbTemplate {
  id: string
  orgId: string | null
  name: string
  displayName: string | null
  description: string | null
  roleType: string
  defaultSkills: string[]
  defaultTools: string[]
  defaultToolsets: string[]
  isPublic: boolean
}

function codeKey(def: TemplateDefinition): string {
  if (def.roleType === "ceo") return "code:ceo:default"
  if (def.roleType === "c-level") return `code:c-level:${def.cLevelRole}`
  return `code:worker:${def.specialization}`
}

function defToOption(def: TemplateDefinition): TemplateOption {
  return {
    id: codeKey(def),
    source: "code",
    name: def.name,
    displayName: def.displayName,
    description: def.description,
    roleType: def.roleType,
    cLevelRole: def.cLevelRole,
    specialization: def.specialization,
    defaultSkills: def.defaultSkills,
    defaultTools: def.defaultTools,
    defaultToolsets: def.defaultToolsets,
    isPublic: def.isPublic,
    orgId: null,
  }
}

function dbToOption(row: DbTemplate, code?: TemplateDefinition): TemplateOption {
  const roleType = (row.roleType === "ceo" || row.roleType === "c-level" || row.roleType === "worker"
    ? row.roleType
    : "worker") as TemplateOption["roleType"]
  return {
    id: row.id,
    source: "db",
    name: row.name,
    displayName: row.displayName ?? row.name,
    description: row.description ?? "",
    roleType,
    cLevelRole: code?.cLevelRole,
    specialization: code?.specialization,
    defaultSkills: row.defaultSkills,
    defaultTools: row.defaultTools,
    defaultToolsets: row.defaultToolsets,
    isPublic: row.isPublic,
    orgId: row.orgId,
  }
}

export async function listAvailableTemplates(orgId: string): Promise<TemplateGroups> {
  const codeDefs: TemplateDefinition[] = [
    CEO_TEMPLATE,
    ...Object.values(C_LEVEL_TEMPLATES),
    ...Object.values(WORKER_TEMPLATES),
  ]

  const codeByName = new Map<string, TemplateDefinition>()
  for (const def of codeDefs) codeByName.set(def.name, def)

  const dbRows = (await prisma.agentTemplate.findMany({
    where: { OR: [{ orgId }, { isPublic: true }] },
  })) as DbTemplate[]

  const replacedCodeNames = new Set<string>()
  const dbOptions: TemplateOption[] = dbRows.map((row) => {
    const code = codeByName.get(row.name)
    if (code) replacedCodeNames.add(row.name)
    return dbToOption(row, code)
  })

  const codeOptions: TemplateOption[] = codeDefs
    .filter((def) => !replacedCodeNames.has(def.name))
    .map(defToOption)

  const all = [...codeOptions, ...dbOptions]

  return {
    ceo: all.filter((t) => t.roleType === "ceo"),
    cLevel: all.filter((t) => t.roleType === "c-level"),
    worker: all.filter((t) => t.roleType === "worker"),
  }
}
