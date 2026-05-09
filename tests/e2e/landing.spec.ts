import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/')
    
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('heading', { name: /hermes kanban/i })).toBeVisible()
  })

  test('should have working navigation to register', async ({ page }) => {
    await page.goto('/login')
    
    await page.getByRole('link', { name: /sign up/i }).click()
    
    await expect(page).toHaveURL('/register')
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible()
  })
})

test.describe('Root route with authenticated user', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' })

  test('should redirect to organization dashboard when authenticated', async ({ page }) => {
    await page.goto('/')
    
    await expect(page).toHaveURL(/\/[a-z0-9-]+$/, { timeout: 10000 })
    await expect(page.getByRole('button', { name: /add task/i })).toBeVisible({ timeout: 5000 })
  })
})
