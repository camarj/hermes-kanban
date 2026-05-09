import { test, expect } from '@playwright/test'

test.describe('Onboarding Flow', () => {
  test('should register new user, create organization, and redirect to dashboard', async ({ page }) => {
    const timestamp = Date.now()
    const email = `onboarding-${timestamp}@example.com`
    const password = 'TestPassword123!'
    const orgName = 'Test Organization'
    
    // Step 1: Go to register page
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible()
    
    // Step 2: Fill registration form
    await page.getByLabel(/name/i).fill('Test User')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/password/i).fill(password)
    
    // Step 3: Submit registration
    await page.getByRole('button', { name: /create account/i }).click()
    
    // Step 4: Should redirect to create organization page
    await page.waitForURL('/onboarding/create-organization', { timeout: 15000 })
    await expect(page.getByRole('heading', { name: /welcome to hermes kanban/i })).toBeVisible()
    
    // Step 5: Fill organization form
    await page.getByLabel(/organization name/i).fill(orgName)
    await page.getByLabel(/objective/i).fill('E2E testing organization for onboarding flow')
    
    // Step 6: Submit organization creation
    await page.getByRole('button', { name: /create organization/i }).click()
    
    // Step 7: Should redirect to organization dashboard
    await page.waitForURL(/\/[a-z-]+$/, { timeout: 15000 })
    
    // Step 8: Verify dashboard loaded with kanban board
    await expect(page.getByRole('button', { name: /add task/i })).toBeVisible({ timeout: 10000 })
    
    // Step 9: Verify sidebar with navigation
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /agents/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /members/i })).toBeVisible()
    
    console.log(`✅ Onboarding flow completed successfully for ${email}`)
  })
})



