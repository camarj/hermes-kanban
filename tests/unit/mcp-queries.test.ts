import { describe, it, expect, beforeEach, vi } from "vitest"

const mockFindMany = vi.fn()
const mockFindFirst = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    mcpServer: {
      findMany: (args: unknown) => mockFindMany(args),
      findFirst: (args: unknown) => mockFindFirst(args),
      create: (args: unknown) => mockCreate(args),
      update: (args: unknown) => mockUpdate(args),
      delete: (args: unknown) => mockDelete(args),
    },
  },
}))

import {
  validateMcpInput,
  listMcpServers,
  getMcpServer,
  createMcpServer,
  updateMcpServer,
  deleteMcpServer,
} from "@/lib/mcp/queries"

describe("validateMcpInput", () => {
  it("rejects name shorter than 2 chars", () => {
    const r = validateMcpInput({ name: "x", transport: "stdio", command: "node x.js" })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/name/i)
  })

  it("rejects unknown transport", () => {
    const r = validateMcpInput({ name: "ok", transport: "ws" as never, command: "x" })
    expect(r.ok).toBe(false)
  })

  it("rejects stdio without command", () => {
    const r = validateMcpInput({ name: "ok", transport: "stdio", command: "" })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/command/i)
  })

  it("rejects http without url", () => {
    const r = validateMcpInput({ name: "ok", transport: "http", url: "" })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/url/i)
  })

  it("accepts valid stdio input", () => {
    const r = validateMcpInput({
      name: "github-mcp",
      transport: "stdio",
      command: "npx -y @modelcontextprotocol/server-github",
      envVars: { GITHUB_TOKEN: "abc" },
      toolsFilter: ["search_repositories"],
    })
    expect(r.ok).toBe(true)
  })

  it("accepts valid http input", () => {
    const r = validateMcpInput({
      name: "remote-mcp",
      transport: "http",
      url: "https://example.com/mcp",
    })
    expect(r.ok).toBe(true)
  })
})

describe("MCP queries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("listMcpServers filters by orgId, ordered by createdAt desc", async () => {
    mockFindMany.mockResolvedValue([])
    await listMcpServers("org-1")
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      orderBy: { createdAt: "desc" },
    })
  })

  it("getMcpServer scopes by orgId AND id", async () => {
    mockFindFirst.mockResolvedValue(null)
    await getMcpServer("org-1", "srv-1")
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "srv-1", orgId: "org-1" },
    })
  })

  it("createMcpServer persists normalized fields", async () => {
    mockCreate.mockResolvedValue({ id: "new" })
    await createMcpServer("org-1", {
      name: "  Github  ",
      transport: "stdio",
      command: "  npx server  ",
    })
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: "org-1",
        name: "Github",
        transport: "stdio",
        command: "npx server",
        url: null,
        envVars: {},
        toolsFilter: [],
      }),
    })
  })

  it("updateMcpServer scopes by orgId via findFirst pre-check", async () => {
    mockFindFirst.mockResolvedValue({
      id: "srv-1",
      orgId: "org-1",
      name: "Old",
      transport: "stdio",
      command: "node",
      url: null,
      envVars: {},
      toolsFilter: [],
    })
    mockUpdate.mockResolvedValue({ id: "srv-1" })

    await updateMcpServer("org-1", "srv-1", { name: "Renamed" })

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "srv-1", orgId: "org-1" },
    })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "srv-1" },
      data: expect.objectContaining({ name: "Renamed" }),
    })
  })

  it("updateMcpServer returns not_found for cross-org id", async () => {
    mockFindFirst.mockResolvedValue(null)
    const result = await updateMcpServer("org-1", "srv-other", { name: "Renamed" })
    expect(result.ok).toBe(false)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("deleteMcpServer requires existing row in org", async () => {
    mockFindFirst.mockResolvedValue({ id: "srv-1", orgId: "org-1" })
    mockDelete.mockResolvedValue({ id: "srv-1" })
    const result = await deleteMcpServer("org-1", "srv-1")
    expect(result.ok).toBe(true)
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "srv-1" } })
  })

  it("deleteMcpServer returns not_found for cross-org id", async () => {
    mockFindFirst.mockResolvedValue(null)
    const result = await deleteMcpServer("org-1", "srv-other-org")
    expect(result.ok).toBe(false)
    expect(mockDelete).not.toHaveBeenCalled()
  })
})
