import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('/login')
    
    // Check form elements
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
    
    // Check Google sign in button
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible()
  })

  test('should show register form', async ({ page }) => {
    await page.goto('/register')
    
    // Check form elements
    await expect(page.getByLabel('Name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
  })
})
