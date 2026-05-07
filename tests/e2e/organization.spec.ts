import { test, expect } from '@playwright/test'

test.describe('Organization Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    // Note: This assumes you have test credentials set up
    // In a real scenario, you'd create a test user or use API to login
  })

  test('should redirect to onboarding when user has no organizations', async ({ page }) => {
    // This test assumes a fresh user without organizations
    await page.goto('/dashboard')
    
    // Should redirect to onboarding
    await expect(page).toHaveURL('/onboarding/create-organization')
    
    // Check form elements
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
    await expect(page.getByLabel(/organization name/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create organization/i })).toBeVisible()
  })

  test('should create organization successfully', async ({ page }) => {
    await page.goto('/onboarding/create-organization')
    
    // Fill form
    await page.getByLabel(/organization name/i).fill('Test Organization')
    await page.getByLabel(/objective/i).fill('Testing purposes')
    
    // Submit
    await page.getByRole('button', { name: /create organization/i }).click()
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/)
    
    // Verify organization appears
    await expect(page.getByText('Test Organization')).toBeVisible()
  })

  test('should show organization dashboard with sidebar navigation', async ({ page }) => {
    // Navigate to an organization (assumes test org exists)
    await page.goto('/acme-corp')
    
    // Check sidebar elements
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /projects/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /tasks/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /agents/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /members/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible()
    
    // Check organization switcher
    await expect(page.getByRole('button', { name: /test organization|acme corp/i })).toBeVisible()
  })

  test('should switch between organizations', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Click on organization card
    await page.getByText('Acme Corporation').click()
    
    // Should navigate to org page
    await expect(page).toHaveURL('/acme-corp')
    
    // Verify org name in header
    await expect(page.getByRole('heading', { name: 'Acme Corporation' })).toBeVisible()
  })

  test('should navigate through sidebar menu items', async ({ page }) => {
    await page.goto('/acme-corp')
    
    // Navigate to Tasks
    await page.getByRole('link', { name: /tasks/i }).click()
    await expect(page).toHaveURL('/acme-corp/tasks')
    await expect(page.getByRole('heading', { name: /tasks/i })).toBeVisible()
    
    // Navigate to Agents
    await page.getByRole('link', { name: /agents/i }).click()
    await expect(page).toHaveURL('/acme-corp/agents')
    await expect(page.getByRole('heading', { name: /agents/i })).toBeVisible()
    
    // Navigate back to Dashboard
    await page.getByRole('link', { name: /dashboard/i }).click()
    await expect(page).toHaveURL('/acme-corp')
  })
})