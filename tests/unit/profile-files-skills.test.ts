import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtemp, rm, readFile, readdir } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { ProfileManager, type CreateProfileInput, type SkillBundle } from "@/lib/hermes/profiles"

describe("ProfileManager.writeProfileFiles with skill bundles", () => {
  let hermesHome: string
  let manager: ProfileManager

  beforeEach(async () => {
    hermesHome = await mkdtemp(join(tmpdir(), "hermes-test-"))
    process.env.HERMES_HOME = hermesHome
    manager = new ProfileManager()
  })

  afterEach(async () => {
    await rm(hermesHome, { recursive: true, force: true })
    delete process.env.HERMES_HOME
  })

  function buildInput(skillBundles?: SkillBundle[]): CreateProfileInput {
    return {
      profileName: "test-worker",
      soulContent: "# I am a worker.",
      config: {
        model: "anthropic/claude-sonnet-4",
        system_prompt_file: "SOUL.md",
        skills: ["test-skill"],
      },
      skillBundles,
    }
  }

  it("writes SOUL.md and config.yaml at the profile dir root", async () => {
    await manager.createProfile(buildInput())
    const profileDir = join(hermesHome, "profiles", "test-worker")
    const soul = await readFile(join(profileDir, "SOUL.md"), "utf-8")
    const config = await readFile(join(profileDir, "config.yaml"), "utf-8")
    expect(soul).toBe("# I am a worker.")
    expect(config).toMatch(/skills:\n\s+- test-skill/)
  })

  it("creates an empty skills/ subdir when no skillBundles passed", async () => {
    await manager.createProfile(buildInput())
    const skillsDir = join(hermesHome, "profiles", "test-worker", "skills")
    const entries = await readdir(skillsDir)
    expect(entries).toEqual([])
  })

  it("writes each skill bundle file under skills/{name}/", async () => {
    const bundles: SkillBundle[] = [
      {
        name: "react-patterns",
        files: [
          { path: "SKILL.md", content: "---\nname: react-patterns\ndescription: x\n---\nbody" },
          { path: "references/hooks.md", content: "# hooks" },
        ],
      },
      {
        name: "infra",
        files: [{ path: "SKILL.md", content: "---\nname: infra\ndescription: x\n---\n" }],
      },
    ]
    await manager.createProfile(buildInput(bundles))

    const skillsDir = join(hermesHome, "profiles", "test-worker", "skills")
    const reactSkill = await readFile(join(skillsDir, "react-patterns", "SKILL.md"), "utf-8")
    expect(reactSkill).toMatch(/^---\nname: react-patterns/)

    const reactRef = await readFile(
      join(skillsDir, "react-patterns", "references", "hooks.md"),
      "utf-8",
    )
    expect(reactRef).toBe("# hooks")

    const infraSkill = await readFile(join(skillsDir, "infra", "SKILL.md"), "utf-8")
    expect(infraSkill).toMatch(/^---\nname: infra/)
  })

  it("atomic-replaces existing profile when called twice (no stale files)", async () => {
    const firstBundles: SkillBundle[] = [
      {
        name: "old-skill",
        files: [{ path: "SKILL.md", content: "---\nname: old-skill\ndescription: x\n---\n" }],
      },
    ]
    const secondBundles: SkillBundle[] = [
      {
        name: "new-skill",
        files: [{ path: "SKILL.md", content: "---\nname: new-skill\ndescription: x\n---\n" }],
      },
    ]
    await manager.createProfile(buildInput(firstBundles))
    await manager.createProfile(buildInput(secondBundles))

    const skillsDir = join(hermesHome, "profiles", "test-worker", "skills")
    const entries = await readdir(skillsDir)
    expect(entries.sort()).toEqual(["new-skill"])
  })

  it("no .staging directory remains after successful createProfile", async () => {
    await manager.createProfile(buildInput())
    const profilesRoot = join(hermesHome, "profiles")
    const entries = await readdir(profilesRoot)
    expect(entries.some((e) => e.startsWith(".staging"))).toBe(false)
  })

  it("ignores skillBundles that omit files array (defensive)", async () => {
    const malformed = [
      { name: "broken-skill", files: [] as { path: string; content: string }[] },
    ]
    await manager.createProfile(buildInput(malformed))
    const skillsDir = join(hermesHome, "profiles", "test-worker", "skills")
    const entries = await readdir(skillsDir)
    expect(entries.sort()).toEqual(["broken-skill"])
  })
})
