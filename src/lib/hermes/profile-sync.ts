import { isHermesAvailable, buildCEOProfile, profileManager } from "@/lib/hermes"
import { prisma } from "@/lib/db/prisma"

export interface SyncableAgent {
  id: string
  orgId: string
  hermesProfile: string
  name: string
  profileSyncedAt: Date | null
  template: { roleType: string } | null
}

export interface SyncableOrg {
  id: string
  slug: string
  name: string
  objective: string | null
}

export interface SyncResult {
  synced: boolean
  gatewayAvailable: boolean
  alreadyExisted: boolean
  error?: string
}

export interface BulkSyncResult {
  gatewayAvailable: boolean
  attempted: number
  synced: { id: string; hermesProfile: string }[]
  failed: { id: string; hermesProfile: string; error: string }[]
}

export async function syncCeoProfile(
  agent: SyncableAgent,
  org: SyncableOrg,
): Promise<SyncResult> {
  const gatewayAvailable = await isHermesAvailable()
  if (!gatewayAvailable) {
    return { synced: false, gatewayAvailable: false, alreadyExisted: false }
  }

  const isCeo =
    agent.template?.roleType === "ceo" ||
    (!agent.template && agent.hermesProfile.startsWith("ceo-"))

  if (!isCeo) {
    return {
      synced: false,
      gatewayAvailable: true,
      alreadyExisted: false,
      error: "Sólo agentes CEO pueden sincronizarse vía recovery. Recreá los workers/C-Level desde la página de Agentes.",
    }
  }

  try {
    const exists = await profileManager.profileExists(agent.hermesProfile)
    if (!exists) {
      const input = buildCEOProfile(
        org.slug,
        org.name,
        org.objective || undefined,
        [],
      )
      await profileManager.createProfile(input)
    }

    await prisma.agent.update({
      where: { id: agent.id },
      data: { profileSyncedAt: new Date() },
    })

    return { synced: true, gatewayAvailable: true, alreadyExisted: exists }
  } catch (error) {
    return {
      synced: false,
      gatewayAvailable: true,
      alreadyExisted: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function syncPendingCeoProfiles(org: SyncableOrg): Promise<BulkSyncResult> {
  const gatewayAvailable = await isHermesAvailable()
  if (!gatewayAvailable) {
    return { gatewayAvailable: false, attempted: 0, synced: [], failed: [] }
  }

  const pendingAgents = (await prisma.agent.findMany({
    where: {
      orgId: org.id,
      profileSyncedAt: null,
      OR: [
        { template: { roleType: "ceo" } },
        { hermesProfile: { startsWith: "ceo-" } },
      ],
    },
    include: { template: { select: { roleType: true } } },
  })) as unknown as SyncableAgent[]

  const synced: { id: string; hermesProfile: string }[] = []
  const failed: { id: string; hermesProfile: string; error: string }[] = []

  for (const agent of pendingAgents) {
    const result = await syncCeoProfile(agent, org)
    if (result.synced) {
      synced.push({ id: agent.id, hermesProfile: agent.hermesProfile })
    } else {
      failed.push({
        id: agent.id,
        hermesProfile: agent.hermesProfile,
        error: result.error || "Sync failed",
      })
    }
  }

  return {
    gatewayAvailable: true,
    attempted: pendingAgents.length,
    synced,
    failed,
  }
}
