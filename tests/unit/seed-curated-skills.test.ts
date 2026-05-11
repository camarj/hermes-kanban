import { describe, it, expect, beforeEach, vi } from "vitest"

const mockDeleteMany = vi.fn()
const mockCreateMany = vi.fn()

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    skill: {
      deleteMany: (args: unknown) => mockDeleteMany(args),
      createMany: (args: unknown) => mockCreateMany(args),
    },
  },
}))

import { CURATED_SKILLS, seedCuratedSkills } from "@/lib/skills/curated-catalog"

describe("CURATED_SKILLS catalog", () => {
  it("contains the 8 expected skills for Phase 3", () => {
    const names = CURATED_SKILLS.map((s) => s.name)
    expect(names).toEqual(
      expect.arrayContaining([
        "kanban-worker",
        "kanban-orchestrator",
        "backend-development",
        "frontend-development",
        "github-code-review",
        "react-patterns",
        "research-methodology",
        "infrastructure",
      ]),
    )
    expect(CURATED_SKILLS.length).toBe(8)
  })

  it("every curated skill has at least a SKILL.md file with frontmatter", () => {
    for (const skill of CURATED_SKILLS) {
      const skillMd = skill.files.find((f) => f.path === "SKILL.md")
      expect(skillMd, `skill ${skill.name} missing SKILL.md`).toBeDefined()
      expect(skillMd!.content).toMatch(/^---\nname:/)
      expect(skillMd!.content).toMatch(/description:/)
    }
  })

  it("every curated skill has a non-empty description", () => {
    for (const skill of CURATED_SKILLS) {
      expect(skill.description, `skill ${skill.name} missing description`).toBeTruthy()
      expect(skill.description!.length).toBeGreaterThan(10)
    }
  })

  it("curated skill names match the directory naming convention (kebab-case)", () => {
    for (const skill of CURATED_SKILLS) {
      expect(skill.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })
})

describe("seedCuratedSkills", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteMany.mockResolvedValue({ count: 0 })
    mockCreateMany.mockResolvedValue({ count: CURATED_SKILLS.length })
  })

  it("wipes existing curated rows before reinserting (idempotent)", async () => {
    await seedCuratedSkills()
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { source: "curated", orgId: null },
    })
  })

  it("createMany ships orgId=null, source='curated', isPublic=true for every row", async () => {
    await seedCuratedSkills()
    expect(mockCreateMany).toHaveBeenCalledTimes(1)
    const args = mockCreateMany.mock.calls[0][0] as {
      data: Array<{ orgId: string | null; source: string; isPublic: boolean; name: string }>
    }
    expect(args.data).toHaveLength(CURATED_SKILLS.length)
    for (const row of args.data) {
      expect(row.orgId).toBeNull()
      expect(row.source).toBe("curated")
      expect(row.isPublic).toBe(true)
    }
  })

  it("delete runs BEFORE createMany (order matters for idempotency)", async () => {
    const order: string[] = []
    mockDeleteMany.mockImplementation(async () => {
      order.push("delete")
      return { count: 0 }
    })
    mockCreateMany.mockImplementation(async () => {
      order.push("create")
      return { count: CURATED_SKILLS.length }
    })
    await seedCuratedSkills()
    expect(order).toEqual(["delete", "create"])
  })
})
