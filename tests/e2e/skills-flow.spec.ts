import { test, expect } from "@playwright/test"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

test.describe("Skills CRUD + marketplace", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeAll(async () => {
    const org = await prisma.organization.findUnique({ where: { slug: "acme-corp" } })
    if (org) {
      await prisma.skill.deleteMany({
        where: { orgId: org.id, name: { in: ["e2e-skill", "react-patterns"] } },
      })
    }
  })

  test.afterAll(async () => {
    const org = await prisma.organization.findUnique({ where: { slug: "acme-corp" } })
    if (org) {
      await prisma.skill.deleteMany({
        where: { orgId: org.id, name: { in: ["e2e-skill", "react-patterns"] } },
      })
    }
  })

  test("creates a custom skill via the editor and lists it", async ({ page }) => {
    await page.goto("/acme-corp/skills")
    await expect(page.getByRole("heading", { name: /^skills$/i })).toBeVisible()

    await page.getByRole("button", { name: /new skill/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    await dialog.locator("#skill-name").fill("e2e-skill")
    await dialog.locator("#skill-desc").fill("E2E created skill for verification.")
    await dialog.locator("#skill-body").fill("# E2E Skill\n\nThis is a body created by Playwright.")

    await dialog.getByRole("button", { name: /save skill/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 8000 })

    // Verify card appears in installed list
    await expect(page.locator("text=/^e2e-skill$/")).toBeVisible({ timeout: 5000 })
    await expect(page.locator("text=E2E created skill")).toBeVisible()

    // Verify DB row
    const org = await prisma.organization.findUnique({ where: { slug: "acme-corp" } })
    const skill = await prisma.skill.findFirst({
      where: { orgId: org!.id, name: "e2e-skill" },
    })
    expect(skill).not.toBeNull()
    expect(skill!.source).toBe("custom")
    expect(skill!.description).toMatch(/E2E created skill/)
  })

  test("installs a curated skill from the marketplace into the org", async ({ page }) => {
    await page.goto("/acme-corp/skills")

    await page.getByRole("button", { name: /marketplace/i }).click()

    // Wait for at least one curated card
    const installBtn = page.getByRole("button", { name: /install to org/i }).first()
    await expect(installBtn).toBeVisible({ timeout: 5000 })

    // Pick the react-patterns card specifically. The card is the closest
    // ancestor that has the rounded-lg + p-4 + flex-col layout.
    const reactCard = page
      .locator("text=/^react-patterns$/")
      .locator("xpath=ancestor::div[contains(@class, 'rounded-lg') and contains(@class, 'flex-col')][1]")
    await reactCard.getByRole("button", { name: /install to org/i }).click()

    // After install, the button is replaced with "Installed" state
    await expect(reactCard.getByText("Installed").first()).toBeVisible({ timeout: 8000 })

    // Verify DB row
    const org = await prisma.organization.findUnique({ where: { slug: "acme-corp" } })
    const skill = await prisma.skill.findFirst({
      where: { orgId: org!.id, name: "react-patterns" },
    })
    expect(skill).not.toBeNull()
    expect(skill!.source).toBe("curated")
  })
})
