import { PrismaClient } from "@prisma/client"
import { CEO_TEMPLATE } from "../src/lib/agents/default-templates"
import { profileManager, buildCEOProfile, isHermesAvailable } from "../src/lib/hermes"

const p = new PrismaClient()
;(async () => {
  const orgSlug = "inteliside"
  const org = await p.organization.findUnique({ where: { slug: orgSlug } })
  if (!org) {
    console.error(`Org ${orgSlug} not found`)
    process.exit(1)
  }
  console.log(`Found org: ${org.id} (${org.slug}) "${org.name}"`)

  // Upsert CEO template
  const ceoTemplate = await p.agentTemplate.upsert({
    where: { orgId_name: { orgId: org.id, name: CEO_TEMPLATE.name } },
    update: {},
    create: {
      orgId: org.id,
      name: CEO_TEMPLATE.name,
      displayName: CEO_TEMPLATE.displayName,
      description: CEO_TEMPLATE.description,
      roleType: CEO_TEMPLATE.roleType,
      soulContent: null,
      defaultSkills: CEO_TEMPLATE.defaultSkills,
      defaultTools: CEO_TEMPLATE.defaultTools,
      defaultToolsets: CEO_TEMPLATE.defaultToolsets,
      isPublic: CEO_TEMPLATE.isPublic,
    },
  })
  console.log(`CEO template: ${ceoTemplate.id}`)

  // Check for existing CEO agent
  const ceoProfileName = `ceo-${orgSlug}`
  let ceoAgent = await p.agent.findFirst({
    where: { orgId: org.id, hermesProfile: ceoProfileName },
  })

  if (ceoAgent) {
    console.log(`CEO agent already exists: ${ceoAgent.id} (${ceoAgent.hermesProfile})`)
  } else {
    ceoAgent = await p.agent.create({
      data: {
        orgId: org.id,
        templateId: ceoTemplate.id,
        hermesProfile: ceoProfileName,
        name: "CEO Agent",
        description: `Chief Executive Agent for ${org.name}`,
        soulContent: null,
        skills: CEO_TEMPLATE.defaultSkills,
        tools: CEO_TEMPLATE.defaultTools,
        toolsets: CEO_TEMPLATE.defaultToolsets,
        isActive: true,
        mcpServers: [],
        mcpServerIds: [],
        webhooks: [],
        apiIntegrations: [],
      },
    })
    console.log(`Created CEO agent: ${ceoAgent.id} (${ceoAgent.hermesProfile})`)
  }

  // Try to sync Hermes profile
  console.log("\nChecking Hermes Gateway availability…")
  const available = await isHermesAvailable()
  if (!available) {
    console.log("Hermes Gateway not available. CEO profile will sync next time the gateway is online.")
  } else {
    console.log("Hermes Gateway up — creating CEO profile…")
    try {
      const profileInput = buildCEOProfile(
        org.slug,
        org.name,
        org.objective || undefined,
        [],
      )
      const result = await profileManager.createProfile(profileInput)
      console.log(`Profile created: success=${result.success} method=${result.method} path=${result.profilePath}`)
      if (result.success) {
        await p.agent.update({
          where: { id: ceoAgent.id },
          data: { profileSyncedAt: new Date() },
        })
        console.log("Updated profileSyncedAt on agent row.")
      }
    } catch (err) {
      console.error("Hermes profile creation failed:", err instanceof Error ? err.message : err)
    }
  }

  await p.$disconnect()
  console.log("\nDone.")
})()
