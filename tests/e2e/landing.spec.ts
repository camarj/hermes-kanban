import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should display the landing page with correct title', async ({ page }) => {
    await page.goto('/')
    
    // Should redirect to login since not authenticated
    await expect(page).toHaveURL('/login')
    
    // Check for Hermes Kanban branding
    await expect(page.getByRole('heading', { name: 'Hermes Kanban' })).toBeVisible()
    await expect(page.getByText('Sign in to your account')).toBeVisible()
  })

  test('should have working navigation to register', async ({ page }) => {
    await page.goto('/login')
    
    // Click on sign up link
    await page.getByRole('link', { name: 'Sign up' }).click()
    
    // Should navigate to register page
    await expect(page).toHaveURL('/register')
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible()
  })
})
