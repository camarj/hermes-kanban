# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kanban.spec.ts >> Kanban Board >> should edit task priority
- Location: tests/e2e/kanban.spec.ts:74:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-testid="task-card"]').first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "Hermes Kanban" [level=1] [ref=e5]
      - paragraph [ref=e6]: Sign in to your account
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]: Sign In
        - generic [ref=e10]: Enter your credentials to access your account
      - generic [ref=e11]:
        - button "Continue with Google" [ref=e12]:
          - img
          - text: Continue with Google
        - generic [ref=e17]: Or continue with
        - generic [ref=e18]:
          - generic [ref=e19]:
            - generic [ref=e20]: Email
            - textbox "Email" [ref=e21]:
              - /placeholder: name@company.com
          - generic [ref=e22]:
            - generic [ref=e23]: Password
            - textbox "Password" [ref=e24]
          - button "Sign In" [ref=e25]
      - paragraph [ref=e27]:
        - text: Don't have an account?
        - link "Sign up" [ref=e28] [cursor=pointer]:
          - /url: /register
  - button "Open Next.js Dev Tools" [ref=e34] [cursor=pointer]:
    - img [ref=e35]
  - alert [ref=e38]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('Kanban Board', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Navigate to tasks page (assumes authenticated and has access)
  6  |     await page.goto('/acme-corp/tasks')
  7  |   })
  8  | 
  9  |   test('should display kanban board with 6 columns', async ({ page }) => {
  10 |     // Check all columns are visible
  11 |     await expect(page.getByRole('heading', { name: 'Triage' })).toBeVisible()
  12 |     await expect(page.getByRole('heading', { name: 'To Do' })).toBeVisible()
  13 |     await expect(page.getByRole('heading', { name: 'Ready' })).toBeVisible()
  14 |     await expect(page.getByRole('heading', { name: 'Running' })).toBeVisible()
  15 |     await expect(page.getByRole('heading', { name: 'Blocked' })).toBeVisible()
  16 |     await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible()
  17 |   })
  18 | 
  19 |   test('should display tasks in columns', async ({ page }) => {
  20 |     // At least one column should have tasks (from seed data)
  21 |     const taskCards = page.locator('[data-testid="task-card"]')
  22 |     await expect(taskCards.first()).toBeVisible()
  23 |   })
  24 | 
  25 |   test('should open task detail on click', async ({ page }) => {
  26 |     // Click on first task card
  27 |     const firstTask = page.locator('[data-testid="task-card"]').first()
  28 |     await firstTask.click()
  29 |     
  30 |     // Check modal opens
  31 |     await expect(page.getByRole('dialog')).toBeVisible()
  32 |     await expect(page.getByRole('heading', { name: /edit task/i })).toBeVisible()
  33 |   })
  34 | 
  35 |   test('should create new task', async ({ page }) => {
  36 |     // Click new task button
  37 |     await page.getByRole('button', { name: /new task/i }).click()
  38 |     
  39 |     // Fill form
  40 |     await page.getByLabel(/title/i).fill('E2E Test Task')
  41 |     await page.getByLabel(/description/i).fill('Created by E2E test')
  42 |     
  43 |     // Submit
  44 |     await page.getByRole('button', { name: /create task/i }).click()
  45 |     
  46 |     // Verify task appears
  47 |     await expect(page.getByText('E2E Test Task')).toBeVisible()
  48 |   })
  49 | 
  50 |   test('should filter tasks by search', async ({ page }) => {
  51 |     // Type in search box
  52 |     await page.getByPlaceholder(/search tasks/i).fill('triage')
  53 |     
  54 |     // Wait for filter to apply
  55 |     await page.waitForTimeout(300)
  56 |     
  57 |     // Should show filtered results
  58 |     const visibleTasks = page.locator('[data-testid="task-card"]:visible')
  59 |     await expect(visibleTasks).toHaveCount.greaterThanOrEqual(0)
  60 |   })
  61 | 
  62 |   test('should filter tasks by status', async ({ page }) => {
  63 |     // Open filters
  64 |     await page.getByRole('button', { name: /filters/i }).click()
  65 |     
  66 |     // Select status filter
  67 |     await page.getByLabel(/status/i).click()
  68 |     await page.getByRole('option', { name: 'Done' }).click()
  69 |     
  70 |     // Should only show done tasks
  71 |     await expect(page.getByText(/showing.*of/i)).toBeVisible()
  72 |   })
  73 | 
  74 |   test('should edit task priority', async ({ page }) => {
  75 |     // Open first task
> 76 |     await page.locator('[data-testid="task-card"]').first().click()
     |                                                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
  77 |     
  78 |     // Change priority
  79 |     await page.getByLabel(/priority/i).click()
  80 |     await page.getByRole('option', { name: /high/i }).click()
  81 |     
  82 |     // Save
  83 |     await page.getByRole('button', { name: /save/i }).click()
  84 |     
  85 |     // Verify modal closes
  86 |     await expect(page.getByRole('dialog')).not.toBeVisible()
  87 |   })
  88 | 
  89 |   test('should show live updates indicator', async ({ page }) => {
  90 |     // Check if live indicator is visible (if Supabase configured)
  91 |     const liveIndicator = page.getByText(/live updates/i)
  92 |     
  93 |     // This may or may not be visible depending on Supabase config
  94 |     // Just verify the page loads without errors
  95 |     await expect(page.getByRole('heading', { name: /tasks/i })).toBeVisible()
  96 |   })
  97 | })
```