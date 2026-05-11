import { describe, it, expect, beforeEach, vi } from "vitest"

const mockFindMany = vi.fn()
const mockFindFirst = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockAgentFindMany = vi.fn()

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    skill: {
      findMany: (args: unknown) => mockFindMany(args),
      findFirst: (args: unknown) => mockFindFirst(args),
      create: (args: unknown) => mockCreate(args),
      update: (args: unknown) => mockUpdate(args),
      delete: (args: unknown) => mockDelete(args),
    },
    agent: {
      findMany: (args: unknown) => mockAgentFindMany(args),
    },
  },
}))

import {
  validateSkillInput,
  listSkills,
  getSkill,
  createSkill,
  updateSkill,
  deleteSkill,
} from "@/lib/skills/queries"

const VALID_SKILL_MD = `---
name: my-skill
description: A useful skill.
---

# Body`

describe("validateSkillInput", () => {
  it("rejects name not in kebab-case", () => {
    const r = validateSkillInput({
      name: "Has Spaces",
      files: [{ path: "SKILL.md", content: VALID_SKILL_MD }],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/name/i)
  })

  it("rejects when SKILL.md is missing", () => {
    const r = validateSkillInput({
      name: "my-skill",
      files: [{ path: "tools.yaml", content: "x" }],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/SKILL\.md/i)
  })

  it("rejects when SKILL.md frontmatter name disagrees with input name", () => {
    const r = validateSkillInput({
      name: "actual-name",
      files: [
        {
          path: "SKILL.md",
          content: `---
name: different-name
description: x
---
body`,
        },
      ],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/frontmatter.*name|name.*mismatch/i)
  })

  it("rejects file path that escapes the skill dir (..)", () => {
    const r = validateSkillInput({
      name: "my-skill",
      files: [
        { path: "SKILL.md", content: VALID_SKILL_MD },
        { path: "../escape.txt", content: "evil" },
      ],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/path/i)
  })

  it("accepts a minimal valid skill", () => {
    const r = validateSkillInput({
      name: "my-skill",
      files: [{ path: "SKILL.md", content: VALID_SKILL_MD }],
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.name).toBe("my-skill")
      expect(r.value.description).toBe("A useful skill.")
    }
  })

  it("accepts skill with multiple files including tools.yaml + references/", () => {
    const r = validateSkillInput({
      name: "my-skill",
      files: [
        { path: "SKILL.md", content: VALID_SKILL_MD },
        { path: "tools.yaml", content: "tools: []" },
        { path: "references/notes.md", content: "# notes" },
      ],
    })
    expect(r.ok).toBe(true)
  })
})

describe("Skill queries (CRUD)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("listSkills filters by orgId OR isPublic and orders by name asc", async () => {
    mockFindMany.mockResolvedValue([])
    await listSkills("org-1")
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { OR: [{ orgId: "org-1" }, { isPublic: true }] },
      orderBy: { name: "asc" },
    })
  })

  it("listSkills can additionally filter by source", async () => {
    mockFindMany.mockResolvedValue([])
    await listSkills("org-1", { source: "curated" })
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { OR: [{ orgId: "org-1" }, { isPublic: true }], source: "curated" },
      orderBy: { name: "asc" },
    })
  })

  it("getSkill scopes by org OR isPublic with id match", async () => {
    mockFindFirst.mockResolvedValue(null)
    await getSkill("org-1", "skl-1")
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "skl-1", OR: [{ orgId: "org-1" }, { isPublic: true }] },
    })
  })

  it("createSkill persists with source=custom and stores parsed metadata", async () => {
    mockCreate.mockResolvedValue({ id: "new-skill" })
    await createSkill("org-1", {
      name: "my-skill",
      files: [{ path: "SKILL.md", content: VALID_SKILL_MD }],
    })
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: "org-1",
        name: "my-skill",
        description: "A useful skill.",
        source: "custom",
        isPublic: false,
        triggers: [],
        userInvocable: true,
      }),
    })
  })

  it("createSkill rejects malformed input early", async () => {
    const r = await createSkill("org-1", {
      name: "BAD NAME",
      files: [{ path: "SKILL.md", content: VALID_SKILL_MD }],
    })
    expect(r.ok).toBe(false)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("updateSkill requires an existing org-owned row", async () => {
    mockFindFirst.mockResolvedValue(null)
    const r = await updateSkill("org-1", "skl-foreign", {
      files: [{ path: "SKILL.md", content: VALID_SKILL_MD }],
    })
    expect(r.ok).toBe(false)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("updateSkill cannot mutate curated public rows from another org", async () => {
    mockFindFirst.mockResolvedValue({
      id: "skl-pub",
      orgId: null,
      isPublic: true,
      source: "curated",
    })
    const r = await updateSkill("org-1", "skl-pub", {
      files: [{ path: "SKILL.md", content: VALID_SKILL_MD }],
    })
    expect(r.ok).toBe(false)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("updateSkill persists new files + reparses frontmatter", async () => {
    mockFindFirst.mockResolvedValue({
      id: "skl-1",
      orgId: "org-1",
      isPublic: false,
      source: "custom",
      name: "my-skill",
    })
    mockUpdate.mockResolvedValue({ id: "skl-1" })

    await updateSkill("org-1", "skl-1", {
      files: [
        {
          path: "SKILL.md",
          content: `---\nname: my-skill\ndescription: Updated desc.\ntriggers: [a, b]\n---\nbody`,
        },
      ],
    })

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "skl-1" },
      data: expect.objectContaining({
        description: "Updated desc.",
        triggers: ["a", "b"],
      }),
    })
  })

  it("deleteSkill blocks when any agent in the org uses it (409 style)", async () => {
    mockFindFirst.mockResolvedValue({ id: "skl-1", orgId: "org-1", name: "react-patterns" })
    mockAgentFindMany.mockResolvedValue([
      { id: "agt-1", name: "Alpha" },
      { id: "agt-2", name: "Beta" },
    ])

    const r = await deleteSkill("org-1", "skl-1")
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toMatch(/in use|agents/i)
      expect(r.agentsUsing).toEqual([
        { id: "agt-1", name: "Alpha" },
        { id: "agt-2", name: "Beta" },
      ])
    }
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it("deleteSkill succeeds when no agent uses it", async () => {
    mockFindFirst.mockResolvedValue({ id: "skl-1", orgId: "org-1", name: "react-patterns" })
    mockAgentFindMany.mockResolvedValue([])
    mockDelete.mockResolvedValue({ id: "skl-1" })

    const r = await deleteSkill("org-1", "skl-1")
    expect(r.ok).toBe(true)
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "skl-1" } })
  })

  it("deleteSkill returns not_found when row is not org-owned", async () => {
    mockFindFirst.mockResolvedValue(null)
    const r = await deleteSkill("org-1", "skl-x")
    expect(r.ok).toBe(false)
    expect(mockDelete).not.toHaveBeenCalled()
  })
})
