import { prisma } from "@/lib/db/prisma"
import { parseSkillMd } from "./parse-skill-md"

export interface ParsedUrl {
  owner: string
  repo: string
  branch: string | null
  path: string | null
}

export function parseGithubUrl(input: string): ParsedUrl | null {
  if (!input || typeof input !== "string") return null
  const trimmed = input.trim()
  if (!trimmed) return null

  const httpsMatch = trimmed.match(
    /^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/tree\/([\w.\-_/]+?))?(?:\/?)$/,
  )
  if (httpsMatch) {
    const treeBranchPath = httpsMatch[3] ?? null
    let branch: string | null = null
    let path: string | null = null
    if (treeBranchPath) {
      const segments = treeBranchPath.split("/")
      branch = segments[0]
      if (segments.length > 1) path = segments.slice(1).join("/")
    }
    return {
      owner: httpsMatch[1],
      repo: httpsMatch[2].replace(/\.git$/, ""),
      branch,
      path,
    }
  }

  const shortMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/)
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2].replace(/\.git$/, ""),
      branch: null,
      path: null,
    }
  }

  return null
}

export interface InstallFromGithubInput {
  url: string
  dryRun?: boolean
}

export type GithubInstallResult =
  | {
      ok: true
      skill: { id?: string; name: string; description: string; sourceUrl: string; sourceRef: string }
      dryRun: boolean
    }
  | { ok: false; error: string }

const GH_API = "https://api.github.com"

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  const token = process.env.GITHUB_TOKEN
  if (token) h["Authorization"] = `Bearer ${token}`
  return h
}

async function ghFetch(path: string): Promise<Response> {
  return fetch(`${GH_API}${path}`, { headers: ghHeaders() })
}

async function ghFetchRaw(
  owner: string,
  repo: string,
  ref: string,
  path: string,
): Promise<Response> {
  return fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`,
    { headers: ghHeaders() },
  )
}

export async function installFromGithub(
  orgId: string,
  input: InstallFromGithubInput,
): Promise<GithubInstallResult> {
  const parsed = parseGithubUrl(input.url)
  if (!parsed) {
    return { ok: false, error: `Invalid GitHub URL: ${input.url}` }
  }

  const repoRes = await ghFetch(`/repos/${parsed.owner}/${parsed.repo}`)
  if (repoRes.status === 403) {
    return { ok: false, error: "GitHub API rate-limited (403). Set GITHUB_TOKEN env var to authenticate." }
  }
  if (!repoRes.ok) {
    return { ok: false, error: `Failed to fetch repo: ${repoRes.status}` }
  }
  const repoInfo = (await repoRes.json()) as { default_branch?: string }
  const branch = parsed.branch || repoInfo.default_branch || "main"

  const branchRes = await ghFetch(`/repos/${parsed.owner}/${parsed.repo}/branches/${branch}`)
  if (!branchRes.ok) {
    return { ok: false, error: `Failed to fetch branch ${branch}: ${branchRes.status}` }
  }
  const branchInfo = (await branchRes.json()) as { commit?: { sha?: string } }
  const sha = branchInfo.commit?.sha
  if (!sha) {
    return { ok: false, error: `Could not resolve commit SHA for ${branch}` }
  }

  const basePath = parsed.path ? `${parsed.path}/` : ""

  const skillMdRes = await ghFetchRaw(parsed.owner, parsed.repo, sha, `${basePath}SKILL.md`)
  if (!skillMdRes.ok) {
    return { ok: false, error: `SKILL.md not found at ${parsed.owner}/${parsed.repo}/${basePath}` }
  }
  const skillMdContent = await skillMdRes.text()

  const parsedSkill = parseSkillMd(skillMdContent)
  if (!parsedSkill.ok) {
    return { ok: false, error: `Failed to parse SKILL.md: ${parsedSkill.error}` }
  }

  const optionalFiles = ["tools.yaml", "hooks.yaml", "requirements.txt"]
  const files: Array<{ path: string; content: string }> = [
    { path: "SKILL.md", content: skillMdContent },
  ]

  for (const optPath of optionalFiles) {
    const res = await ghFetchRaw(parsed.owner, parsed.repo, sha, `${basePath}${optPath}`)
    if (res.ok) {
      const text = await res.text()
      files.push({ path: optPath, content: text })
    }
  }

  const sourceUrl = `https://github.com/${parsed.owner}/${parsed.repo}${
    parsed.path ? `/tree/${branch}/${parsed.path}` : ""
  }`

  if (input.dryRun) {
    return {
      ok: true,
      skill: {
        name: parsedSkill.value.name,
        description: parsedSkill.value.description,
        sourceUrl,
        sourceRef: sha,
      },
      dryRun: true,
    }
  }

  const existing = await prisma.skill.findFirst({
    where: { orgId, name: parsedSkill.value.name },
  })

  if (existing) {
    return {
      ok: false,
      error: `Skill "${parsedSkill.value.name}" is already installed in this org`,
    }
  }

  const created = await prisma.skill.create({
    data: {
      orgId,
      name: parsedSkill.value.name,
      description: parsedSkill.value.description,
      source: "github",
      isPublic: false,
      sourceUrl,
      sourceRef: sha,
      files: files as unknown as object,
      triggers: parsedSkill.value.triggers,
      userInvocable: parsedSkill.value.userInvocable,
    },
  })

  return {
    ok: true,
    skill: {
      id: created.id,
      name: created.name,
      description: created.description ?? parsedSkill.value.description,
      sourceUrl,
      sourceRef: sha,
    },
    dryRun: false,
  }
}
