import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
;(async () => {
  const acme = await p.organization.findUnique({ where: { slug: "acme-corp" } })
  if (!acme) { console.log("no acme"); process.exit() }
  const tmpls = await p.agentTemplate.findMany({ where: { orgId: acme.id }, select: { name: true, roleType: true } })
  const agents = await p.agent.findMany({ where: { orgId: acme.id }, select: { name: true, hermesProfile: true, skills: true, template: { select: { name: true, roleType: true } } } })
  console.log("Templates:", tmpls)
  console.log("Agents:", agents)
  await p.$disconnect()
})()
