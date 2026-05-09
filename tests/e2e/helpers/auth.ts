import { Page } from '@playwright/test'

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  
  await page.waitForURL(/\/dashboard|\/inteliside/, { timeout: 10000 })
}

export async function createTestUser(page: Page) {
  await page.goto('/register')
  
  const timestamp = Date.now()
  const email = `test-${timestamp}@example.com`
  
  await page.getByLabel(/name/i).fill('Test User')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill('Test123456!')
  
  await page.getByRole('button', { name: /create account/i }).click()
  
  await page.waitForURL(/\/onboarding|\/dashboard/, { timeout: 10000 })
  
  return { email, password: 'Test123456!' }
}

export async function createTestOrganization(page: Page, name: string) {
  await page.goto('/onboarding/create-organization')
  
  await page.getByLabel(/organization name/i).fill(name)
  await page.getByLabel(/objective/i).fill('E2E testing organization')
  
  await page.getByRole('button', { name: /create organization/i }).click()
  
  await page.waitForURL(/\/[a-z-]+$/, { timeout: 10000 })
}
