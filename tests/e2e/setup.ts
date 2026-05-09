import { test as setup } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

setup('seed test data', async () => {
  const testOrg = await prisma.organization.upsert({
    where: { slug: 'inteliside' },
    update: {},
    create: {
      id: 'test-org-inteliside',
      name: 'Inteliside',
      slug: 'inteliside',
      objective: 'Test organization for E2E tests',
    },
  })

  const testProject = await prisma.project.upsert({
    where: { id: 'test-project-main' },
    update: {},
    create: {
      id: 'test-project-main',
      orgId: testOrg.id,
      name: 'Main Project',
      description: 'Default test project',
      status: 'active',
    },
  })

  await prisma.task.upsert({
    where: { id: 'test-task-1' },
    update: {},
    create: {
      id: 'test-task-1',
      orgId: testOrg.id,
      projectId: testProject.id,
      title: 'Test Task in Triage',
      body: 'This is a test task for E2E testing',
      status: 'triage',
      priority: 0,
    },
  })

  await prisma.task.upsert({
    where: { id: 'test-task-2' },
    update: {},
    create: {
      id: 'test-task-2',
      orgId: testOrg.id,
      projectId: testProject.id,
      title: 'Test Task in To Do',
      body: 'Another test task',
      status: 'todo',
      priority: 1,
    },
  })

  await prisma.agent.upsert({
    where: { hermesProfile: 'inteliside-ceo' },
    update: {},
    create: {
      id: 'test-agent-ceo',
      orgId: testOrg.id,
      name: 'CEO Agent',
      description: 'Test CEO agent',
      hermesProfile: 'inteliside-ceo',
      isActive: true,
      skills: ['strategy', 'orchestration'],
      tools: [],
      toolsets: [],
      mcpServers: [],
      webhooks: [],
      apiIntegrations: [],
    },
  })

  await prisma.agent.upsert({
    where: { hermesProfile: 'inteliside-backend-dev' },
    update: {},
    create: {
      id: 'test-agent-worker',
      orgId: testOrg.id,
      name: 'Backend Developer',
      description: 'Test worker agent',
      hermesProfile: 'inteliside-backend-dev',
      isActive: true,
      skills: ['backend', 'python', 'apis'],
      tools: ['terminal', 'file'],
      toolsets: [],
      mcpServers: [],
      webhooks: [],
      apiIntegrations: [],
    },
  })
})
