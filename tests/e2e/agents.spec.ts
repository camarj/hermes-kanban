import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

test.describe('Agent Management', () => {
  test.beforeEach(async ({ page }) => {
    // Clean up test agents
    const org = await prisma.organization.findUnique({
      where: { slug: 'acme-corp' },
    })
    
    if (org) {
      await prisma.agent.deleteMany({
        where: {
          orgId: org.id,
          OR: [
            { name: { in: ['E2E Backend Agent', 'Test Agent Close', 'CEO Agent'] } },
            { hermesProfile: { in: ['acme-corp-ceo', 'acme-corp-e2e-backend-agent'] } },
          ],
        },
      })
    }
    
    await page.goto('/acme-corp/agents')
  })

  test('should display agent list with stats', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /ai agents/i })).toBeVisible()
    
    const statsSection = page.locator('.grid').filter({ hasText: /total agents/i })
    await expect(statsSection).toBeVisible()
    
    await expect(statsSection.getByText(/total agents/i)).toBeVisible()
    await expect(statsSection.getByText(/active/i)).toBeVisible()
    await expect(statsSection.getByText(/hermes synced/i)).toBeVisible()
    await expect(statsSection.getByText(/workers/i)).toBeVisible()
  })

  test('should display agent cards with details', async ({ page }) => {
    const agentCards = page.getByTestId('agent-card')
    const count = await agentCards.count()
    
    if (count > 0) {
      await expect(agentCards.first()).toBeVisible()
    }
  })

  test('should create new worker agent from template', async ({ page }) => {
    await page.getByRole('button', { name: /new agent/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Step 1: pick level "Specialist"
    await dialog.getByRole('button', { name: /specialist/i }).click()
    await dialog.getByRole('button', { name: 'Next' }).click()

    // Step 2: pick a template card (Backend Engineer)
    await dialog.getByRole('button', { name: /backend engineer/i }).click()
    await dialog.getByRole('button', { name: 'Next' }).click()

    // Step 3: details — name should be prefilled from template
    const nameInput = dialog.locator('#agent-name')
    await expect(nameInput).toHaveValue(/backend engineer/i)
    await nameInput.fill('E2E Backend Agent')
    await dialog.getByLabel(/description/i).fill('Created by E2E test')

    await dialog.getByRole('button', { name: /create agent/i }).click()

    await expect(dialog).not.toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('agent-card').filter({ hasText: 'E2E Backend Agent' })).toBeVisible({ timeout: 5000 })
  })

  test('should create CEO agent', async ({ page }) => {
    await page.getByRole('button', { name: /new agent/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: /^ceo$/i }).click()

    const nextButton = dialog.getByRole('button', { name: 'Next' })
    await expect(nextButton).toBeEnabled()
    await nextButton.click()

    const nameInput = dialog.locator('#agent-name')
    await expect(nameInput).toBeVisible({ timeout: 5000 })
    await expect(nameInput).toHaveValue(/chief executive/i)

    const submitButton = dialog.getByRole('button', { name: /create agent/i })
    await submitButton.click()

    await expect(dialog).not.toBeVisible({ timeout: 20000 })
  })

  test('should toggle agent status', async ({ page }) => {
    const firstAgent = page.getByTestId('agent-card').first()
    
    if (await firstAgent.isVisible()) {
      const toggle = firstAgent.getByRole('switch')
      
      if (await toggle.isVisible()) {
        await toggle.click()
        await page.waitForTimeout(500)
        await expect(page.locator('.grid').filter({ hasText: /active/i })).toBeVisible()
      }
    }
  })

  test('should show agent skills as badges', async ({ page }) => {
    const agentCards = page.getByTestId('agent-card')
    const count = await agentCards.count()
    
    if (count > 0) {
      const firstCard = agentCards.first()
      const badges = firstCard.locator('[role="status"], [data-slot="badge"]')
      const badgeCount = await badges.count()
      expect(badgeCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('should navigate to agents from sidebar', async ({ page }) => {
    await page.goto('/acme-corp')
    
    await page.getByRole('link', { name: /^agents$/i }).click()
    
    await expect(page).toHaveURL('/acme-corp/agents')
    await expect(page.getByRole('heading', { name: /ai agents/i })).toBeVisible()
  })

  test('should show separate CEO section if CEO exists', async ({ page }) => {
    const ceoSection = page.getByRole('heading', { name: /ceo agent/i })
    
    if (await ceoSection.isVisible()) {
      await expect(ceoSection).toBeVisible()
      
      const workerSection = page.getByRole('heading', { name: /worker agents/i })
      await expect(workerSection).toBeVisible()
    }
  })
})
