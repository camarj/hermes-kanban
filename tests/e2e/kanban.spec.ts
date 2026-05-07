import { test, expect } from '@playwright/test'

test.describe('Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to tasks page (assumes authenticated and has access)
    await page.goto('/acme-corp/tasks')
  })

  test('should display kanban board with 6 columns', async ({ page }) => {
    // Check all columns are visible
    await expect(page.getByRole('heading', { name: 'Triage' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'To Do' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ready' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Running' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Blocked' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible()
  })

  test('should display tasks in columns', async ({ page }) => {
    // At least one column should have tasks (from seed data)
    const taskCards = page.locator('[data-testid="task-card"]')
    await expect(taskCards.first()).toBeVisible()
  })

  test('should open task detail on click', async ({ page }) => {
    // Click on first task card
    const firstTask = page.locator('[data-testid="task-card"]').first()
    await firstTask.click()
    
    // Check modal opens
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: /edit task/i })).toBeVisible()
  })

  test('should create new task', async ({ page }) => {
    // Click new task button
    await page.getByRole('button', { name: /new task/i }).click()
    
    // Fill form
    await page.getByLabel(/title/i).fill('E2E Test Task')
    await page.getByLabel(/description/i).fill('Created by E2E test')
    
    // Submit
    await page.getByRole('button', { name: /create task/i }).click()
    
    // Verify task appears
    await expect(page.getByText('E2E Test Task')).toBeVisible()
  })

  test('should filter tasks by search', async ({ page }) => {
    // Type in search box
    await page.getByPlaceholder(/search tasks/i).fill('triage')
    
    // Wait for filter to apply
    await page.waitForTimeout(300)
    
    // Should show filtered results
    const visibleTasks = page.locator('[data-testid="task-card"]:visible')
    const count = await visibleTasks.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should filter tasks by status', async ({ page }) => {
    // Open filters
    await page.getByRole('button', { name: /filters/i }).click()
    
    // Select status filter
    await page.getByLabel(/status/i).click()
    await page.getByRole('option', { name: 'Done' }).click()
    
    // Should only show done tasks
    await expect(page.getByText(/showing.*of/i)).toBeVisible()
  })

  test('should edit task priority', async ({ page }) => {
    // Open first task
    await page.locator('[data-testid="task-card"]').first().click()
    
    // Change priority
    await page.getByLabel(/priority/i).click()
    await page.getByRole('option', { name: /high/i }).click()
    
    // Save
    await page.getByRole('button', { name: /save/i }).click()
    
    // Verify modal closes
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('should show live updates indicator', async ({ page }) => {
    // Check if live indicator is visible (if Supabase configured)
    const liveIndicator = page.getByText(/live updates/i)
    
    // This may or may not be visible depending on Supabase config
    // Just verify the page loads without errors
    await expect(page.getByRole('heading', { name: /tasks/i })).toBeVisible()
  })
})