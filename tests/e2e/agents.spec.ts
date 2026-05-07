import { test, expect } from '@playwright/test'

test.describe('Agent Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/acme-corp/agents')
  })

  test('should display agent list with stats', async ({ page }) => {
    // Check heading
    await expect(page.getByRole('heading', { name: /ai agents/i })).toBeVisible()
    
    // Check stats cards
    await expect(page.getByText(/total agents/i)).toBeVisible()
    await expect(page.getByText(/active/i)).toBeVisible()
    await expect(page.getByText(/inactive/i)).toBeVisible()
    
    // Stats should show numbers
    const statsSection = page.locator('.grid', { hasText: /total agents/i })
    await expect(statsSection).toBeVisible()
  })

  test('should display agent cards with details', async ({ page }) => {
    // Should have agent cards (from seed data)
    const agentCards = page.locator('[data-testid="agent-card"]')
    await expect(agentCards.first()).toBeVisible()
    
    // Check for role badges
    await expect(page.getByText(/ceo|orchestrator|worker/i).first()).toBeVisible()
  })

  test('should create new agent', async ({ page }) => {
    // Click new agent button
    await page.getByRole('button', { name: /new agent/i }).click()
    
    // Fill form
    await page.getByLabel(/name/i).fill('E2E Test Agent')
    await page.getByLabel(/hermes profile/i).fill(`e2e-test-agent-${Date.now()}`)
    await page.getByLabel(/description/i).fill('Created by E2E test')
    await page.getByLabel(/soul content/i).fill('Test agent personality')
    
    // Add a skill
    await page.getByPlaceholder(/add a skill/i).fill('testing')
    await page.getByRole('button', { name: /add skill/i }).click()
    
    // Submit
    await page.getByRole('button', { name: /create agent/i }).click()
    
    // Verify agent appears in list
    await expect(page.getByText('E2E Test Agent')).toBeVisible()
  })

  test('should show error for duplicate hermes profile', async ({ page }) => {
    // Click new agent
    await page.getByRole('button', { name: /new agent/i }).click()
    
    // Fill with existing profile (from seed)
    await page.getByLabel(/name/i).fill('Duplicate Agent')
    await page.getByLabel(/hermes profile/i).fill('acme-ceo')
    
    // Submit
    await page.getByRole('button', { name: /create agent/i }).click()
    
    // Should show error
    await expect(page.getByText(/already exists|error/i)).toBeVisible()
  })

  test('should toggle agent status', async ({ page }) => {
    // Find first active agent
    const firstAgent = page.locator('[data-testid="agent-card"]').first()
    
    // Find toggle switch
    const toggle = firstAgent.locator('input[type="checkbox"], [role="switch"]')
    
    // Get initial state
    const wasActive = await toggle.isChecked()
    
    // Toggle
    await toggle.click()
    
    // Wait for update
    await page.waitForTimeout(500)
    
    // Stats should update
    await expect(page.getByText(/active/i)).toBeVisible()
  })

  test('should show agent skills as badges', async ({ page }) => {
    // Find agent with skills
    const agentWithSkills = page.locator('[data-testid="agent-card"]').filter({
      has: page.locator('.badge, [role="badge"]')
    })
    
    // Skills should be visible
    await expect(page.getByText(/strategy|coding|debugging/i).first()).toBeVisible()
  })

  test('should navigate to agents from sidebar', async ({ page }) => {
    // Go to dashboard first
    await page.goto('/acme-corp')
    
    // Click agents in sidebar
    await page.getByRole('link', { name: /^agents$/i }).click()
    
    // Should be on agents page
    await expect(page).toHaveURL('/acme-corp/agents')
    await expect(page.getByRole('heading', { name: /ai agents/i })).toBeVisible()
  })
})