import { prisma } from "@/lib/db/prisma"
import type { SkillSource } from "@prisma/client"
import { parseSkillMd, type ParsedSkill } from "./parse-skill-md"

export interface SkillFileInput {
  path: string
  content: string
}

export interface SkillInput {
  name: string
  files: SkillFileInput[]
}

export interface ValidatedSkill {
  name: string
  description: string
  triggers: string[]
  userInvocable: boolean
  files: SkillFileInput[]
}

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export type ValidationResult =
  | { ok: true; value: ValidatedSkill }
  | { ok: false; error: string }

export function validateSkillInput(input: SkillInput): ValidationResult {
  if (!input.name || !NAME_PATTERN.test(input.name)) {
    return {
      ok: false,
      error: `Invalid skill name (must be kebab-case lowercase): ${input.name}`,
    }
  }

  if (!Array.isArray(input.files) || input.files.length === 0) {
    return { ok: false, error: "Skill must include at least one file" }
  }

  const skillMd = input.files.find((f) => f.path === "SKILL.md")
  if (!skillMd) {
    return { ok: false, error: "Skill must contain a SKILL.md file at its root" }
  }

  for (const file of input.files) {
    if (file.path.includes("..") || file.path.startsWith("/")) {
      return { ok: false, error: `Invalid file path (no .. or absolute paths): ${file.path}` }
    }
  }

  const parsed = parseSkillMd(skillMd.content)
  if (!parsed.ok) {
    return { ok: false, error: `SKILL.md: ${parsed.error}` }
  }

  if (parsed.value.name !== input.name) {
    return {
      ok: false,
      error: `SKILL.md frontmatter name "${parsed.value.name}" does not match input name "${input.name}"`,
    }
  }

  return {
    ok: true,
    value: {
      name: parsed.value.name,
      description: parsed.value.description,
      triggers: parsed.value.triggers,
      userInvocable: parsed.value.userInvocable,
      files: input.files,
    },
  }
}

export interface ListFilters {
  source?: SkillSource
}

export async function listSkills(orgId: string, filters: ListFilters = {}) {
  const where: {
    OR: Array<{ orgId: string } | { isPublic: boolean }>
    source?: SkillSource
  } = {
    OR: [{ orgId }, { isPublic: true }],
  }
  if (filters.source) where.source = filters.source
  return prisma.skill.findMany({ where, orderBy: { name: "asc" } })
}

export async function getSkill(orgId: string, skillId: string) {
  return prisma.skill.findFirst({
    where: { id: skillId, OR: [{ orgId }, { isPublic: true }] },
  })
}

export type CreateResult =
  | { ok: true; skill: { id: string; name: string } }
  | { ok: false; error: string }

export async function createSkill(orgId: string, input: SkillInput): Promise<CreateResult> {
  const validation = validateSkillInput(input)
  if (!validation.ok) return { ok: false, error: validation.error }

  const created = await prisma.skill.create({
    data: {
      orgId,
      name: validation.value.name,
      description: validation.value.description,
      source: "custom",
      isPublic: false,
      files: validation.value.files as unknown as object,
      triggers: validation.value.triggers,
      userInvocable: validation.value.userInvocable,
    },
  })

  return { ok: true, skill: { id: created.id, name: created.name } }
}

export interface UpdateInput {
  files?: SkillFileInput[]
}

export type UpdateResult =
  | { ok: true; skill: { id: string } }
  | { ok: false; error: string }

export async function updateSkill(
  orgId: string,
  skillId: string,
  input: UpdateInput,
): Promise<UpdateResult> {
  const existing = await prisma.skill.findFirst({
    where: { id: skillId },
  })
  if (!existing) return { ok: false, error: "Skill not found" }

  if (existing.orgId !== orgId) {
    return { ok: false, error: "Cannot mutate skills owned by another org or public catalog" }
  }

  if (!input.files || input.files.length === 0) {
    return { ok: false, error: "No fields to update" }
  }

  const validation = validateSkillInput({ name: existing.name, files: input.files })
  if (!validation.ok) return { ok: false, error: validation.error }

  const updated = await prisma.skill.update({
    where: { id: skillId },
    data: {
      description: validation.value.description,
      files: validation.value.files as unknown as object,
      triggers: validation.value.triggers,
      userInvocable: validation.value.userInvocable,
    },
  })

  return { ok: true, skill: { id: updated.id } }
}

export type DeleteResult =
  | { ok: true }
  | { ok: false; error: string; agentsUsing?: Array<{ id: string; name: string }> }

export async function deleteSkill(orgId: string, skillId: string): Promise<DeleteResult> {
  const existing = await prisma.skill.findFirst({
    where: { id: skillId, orgId },
  })
  if (!existing) return { ok: false, error: "Skill not found" }

  const agentsUsing = await prisma.agent.findMany({
    where: { orgId, skills: { has: existing.name } },
    select: { id: true, name: true },
  })

  if (agentsUsing.length > 0) {
    return {
      ok: false,
      error: `Skill is in use by ${agentsUsing.length} agent(s)`,
      agentsUsing,
    }
  }

  await prisma.skill.delete({ where: { id: skillId } })
  return { ok: true }
}

export type { ParsedSkill }
