import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
;(async () => {
  const userEmail = "raulj.camacho@inteliside.com"
  const orgSlug = "inteliside"

  const user = await p.user.findUnique({ where: { email: userEmail } })
  if (!user) {
    console.error(`User ${userEmail} not found in DB`)
    process.exit(1)
  }
  console.log(`Found user: ${user.id} (${user.email})`)

  let org = await p.organization.findUnique({ where: { slug: orgSlug } })
  if (!org) {
    org = await p.organization.create({
      data: {
        name: "Inteliside",
        slug: orgSlug,
        objective: "Technology studio in Guayaquil, Ecuador",
        ownerId: user.id,
      },
    })
    console.log(`Created org: ${org.id} (${org.slug})`)
  } else {
    console.log(`Org ${orgSlug} already exists: ${org.id}`)
  }

  const existing = await p.organizationMember.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: user.id } },
  })
  if (existing) {
    console.log(`Membership already exists: role=${existing.role}`)
  } else {
    const m = await p.organizationMember.create({
      data: { orgId: org.id, userId: user.id, role: "owner" },
    })
    console.log(`Created membership: ${m.id} role=${m.role}`)
  }

  await p.$disconnect()
  console.log("\nDone. Try logging in again.")
})()
