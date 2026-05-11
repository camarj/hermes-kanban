import { prisma } from "@/lib/db/prisma"

export type InstallResult =
  | { ok: true; skill: { id: string; name: string }; alreadyInstalled: boolean }
  | { ok: false; error: string }

export async function installCuratedSkill(
  orgId: string,
  curatedSkillId: string,
): Promise<InstallResult> {
  const curated = await prisma.skill.findFirst({
    where: { id: curatedSkillId, source: "curated", isPublic: true },
  })

  if (!curated) {
    return { ok: false, error: "Curated skill not found" }
  }

  const existing = await prisma.skill.findFirst({
    where: { orgId, name: curated.name },
  })

  if (existing) {
    return {
      ok: true,
      skill: { id: existing.id, name: existing.name },
      alreadyInstalled: true,
    }
  }

  const created = await prisma.skill.create({
    data: {
      orgId,
      name: curated.name,
      description: curated.description,
      source: "curated",
      isPublic: false,
      sourceUrl: curated.sourceUrl,
      sourceRef: curated.sourceRef,
      version: curated.version,
      files: curated.files as unknown as object,
      triggers: curated.triggers,
      userInvocable: curated.userInvocable,
    },
  })

  return {
    ok: true,
    skill: { id: created.id, name: created.name },
    alreadyInstalled: false,
  }
}
