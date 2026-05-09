import { test, expect } from '@playwright/test'

test.describe('Organization Management', () => {
  test('should show organization dashboard with sidebar navigation', async ({ page }) => {
    await page.goto('/acme-corp')
    
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /projects/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /agents/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /members/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible()
  })

  test('should navigate through sidebar menu items', async ({ page }) => {
    await page.goto('/acme-corp')
    
    await page.getByRole('link', { name: /projects/i }).click()
    await expect(page).toHaveURL('/acme-corp/projects')
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible()
    
    await page.getByRole('link', { name: /agents/i }).click()
    await expect(page).toHaveURL('/acme-corp/agents')
    await expect(page.getByRole('heading', { name: 'AI Agents' })).toBeVisible()
    
    await page.getByRole('link', { name: /members/i }).click()
    await expect(page).toHaveURL('/acme-corp/members')
    
    await page.getByRole('link', { name: /dashboard/i }).first().click()
    await expect(page).toHaveURL('/acme-corp')
  })

  test('should display kanban board on dashboard', async ({ page }) => {
    await page.goto('/acme-corp')
    
    await expect(page.getByRole('heading', { name: /kanban board/i })).toBeVisible()
  })

  test('should show organization name in header', async ({ page }) => {
    await page.goto('/acme-corp')
    
    await expect(page.getByText(/acme/i)).toBeVisible()
  })
})
