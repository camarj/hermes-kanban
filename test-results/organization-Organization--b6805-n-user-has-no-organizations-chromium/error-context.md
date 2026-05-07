# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: organization.spec.ts >> Organization Management >> should redirect to onboarding when user has no organizations
- Location: tests/e2e/organization.spec.ts:11:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected: "http://localhost:3000/onboarding/create-organization"
Received: "http://localhost:3000/login"
Timeout:  5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    9 × unexpected value "http://localhost:3000/login"

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
  3  | test.describe('Organization Management', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Login first
  6  |     await page.goto('/login')
  7  |     // Note: This assumes you have test credentials set up
  8  |     // In a real scenario, you'd create a test user or use API to login
  9  |   })
  10 | 
  11 |   test('should redirect to onboarding when user has no organizations', async ({ page }) => {
  12 |     // This test assumes a fresh user without organizations
  13 |     await page.goto('/dashboard')
  14 |     
  15 |     // Should redirect to onboarding
> 16 |     await expect(page).toHaveURL('/onboarding/create-organization')
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  17 |     
  18 |     // Check form elements
  19 |     await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
  20 |     await expect(page.getByLabel(/organization name/i)).toBeVisible()
  21 |     await expect(page.getByRole('button', { name: /create organization/i })).toBeVisible()
  22 |   })
  23 | 
  24 |   test('should create organization successfully', async ({ page }) => {
  25 |     await page.goto('/onboarding/create-organization')
  26 |     
  27 |     // Fill form
  28 |     await page.getByLabel(/organization name/i).fill('Test Organization')
  29 |     await page.getByLabel(/objective/i).fill('Testing purposes')
  30 |     
  31 |     // Submit
  32 |     await page.getByRole('button', { name: /create organization/i }).click()
  33 |     
  34 |     // Should redirect to dashboard
  35 |     await expect(page).toHaveURL(/\/dashboard/)
  36 |     
  37 |     // Verify organization appears
  38 |     await expect(page.getByText('Test Organization')).toBeVisible()
  39 |   })
  40 | 
  41 |   test('should show organization dashboard with sidebar navigation', async ({ page }) => {
  42 |     // Navigate to an organization (assumes test org exists)
  43 |     await page.goto('/acme-corp')
  44 |     
  45 |     // Check sidebar elements
  46 |     await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
  47 |     await expect(page.getByRole('link', { name: /projects/i })).toBeVisible()
  48 |     await expect(page.getByRole('link', { name: /tasks/i })).toBeVisible()
  49 |     await expect(page.getByRole('link', { name: /agents/i })).toBeVisible()
  50 |     await expect(page.getByRole('link', { name: /members/i })).toBeVisible()
  51 |     await expect(page.getByRole('link', { name: /settings/i })).toBeVisible()
  52 |     
  53 |     // Check organization switcher
  54 |     await expect(page.getByRole('button', { name: /test organization|acme corp/i })).toBeVisible()
  55 |   })
  56 | 
  57 |   test('should switch between organizations', async ({ page }) => {
  58 |     await page.goto('/dashboard')
  59 |     
  60 |     // Click on organization card
  61 |     await page.getByText('Acme Corporation').click()
  62 |     
  63 |     // Should navigate to org page
  64 |     await expect(page).toHaveURL('/acme-corp')
  65 |     
  66 |     // Verify org name in header
  67 |     await expect(page.getByRole('heading', { name: 'Acme Corporation' })).toBeVisible()
  68 |   })
  69 | 
  70 |   test('should navigate through sidebar menu items', async ({ page }) => {
  71 |     await page.goto('/acme-corp')
  72 |     
  73 |     // Navigate to Tasks
  74 |     await page.getByRole('link', { name: /tasks/i }).click()
  75 |     await expect(page).toHaveURL('/acme-corp/tasks')
  76 |     await expect(page.getByRole('heading', { name: /tasks/i })).toBeVisible()
  77 |     
  78 |     // Navigate to Agents
  79 |     await page.getByRole('link', { name: /agents/i }).click()
  80 |     await expect(page).toHaveURL('/acme-corp/agents')
  81 |     await expect(page.getByRole('heading', { name: /agents/i })).toBeVisible()
  82 |     
  83 |     // Navigate back to Dashboard
  84 |     await page.getByRole('link', { name: /dashboard/i }).click()
  85 |     await expect(page).toHaveURL('/acme-corp')
  86 |   })
  87 | })
```