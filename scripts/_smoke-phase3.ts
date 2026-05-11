/* Phase 3 backend smoke test.
   Exercises the real regen pipeline against an isolated HERMES_HOME under /tmp.
   No browser. No auth. Direct prisma + helpers. */

import { mkdtemp, readFile, readdir, stat, rm } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { PrismaClient } from "@prisma/client"

async function main() {
  // Force HERMES_HOME to a fresh temp dir so we can verify filesystem state.
  const home = await mkdtemp(join(tmpdir(), "hermes-smoke-"))
  process.env.HERMES_HOME = home
  // Block hermesClient from spending 5s on a real /v1/runs call.
  process.env.HERMES_GATEWAY_URL = "http://127.0.0.1:1"
  console.log(`HERMES_HOME=${home}`)

  // Import AFTER setting env so the singleton picks them up.
  const { regenerateAgentProfile } = await import("../src/lib/agents/regenerate-agent")
  const { propagateMcpUpdate } = await import("../src/lib/mcp/propagate")
  const { processNextJob } = await import("../src/lib/hermes/regen-drain")

  const prisma = new PrismaClient()
  const acme = await prisma.organization.findUnique({ where: { slug: "acme-corp" } })
  if (!acme) throw new Error("acme-corp not seeded")

  const worker = await prisma.agent.findFirst({
    where: { orgId: acme.id, template: { roleType: "worker" } },
    include: { template: { select: { roleType: true } } },
  })
  if (!worker) throw new Error("no worker agent in acme")
  console.log(`Worker: ${worker.name} (${worker.hermesProfile})`)

  // Ensure specialization is set (regenerate-agent requires it for workers via
  // the build*Profile path; default 'general' is acceptable).
  if (!worker.specialization) {
    await prisma.agent.update({
      where: { id: worker.id },
      data: { specialization: "backend-engineer" },
    })
  }

  const profileDir = join(home, "profiles", worker.hermesProfile)

  // STEP 1 — Baseline regen (no skills, no MCPs)
  console.log("\n[1] Baseline regen…")
  let r = await regenerateAgentProfile(worker.id, { reason: "smoke-baseline", forceImmediate: true })
  console.log("   →", r)
  if (r.status !== "regenerated") throw new Error("baseline regen failed")

  let config = await readFile(join(profileDir, "config.yaml"), "utf-8")
  await readFile(join(profileDir, "SOUL.md"), "utf-8")
  const skillsRoot = join(profileDir, "skills")
  let skillsDirs = await readdir(skillsRoot)
  console.log("   skills/ on disk:", skillsDirs)

  // STEP 2 — Attach react-patterns curated skill and regen
  console.log("\n[2] Install curated 'react-patterns' to org + attach to worker + regen…")
  const reactCurated = await prisma.skill.findFirst({
    where: { source: "curated", name: "react-patterns", orgId: null },
  })
  if (!reactCurated) throw new Error("react-patterns curated skill not seeded")

  // Copy curated to org (idempotent: skip if already present)
  let orgSkill = await prisma.skill.findFirst({
    where: { orgId: acme.id, name: "react-patterns" },
  })
  if (!orgSkill) {
    orgSkill = await prisma.skill.create({
      data: {
        orgId: acme.id,
        name: reactCurated.name,
        description: reactCurated.description,
        source: "curated",
        isPublic: false,
        files: reactCurated.files as object,
        triggers: reactCurated.triggers,
        userInvocable: reactCurated.userInvocable,
        version: reactCurated.version,
      },
    })
  }
  console.log(`   org skill row: ${orgSkill.id}`)

  await prisma.agent.update({
    where: { id: worker.id },
    data: { skills: Array.from(new Set([...worker.skills, "react-patterns"])) },
  })
  r = await regenerateAgentProfile(worker.id, { reason: "smoke-skill-attach", forceImmediate: true })
  console.log("   →", r)
  if (r.status !== "regenerated") throw new Error("skill-attach regen failed")

  const reactSkillFile = join(profileDir, "skills", "react-patterns", "SKILL.md")
  const reactSkillMd = await readFile(reactSkillFile, "utf-8")
  console.log("   skills/react-patterns/SKILL.md present:", reactSkillMd.split("\n")[0])

  config = await readFile(join(profileDir, "config.yaml"), "utf-8")
  if (!config.includes("- react-patterns")) throw new Error("config.yaml missing react-patterns entry")
  console.log("   config.yaml lists react-patterns ✓")

  // STEP 3 — Create custom skill, attach, regen
  console.log("\n[3] Create custom 'inteliside-style' + attach + regen…")
  const customName = "inteliside-style"
  await prisma.skill.deleteMany({ where: { orgId: acme.id, name: customName } })
  await prisma.skill.create({
    data: {
      orgId: acme.id,
      name: customName,
      description: "Inteliside brand and code style — concise, opinionated, no sugar.",
      source: "custom",
      isPublic: false,
      files: [
        {
          path: "SKILL.md",
          content:
            "---\nname: inteliside-style\ndescription: Inteliside brand and code style — concise, opinionated, no sugar.\n---\n\n# Inteliside Style\n\n- Be direct. No hedging.\n- Quote files with paths and line numbers.\n- Don't write code without first verifying current state.\n",
        },
      ] as object,
      triggers: ["style", "brand", "inteliside"],
      userInvocable: true,
      version: "1.0.0",
    },
  })
  await prisma.agent.update({
    where: { id: worker.id },
    data: {
      skills: Array.from(
        new Set([...(await prisma.agent.findUnique({ where: { id: worker.id } }))!.skills, customName]),
      ),
    },
  })
  r = await regenerateAgentProfile(worker.id, { reason: "smoke-custom-skill", forceImmediate: true })
  console.log("   →", r)
  if (r.status !== "regenerated") throw new Error("custom-skill regen failed")
  const customMd = await readFile(join(profileDir, "skills", customName, "SKILL.md"), "utf-8")
  console.log("   skills/inteliside-style/SKILL.md present:", customMd.split("\n")[0])

  // STEP 4 — MCP server + propagation
  console.log("\n[4] Create MCP server, attach to worker, regen…")
  await prisma.mcpServer.deleteMany({ where: { orgId: acme.id, name: "smoke-playwright-mcp" } })
  const mcp = await prisma.mcpServer.create({
    data: {
      orgId: acme.id,
      name: "smoke-playwright-mcp",
      transport: "http",
      url: "http://127.0.0.1:9999",
      envVars: { OLD_TOKEN: "v0" },
      toolsFilter: [],
    },
  })
  console.log(`   MCP ${mcp.id} created`)
  await prisma.agent.update({
    where: { id: worker.id },
    data: { mcpServerIds: [mcp.id] },
  })
  r = await regenerateAgentProfile(worker.id, { reason: "smoke-mcp-attach", forceImmediate: true })
  console.log("   →", r)
  config = await readFile(join(profileDir, "config.yaml"), "utf-8")
  if (!config.includes("smoke-playwright-mcp")) throw new Error("config.yaml missing MCP entry")
  if (!config.includes("OLD_TOKEN")) throw new Error("config.yaml missing OLD_TOKEN env")
  console.log("   config.yaml lists smoke-playwright-mcp with OLD_TOKEN ✓")

  // STEP 5 — Edit MCP, propagate, drain, verify new env in config.yaml
  console.log("\n[5] Edit MCP env vars + propagate + drain…")
  await prisma.mcpServer.update({
    where: { id: mcp.id },
    data: { envVars: { NEW_TOKEN: "v1" } },
  })
  const prop = await propagateMcpUpdate(acme.id, mcp.id)
  console.log(`   propagate → affectedAgents=${prop.affectedAgents}`)
  if (prop.affectedAgents !== 1) throw new Error("expected 1 affected agent")

  // propagateMcpUpdate already fired-and-forgot kickRegenDrain. Wait for it to
  // settle by polling the job table (poll every 200ms, max 5s).
  const deadline = Date.now() + 5000
  let lastStatus: string | undefined
  while (Date.now() < deadline) {
    const j = await prisma.profileRegenJob.findFirst({
      where: { agentId: worker.id },
      orderBy: { createdAt: "desc" },
    })
    lastStatus = j?.status
    if (lastStatus === "done" || lastStatus === "failed") break
    // Also try to advance the queue ourselves in case the kick already
    // released the single-flight flag (e.g. a previous job finished).
    await processNextJob()
    await new Promise((r) => setTimeout(r, 200))
  }
  console.log(`   drain settled → last job status=${lastStatus}`)
  if (lastStatus !== "done") {
    const j = await prisma.profileRegenJob.findFirst({
      where: { agentId: worker.id },
      orderBy: { createdAt: "desc" },
    })
    throw new Error(`drain did not finish: ${JSON.stringify(j)}`)
  }

  config = await readFile(join(profileDir, "config.yaml"), "utf-8")
  if (!config.includes("NEW_TOKEN")) {
    console.log("---- config.yaml ----")
    console.log(config)
    throw new Error("config.yaml missing NEW_TOKEN env after propagation")
  }
  if (config.includes("OLD_TOKEN")) throw new Error("config.yaml still references OLD_TOKEN")
  console.log("   config.yaml updated with NEW_TOKEN ✓")

  // STEP 6 — Atomicity check: no leftover .staging dirs
  console.log("\n[6] Atomicity check (no .staging dirs)…")
  const profilesDir = join(home, "profiles")
  const entries = await readdir(profilesDir)
  const staging = entries.filter((e) => e.startsWith(".staging"))
  if (staging.length > 0) throw new Error(`leftover staging dirs: ${staging.join(", ")}`)
  console.log("   no .staging-* leftovers ✓")

  // STEP 7 — Reject role-change attempt via patch-agent
  console.log("\n[7] patch-agent rejects role/template changes…")
  const { patchAgent } = await import("../src/lib/agents/patch-agent")
  const reject = await patchAgent(acme.id, worker.id, { templateId: "different" })
  if (reject.status !== 400) throw new Error("patchAgent did not reject templateId change")
  console.log(`   400 received → "${reject.error}" ✓`)

  // STEP 8 — Summary of filesystem state
  console.log("\n[8] Filesystem summary:")
  skillsDirs = await readdir(skillsRoot)
  console.log("   profile dir:", profileDir)
  console.log("   skills installed:", skillsDirs.sort())
  const cfgSize = (await stat(join(profileDir, "config.yaml"))).size
  const soulSize = (await stat(join(profileDir, "SOUL.md"))).size
  console.log(`   config.yaml: ${cfgSize}B   SOUL.md: ${soulSize}B`)

  // STEP 9 — Cleanup: remove the temp HERMES_HOME
  await rm(home, { recursive: true, force: true })
  await prisma.$disconnect()
  console.log("\nALL SMOKE STEPS PASSED ✓")
}

main().catch((err) => {
  console.error("\nSMOKE FAILED:", err)
  process.exit(1)
})
