import { describe, it, expect, beforeEach, vi } from "vitest"

const mockFindMany = vi.fn()

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    agentTemplate: {
      findMany: (args: unknown) => mockFindMany(args),
    },
  },
}))

import { listAvailableTemplates } from "@/lib/agents/list-templates"
import { CEO_TEMPLATE } from "@/lib/agents/default-templates"

describe("listAvailableTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindMany.mockResolvedValue([])
  })

  it("groups code templates by roleType when DB has no templates", async () => {
    const result = await listAvailableTemplates("org-1")

    expect(result.ceo).toHaveLength(1)
    expect(result.cLevel).toHaveLength(4)
    expect(result.worker).toHaveLength(12)
  })

  it("flags every code template with source=code and synthetic id", async () => {
    const result = await listAvailableTemplates("org-1")

    const allCode = [...result.ceo, ...result.cLevel, ...result.worker]
    for (const tpl of allCode) {
      expect(tpl.source).toBe("code")
      expect(tpl.id).toMatch(/^code:(ceo|c-level|worker):/)
      expect(tpl.orgId).toBeNull()
    }
  })

  it("preserves cLevelRole on c-level code templates", async () => {
    const result = await listAvailableTemplates("org-1")
    const cto = result.cLevel.find((t) => t.cLevelRole === "cto")
    expect(cto).toBeDefined()
    expect(cto!.id).toBe("code:c-level:cto")
  })

  it("preserves specialization on worker code templates", async () => {
    const result = await listAvailableTemplates("org-1")
    const backend = result.worker.find((t) => t.specialization === "backend-engineer")
    expect(backend).toBeDefined()
    expect(backend!.id).toBe("code:worker:backend-engineer")
  })

  it("queries DB templates for the org or public ones", async () => {
    await listAvailableTemplates("org-1")
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { OR: [{ orgId: "org-1" }, { isPublic: true }] },
    })
  })

  it("replaces matching code template with DB row keeping the DB id", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "tpl-db-ceo",
        orgId: "org-1",
        name: CEO_TEMPLATE.name,
        displayName: CEO_TEMPLATE.displayName,
        description: CEO_TEMPLATE.description,
        roleType: "ceo",
        soulContent: null,
        defaultSkills: CEO_TEMPLATE.defaultSkills,
        defaultTools: CEO_TEMPLATE.defaultTools,
        defaultToolsets: CEO_TEMPLATE.defaultToolsets,
        isPublic: false,
      },
    ])

    const result = await listAvailableTemplates("org-1")

    expect(result.ceo).toHaveLength(1)
    expect(result.ceo[0].id).toBe("tpl-db-ceo")
    expect(result.ceo[0].source).toBe("db")
    expect(result.ceo[0].orgId).toBe("org-1")
  })

  it("appends DB-only custom templates with no code counterpart", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "tpl-db-custom",
        orgId: "org-1",
        name: "My Custom Worker",
        displayName: "Custom Worker",
        description: "A custom one",
        roleType: "worker",
        soulContent: null,
        defaultSkills: ["custom-skill"],
        defaultTools: [],
        defaultToolsets: [],
        isPublic: false,
      },
    ])

    const result = await listAvailableTemplates("org-1")

    const custom = result.worker.find((t) => t.id === "tpl-db-custom")
    expect(custom).toBeDefined()
    expect(custom!.source).toBe("db")
    expect(custom!.specialization).toBeUndefined()
  })
})
