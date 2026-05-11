import { describe, it, expect, beforeEach, vi } from "vitest"

const mockFindFirst = vi.fn()
const mockCreate = vi.fn()

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    skill: {
      findFirst: (args: unknown) => mockFindFirst(args),
      create: (args: unknown) => mockCreate(args),
    },
  },
}))

import { installCuratedSkill } from "@/lib/skills/install-curated"

const CURATED_ROW = {
  id: "skl-curated",
  orgId: null,
  name: "react-patterns",
  description: "React patterns curated",
  source: "curated",
  isPublic: true,
  sourceUrl: null,
  sourceRef: null,
  version: "1.0.0",
  files: [{ path: "SKILL.md", content: "---\nname: react-patterns\ndescription: x\n---\nb" }],
  triggers: ["react"],
  userInvocable: true,
}

describe("installCuratedSkill", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns error when curated skill id not found", async () => {
    mockFindFirst.mockResolvedValueOnce(null)
    const r = await installCuratedSkill("org-1", "skl-missing")
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/curated.*not found|not found/i)
  })

  it("returns error when target id is not curated/public (WHERE clause filters it out)", async () => {
    mockFindFirst.mockResolvedValueOnce(null)
    const r = await installCuratedSkill("org-1", "skl-other")
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/not found/i)
  })

  it("findFirst query scopes by source=curated AND isPublic=true", async () => {
    mockFindFirst.mockResolvedValueOnce(null)
    await installCuratedSkill("org-1", "skl-anything")
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "skl-anything", source: "curated", isPublic: true },
    })
  })

  it("copies curated skill into the org with source=curated and orgId set", async () => {
    mockFindFirst
      .mockResolvedValueOnce(CURATED_ROW)
      .mockResolvedValueOnce(null) // no existing copy in org
    mockCreate.mockResolvedValue({ id: "new-id", name: "react-patterns" })

    const r = await installCuratedSkill("org-1", "skl-curated")
    expect(r.ok).toBe(true)

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: "org-1",
        name: "react-patterns",
        source: "curated",
        isPublic: false,
        description: "React patterns curated",
        triggers: ["react"],
      }),
    })
  })

  it("is idempotent: returns existing copy if org already has it", async () => {
    mockFindFirst
      .mockResolvedValueOnce(CURATED_ROW)
      .mockResolvedValueOnce({ id: "existing-id", orgId: "org-1", name: "react-patterns" })

    const r = await installCuratedSkill("org-1", "skl-curated")
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.skill.id).toBe("existing-id")
      expect(r.alreadyInstalled).toBe(true)
    }
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
