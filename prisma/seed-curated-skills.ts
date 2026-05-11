import { PrismaClient } from "@prisma/client"
import { seedCuratedSkills, CURATED_SKILLS } from "../src/lib/skills/curated-catalog"

const prisma = new PrismaClient()

async function main() {
  console.log(`Seeding ${CURATED_SKILLS.length} curated skills...`)
  await seedCuratedSkills()
  const count = await prisma.skill.count({ where: { source: "curated" } })
  console.log(`Done. ${count} curated skills in DB.`)
}

main()
  .catch((e) => {
    console.error("Curated seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
