import { PrismaClient } from "@prisma/client"
import { listSkills, createSkill } from "../src/lib/skills/queries"

const p = new PrismaClient()
;(async () => {
  const org = await p.organization.findUnique({ where: { slug: "acme-corp" } })
  if (!org) { console.log("no acme"); return p.$disconnect() }
  console.log("acme id:", org.id)

  console.log("\n[1] listSkills(orgId)…")
  try {
    const skills = await listSkills(org.id)
    console.log("OK,", skills.length, "skills")
  } catch (err) {
    console.log("FAILED:", err)
  }

  console.log("\n[2] listSkills with filter…")
  try {
    const skills = await listSkills(org.id, { source: "curated" })
    console.log("OK, curated count:", skills.length)
  } catch (err) {
    console.log("FAILED:", err)
  }

  console.log("\n[3] createSkill custom…")
  try {
    await p.skill.deleteMany({ where: { orgId: org.id, name: "debug-direct" } })
    const r = await createSkill(org.id, {
      name: "debug-direct",
      files: [
        { path: "SKILL.md", content: "---\nname: debug-direct\ndescription: Direct call test.\n---\n# x" },
      ],
    })
    console.log("result:", r)
  } catch (err) {
    console.log("FAILED:", err)
  }

  await p.$disconnect()
})()
