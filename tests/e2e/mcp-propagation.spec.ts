import { test, expect } from "@playwright/test"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const MCP_NAME = "E2E Propagation MCP"
const AGENT_NAME = "E2E MCP Consumer"

test.describe("MCP propagation to agents", () => {
  let createdServerId: string | null = null
  let createdAgentId: string | null = null

  test.beforeAll(async () => {
    const org = await prisma.organization.findUnique({ where: { slug: "acme-corp" } })
    if (!org) return

    await prisma.agent.deleteMany({ where: { orgId: org.id, name: AGENT_NAME } })
    await prisma.mcpServer.deleteMany({ where: { orgId: org.id, name: MCP_NAME } })

    const server = await prisma.mcpServer.create({
      data: {
        orgId: org.id,
        name: MCP_NAME,
        transport: "stdio",
        command: "npx some-mcp",
        envVars: { OLD_KEY: "old" },
        toolsFilter: [],
      },
    })
    createdServerId = server.id

    const template = await prisma.agentTemplate.findFirst({
      where: { orgId: org.id, name: { contains: "Backend" } },
    })
    const agent = await prisma.agent.create({
      data: {
        orgId: org.id,
        templateId: template?.id ?? null,
        hermesProfile: `worker-acme-corp-e2e-mcp-consumer`,
        name: AGENT_NAME,
        description: "Uses the test MCP",
        soulContent: "Worker",
        skills: ["kanban-worker"],
        tools: [],
        toolsets: ["development"],
        mcpServers: [],
        mcpServerIds: [server.id],
        specialization: "backend-engineer",
        isActive: true,
      },
    })
    createdAgentId = agent.id
  })

  test.afterAll(async () => {
    if (createdAgentId) {
      await prisma.profileRegenJob.deleteMany({ where: { agentId: createdAgentId } })
      await prisma.agent.delete({ where: { id: createdAgentId } }).catch(() => {})
    }
    if (createdServerId) {
      await prisma.mcpServer.delete({ where: { id: createdServerId } }).catch(() => {})
    }
  })

  test("editing the MCP enqueues regen jobs and shows propagation banner", async ({ page }) => {
    await page.goto("/acme-corp/mcp-servers")

    const card = page.locator(`text=${MCP_NAME}`).locator("xpath=ancestor::div[contains(@class, 'rounded-lg')][1]")
    await expect(card).toBeVisible()
    await card.getByRole("button", { name: /edit/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // Change env vars textarea content (form serializes as KEY=value lines)
    const envTextarea = dialog.locator('textarea').first()
    if (await envTextarea.count() > 0) {
      await envTextarea.fill("NEW_KEY=new-value")
    }

    await dialog.getByRole("button", { name: /save|update/i }).first().click()
    await expect(dialog).not.toBeVisible({ timeout: 8000 })

    // Banner appears (post-edit propagation notice in MCP page header)
    await expect(
      page.locator(`text=/Regenerating .* that use ${MCP_NAME}/i`),
    ).toBeVisible({ timeout: 5000 })

    // Verify a regen job was enqueued
    await page.waitForTimeout(500)
    const jobs = await prisma.profileRegenJob.findMany({
      where: { agentId: createdAgentId! },
      orderBy: { createdAt: "desc" },
      take: 1,
    })
    expect(jobs.length).toBeGreaterThanOrEqual(1)
    expect(jobs[0].reason).toContain("mcp-edit:")
  })
})
