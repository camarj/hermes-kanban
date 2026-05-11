import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
;(async () => {
  const org = await p.organization.findUnique({ where: { slug: "acme-corp" } })
  if (!org) { console.log("no acme"); return p.$disconnect() }
  const members = await p.organizationMember.findMany({
    where: { orgId: org.id },
    include: { user: { select: { email: true } } },
  })
  console.log("acme members:", members.map((m) => ({ email: m.user.email, role: m.role })))

  // Also check if the most recent E2E user has membership
  const e2eUser = await p.user.findFirst({
    where: { email: { startsWith: "e2e-test-" } },
    orderBy: { createdAt: "desc" },
  })
  console.log("latest e2e user:", e2eUser?.email)
  if (e2eUser) {
    const m = await p.organizationMember.findFirst({
      where: { userId: e2eUser.id, orgId: org.id },
    })
    console.log("membership in acme:", m ? `role=${m.role}` : "NONE")
  }
  await p.$disconnect()
})()
