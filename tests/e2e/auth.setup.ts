import { test as auth, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

auth('authenticate', async ({ page }) => {
  await page.goto('/register')
  
  const timestamp = Date.now()
  const email = `e2e-test-${timestamp}@example.com`
  
  await page.getByLabel(/name/i).fill('E2E Test User')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill('TestPassword123!')
  
  await page.getByRole('button', { name: /create account/i }).click()
  
  await page.waitForURL('/onboarding/create-organization', { timeout: 15000 })
  
  await page.getByLabel(/organization name/i).fill('Acme Corp')
  await page.getByLabel(/objective/i).fill('E2E testing organization')
  
  await page.getByRole('button', { name: /create organization/i }).click()
  
  await page.waitForURL(/\/[a-z-]+$/, { timeout: 15000 })
  
  const user = await prisma.user.findUnique({
    where: { email },
  })
  
  const org = await prisma.organization.findUnique({
    where: { slug: 'acme-corp' },
  })
  
  if (user && org) {
    const existingMembership = await prisma.organizationMember.findUnique({
      where: {
        orgId_userId: {
          orgId: org.id,
          userId: user.id,
        },
      },
    })
    
    if (!existingMembership) {
      await prisma.organizationMember.create({
        data: {
          orgId: org.id,
          userId: user.id,
          role: 'owner',
        },
      })
    }
  }
  
  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' })
})
