import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
;(async () => {
  const email = "raulj.camacho@inteliside.com"
  const orgSlug = "inteliside"

  const user = await p.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      emailVerified: true,
      accounts: { select: { providerId: true, password: true } },
      memberships: {
        include: { organization: { select: { slug: true, name: true } } },
      },
    },
  })

  console.log("USER raulj.camacho@inteliside.com:")
  if (!user) {
    console.log("  NOT FOUND")
  } else {
    console.log("  id:", user.id)
    console.log("  name:", user.name)
    console.log("  emailVerified:", user.emailVerified)
    console.log("  createdAt:", user.createdAt)
    console.log("  accounts:", user.accounts.map((a) => ({ providerId: a.providerId, hasPassword: !!a.password })))
    console.log("  memberships:", user.memberships.map((m) => ({ org: m.organization.slug, role: m.role })))
  }

  console.log("\nORG inteliside:")
  const org = await p.organization.findUnique({
    where: { slug: orgSlug },
    include: { members: { include: { user: { select: { email: true } } } } },
  })
  if (!org) {
    console.log("  NOT FOUND")
  } else {
    console.log("  id:", org.id)
    console.log("  name:", org.name)
    console.log("  members:", org.members.map((m) => ({ email: m.user.email, role: m.role })))
  }

  // Also list all users + orgs to see what exists
  console.log("\nALL users in DB:")
  const all = await p.user.findMany({ select: { email: true, createdAt: true }, orderBy: { createdAt: "asc" } })
  for (const u of all) console.log(`  ${u.email}  (${u.createdAt.toISOString()})`)

  console.log("\nALL orgs in DB:")
  const orgs = await p.organization.findMany({ select: { slug: true, name: true, createdAt: true }, orderBy: { createdAt: "asc" } })
  for (const o of orgs) console.log(`  ${o.slug}  "${o.name}"  (${o.createdAt.toISOString()})`)

  await p.$disconnect()
})()
