import { test, expect } from "@playwright/test"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const TEST_AGENT_NAME = "E2E Edit Worker"

test.describe("Agent edit flow", () => {
  test.beforeAll(async () => {
    const org = await prisma.organization.findUnique({ where: { slug: "acme-corp" } })
    if (!org) return
    await prisma.agent.deleteMany({ where: { orgId: org.id, name: TEST_AGENT_NAME } })

    const template = await prisma.agentTemplate.findFirst({
      where: { orgId: org.id, name: { contains: "Backend" } },
    })
    if (!template) return

    await prisma.agent.create({
      data: {
        orgId: org.id,
        templateId: template.id,
        hermesProfile: `worker-acme-corp-e2e-edit-worker`,
        name: TEST_AGENT_NAME,
        description: "Pre-existing for edit test",
        soulContent: "Original SOUL.",
        skills: ["kanban-worker", "backend-development"],
        tools: ["git"],
        toolsets: ["development"],
        mcpServers: [],
        mcpServerIds: [],
        specialization: "backend-engineer",
        isActive: true,
      },
    })
  })

  test.afterAll(async () => {
    const org = await prisma.organization.findUnique({ where: { slug: "acme-corp" } })
    if (!org) return
    await prisma.agent.deleteMany({ where: { orgId: org.id, name: TEST_AGENT_NAME } })
  })

  test("edits SOUL + name via the dialog and persists", async ({ page }) => {
    await page.goto("/acme-corp/agents")

    const card = page.getByTestId("agent-card").filter({ hasText: TEST_AGENT_NAME })
    await expect(card).toBeVisible({ timeout: 10000 })

    await card.getByRole("button", { name: /edit/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    await expect(dialog.locator("text=Locked")).toBeVisible()

    await dialog.locator("#agent-soul").fill("Edited SOUL via Playwright.")
    await dialog.locator("#agent-description").fill("Edited via E2E.")

    await dialog.getByRole("button", { name: /save & regenerate/i }).click()

    // Wait until the dialog auto-closes (success path) or settle on the regen banner
    await dialog.waitFor({ state: "hidden", timeout: 10000 }).catch(() => null)

    const org = await prisma.organization.findUnique({ where: { slug: "acme-corp" } })
    const updated = await prisma.agent.findFirst({
      where: { orgId: org!.id, name: TEST_AGENT_NAME },
    })
    expect(updated!.soulContent).toBe("Edited SOUL via Playwright.")
    expect(updated!.description).toBe("Edited via E2E.")
  })

  test("Edit dialog locks the role/template badges (no input to change)", async ({ page }) => {
    await page.goto("/acme-corp/agents")
    const card = page.getByTestId("agent-card").filter({ hasText: TEST_AGENT_NAME })
    await card.getByRole("button", { name: /edit/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog.locator("text=worker")).toBeVisible()
    expect(await dialog.locator('[name="templateId"], [name="roleType"]').count()).toBe(0)
  })
})
