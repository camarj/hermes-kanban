import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"

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

import { parseGithubUrl, installFromGithub } from "@/lib/skills/github-installer"

describe("parseGithubUrl", () => {
  it("parses canonical https URLs", () => {
    expect(parseGithubUrl("https://github.com/inteliside/hermes-skill-foo")).toEqual({
      owner: "inteliside",
      repo: "hermes-skill-foo",
      branch: null,
      path: null,
    })
  })

  it("parses URLs with explicit branch and path (tree)", () => {
    expect(
      parseGithubUrl("https://github.com/inteliside/hermes-skills/tree/main/react-patterns"),
    ).toEqual({
      owner: "inteliside",
      repo: "hermes-skills",
      branch: "main",
      path: "react-patterns",
    })
  })

  it("parses owner/repo short form", () => {
    expect(parseGithubUrl("inteliside/hermes-skill-bar")).toEqual({
      owner: "inteliside",
      repo: "hermes-skill-bar",
      branch: null,
      path: null,
    })
  })

  it("rejects garbage input", () => {
    expect(parseGithubUrl("not a url")).toBeNull()
    expect(parseGithubUrl("https://example.com/foo")).toBeNull()
    expect(parseGithubUrl("")).toBeNull()
  })

  it("strips .git suffix", () => {
    expect(parseGithubUrl("https://github.com/a/b.git")).toEqual({
      owner: "a",
      repo: "b",
      branch: null,
      path: null,
    })
  })
})

describe("installFromGithub", () => {
  const originalFetch = global.fetch
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  }

  function textResponse(text: string, status = 200) {
    return new Response(text, { status })
  }

  it("rejects unparseable URLs", async () => {
    const r = await installFromGithub("org-1", { url: "not a url" })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/url/i)
  })

  it("fetches default branch + SHA + SKILL.md and persists with source=github", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ default_branch: "main" })) // repo info
      .mockResolvedValueOnce(jsonResponse({ commit: { sha: "abc1234def" } })) // branch info
      .mockResolvedValueOnce(
        textResponse(
          `---\nname: ghost-skill\ndescription: From the ether.\n---\n# Body`,
        ),
      ) // SKILL.md
      .mockResolvedValue(textResponse("", 404)) // any optional siblings

    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: "new-id", name: "ghost-skill" })

    const r = await installFromGithub("org-1", {
      url: "https://github.com/owner/repo",
    })

    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.skill.name).toBe("ghost-skill")
    }
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: "org-1",
        name: "ghost-skill",
        source: "github",
        sourceUrl: expect.stringContaining("github.com/owner/repo"),
        sourceRef: "abc1234def",
        isPublic: false,
      }),
    })
  })

  it("dryRun returns parsed preview without persisting", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ default_branch: "main" }))
      .mockResolvedValueOnce(jsonResponse({ commit: { sha: "sha1" } }))
      .mockResolvedValueOnce(
        textResponse(`---\nname: preview-skill\ndescription: Preview.\n---\nbody`),
      )
      .mockResolvedValue(textResponse("", 404))

    const r = await installFromGithub("org-1", {
      url: "https://github.com/o/r",
      dryRun: true,
    })

    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.skill.name).toBe("preview-skill")
      expect(r.dryRun).toBe(true)
    }
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("returns error when SKILL.md is missing in the repo", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ default_branch: "main" }))
      .mockResolvedValueOnce(jsonResponse({ commit: { sha: "x" } }))
      .mockResolvedValueOnce(textResponse("Not found", 404))

    const r = await installFromGithub("org-1", { url: "https://github.com/o/r" })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/SKILL\.md/i)
  })

  it("returns error when GitHub API rate-limits (403)", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("rate limited", 403))
    const r = await installFromGithub("org-1", { url: "https://github.com/o/r" })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/rate|403/i)
  })

  it("returns error when org already has a skill with the same name", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ default_branch: "main" }))
      .mockResolvedValueOnce(jsonResponse({ commit: { sha: "x" } }))
      .mockResolvedValueOnce(
        textResponse(`---\nname: dup-skill\ndescription: x\n---\n`),
      )
      .mockResolvedValue(textResponse("", 404))

    mockFindFirst.mockResolvedValue({ id: "existing", name: "dup-skill" })

    const r = await installFromGithub("org-1", { url: "https://github.com/o/r" })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/already.*installed|exists/i)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("uses GITHUB_TOKEN env var when set (authenticated requests)", async () => {
    process.env.GITHUB_TOKEN = "ghp_test123"
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ default_branch: "main" }))
      .mockResolvedValueOnce(jsonResponse({ commit: { sha: "x" } }))
      .mockResolvedValueOnce(
        textResponse(`---\nname: tok-skill\ndescription: x\n---\n`),
      )
      .mockResolvedValue(textResponse("", 404))

    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: "id", name: "tok-skill" })

    await installFromGithub("org-1", {
      url: "https://github.com/o/r",
      dryRun: true,
    })

    const firstCall = fetchMock.mock.calls[0]
    const init = firstCall[1] as { headers?: Record<string, string> } | undefined
    const auth = init?.headers?.["Authorization"] || init?.headers?.["authorization"]
    expect(auth).toBe("Bearer ghp_test123")

    delete process.env.GITHUB_TOKEN
  })
})
