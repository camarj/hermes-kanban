# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: agents.spec.ts >> Agent Management >> should toggle agent status
- Location: tests/e2e/agents.spec.ts:67:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.isChecked: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-testid="agent-card"]').first().locator('input[type="checkbox"], [role="switch"]')

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
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | test.describe('Agent Management', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto('/acme-corp/agents')
  6   |   })
  7   | 
  8   |   test('should display agent list with stats', async ({ page }) => {
  9   |     // Check heading
  10  |     await expect(page.getByRole('heading', { name: /ai agents/i })).toBeVisible()
  11  |     
  12  |     // Check stats cards
  13  |     await expect(page.getByText(/total agents/i)).toBeVisible()
  14  |     await expect(page.getByText(/active/i)).toBeVisible()
  15  |     await expect(page.getByText(/inactive/i)).toBeVisible()
  16  |     
  17  |     // Stats should show numbers
  18  |     const statsSection = page.locator('.grid', { hasText: /total agents/i })
  19  |     await expect(statsSection).toBeVisible()
  20  |   })
  21  | 
  22  |   test('should display agent cards with details', async ({ page }) => {
  23  |     // Should have agent cards (from seed data)
  24  |     const agentCards = page.locator('[data-testid="agent-card"]')
  25  |     await expect(agentCards.first()).toBeVisible()
  26  |     
  27  |     // Check for role badges
  28  |     await expect(page.getByText(/ceo|orchestrator|worker/i).first()).toBeVisible()
  29  |   })
  30  | 
  31  |   test('should create new agent', async ({ page }) => {
  32  |     // Click new agent button
  33  |     await page.getByRole('button', { name: /new agent/i }).click()
  34  |     
  35  |     // Fill form
  36  |     await page.getByLabel(/name/i).fill('E2E Test Agent')
  37  |     await page.getByLabel(/hermes profile/i).fill(`e2e-test-agent-${Date.now()}`)
  38  |     await page.getByLabel(/description/i).fill('Created by E2E test')
  39  |     await page.getByLabel(/soul content/i).fill('Test agent personality')
  40  |     
  41  |     // Add a skill
  42  |     await page.getByPlaceholder(/add a skill/i).fill('testing')
  43  |     await page.getByRole('button', { name: /add skill/i }).click()
  44  |     
  45  |     // Submit
  46  |     await page.getByRole('button', { name: /create agent/i }).click()
  47  |     
  48  |     // Verify agent appears in list
  49  |     await expect(page.getByText('E2E Test Agent')).toBeVisible()
  50  |   })
  51  | 
  52  |   test('should show error for duplicate hermes profile', async ({ page }) => {
  53  |     // Click new agent
  54  |     await page.getByRole('button', { name: /new agent/i }).click()
  55  |     
  56  |     // Fill with existing profile (from seed)
  57  |     await page.getByLabel(/name/i).fill('Duplicate Agent')
  58  |     await page.getByLabel(/hermes profile/i).fill('acme-ceo')
  59  |     
  60  |     // Submit
  61  |     await page.getByRole('button', { name: /create agent/i }).click()
  62  |     
  63  |     // Should show error
  64  |     await expect(page.getByText(/already exists|error/i)).toBeVisible()
  65  |   })
  66  | 
  67  |   test('should toggle agent status', async ({ page }) => {
  68  |     // Find first active agent
  69  |     const firstAgent = page.locator('[data-testid="agent-card"]').first()
  70  |     
  71  |     // Find toggle switch
  72  |     const toggle = firstAgent.locator('input[type="checkbox"], [role="switch"]')
  73  |     
  74  |     // Get initial state
> 75  |     const wasActive = await toggle.isChecked()
      |                                    ^ Error: locator.isChecked: Test timeout of 30000ms exceeded.
  76  |     
  77  |     // Toggle
  78  |     await toggle.click()
  79  |     
  80  |     // Wait for update
  81  |     await page.waitForTimeout(500)
  82  |     
  83  |     // Stats should update
  84  |     await expect(page.getByText(/active/i)).toBeVisible()
  85  |   })
  86  | 
  87  |   test('should show agent skills as badges', async ({ page }) => {
  88  |     // Find agent with skills
  89  |     const agentWithSkills = page.locator('[data-testid="agent-card"]').filter({
  90  |       has: page.locator('.badge, [role="badge"]')
  91  |     })
  92  |     
  93  |     // Skills should be visible
  94  |     await expect(page.getByText(/strategy|coding|debugging/i).first()).toBeVisible()
  95  |   })
  96  | 
  97  |   test('should navigate to agents from sidebar', async ({ page }) => {
  98  |     // Go to dashboard first
  99  |     await page.goto('/acme-corp')
  100 |     
  101 |     // Click agents in sidebar
  102 |     await page.getByRole('link', { name: /^agents$/i }).click()
  103 |     
  104 |     // Should be on agents page
  105 |     await expect(page).toHaveURL('/acme-corp/agents')
  106 |     await expect(page.getByRole('heading', { name: /ai agents/i })).toBeVisible()
  107 |   })
  108 | })
```