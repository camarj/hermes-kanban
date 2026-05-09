import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting database seed...")

  console.log("Cleaning existing data...")
  await prisma.taskComment.deleteMany()
  await prisma.taskLink.deleteMany()
  await prisma.task.deleteMany()
  await prisma.agent.deleteMany()
  await prisma.agentTemplate.deleteMany()
  await prisma.mcpServer.deleteMany()
  await prisma.project.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.organization.deleteMany()

  console.log("Creating test data...")

  const org1 = await prisma.organization.create({
    data: {
      name: "Acme Corporation",
      slug: "acme-corp",
      objective: "Building the future of automation",
    },
  })

  const org2 = await prisma.organization.create({
    data: {
      name: "TechStart Inc",
      slug: "techstart",
      objective: "Startup accelerator and incubator",
    },
  })

  console.log(`✅ Created 2 organizations`)

  const project1 = await prisma.project.create({
    data: {
      orgId: org1.id,
      name: "Q1 Product Launch",
      description: "Main product launch for Q1 2025",
      status: "active",
    },
  })

  const project2 = await prisma.project.create({
    data: {
      orgId: org1.id,
      name: "Internal Tools",
      description: "Developer productivity tools",
      status: "active",
    },
  })

  await prisma.project.create({
    data: {
      orgId: org2.id,
      name: "Portfolio Management",
      description: "Track startup portfolio performance",
      status: "active",
    },
  })

  console.log(`✅ Created 3 projects`)

  // ─── CEO Template ────────────────────────────────────────────────
  const ceoTemplate = await prisma.agentTemplate.create({
    data: {
      orgId: org1.id,
      name: "CEO Agent",
      displayName: "Chief Executive Officer",
      description: "Strategic leader — bridges partners and C-suite, delegates objectives, reports progress",
      roleType: "ceo",
      soulContent: null,
      defaultSkills: ["strategy", "leadership", "decision-making"],
      defaultTools: ["analytics", "reporting", "planning"],
      defaultToolsets: ["management"],
      isPublic: true,
    },
  })

  // ─── C-Level Templates ───────────────────────────────────────────
  const ctoTemplate = await prisma.agentTemplate.create({
    data: {
      orgId: org1.id,
      name: "CTO Agent",
      displayName: "Chief Technology Officer",
      description: "Orchestrates the technology department — strategy, architecture, engineering team",
      roleType: "c-level",
      soulContent: null,
      defaultSkills: ["kanban-orchestrator", "technology-strategy"],
      defaultTools: ["analytics", "reporting"],
      defaultToolsets: ["management"],
      isPublic: true,
    },
  })

  const cfoTemplate = await prisma.agentTemplate.create({
    data: {
      orgId: org1.id,
      name: "CFO Agent",
      displayName: "Chief Financial Officer",
      description: "Orchestrates the finance department — budget, financial analysis, data insights",
      roleType: "c-level",
      soulContent: null,
      defaultSkills: ["kanban-orchestrator", "financial-strategy"],
      defaultTools: ["analytics", "reporting"],
      defaultToolsets: ["management"],
      isPublic: true,
    },
  })

  const cmoTemplate = await prisma.agentTemplate.create({
    data: {
      orgId: org1.id,
      name: "CMO Agent",
      displayName: "Chief Marketing Officer",
      description: "Orchestrates the marketing department — content, growth, brand strategy",
      roleType: "c-level",
      soulContent: null,
      defaultSkills: ["kanban-orchestrator", "marketing-strategy"],
      defaultTools: ["analytics", "reporting"],
      defaultToolsets: ["management"],
      isPublic: true,
    },
  })

  const cooTemplate = await prisma.agentTemplate.create({
    data: {
      orgId: org1.id,
      name: "COO Agent",
      displayName: "Chief Operating Officer",
      description: "Orchestrates operations — processes, project management, execution oversight",
      roleType: "c-level",
      soulContent: null,
      defaultSkills: ["kanban-orchestrator", "operations-strategy"],
      defaultTools: ["analytics", "reporting"],
      defaultToolsets: ["management"],
      isPublic: true,
    },
  })

  // ─── Worker Templates ────────────────────────────────────────────
  const backendTemplate = await prisma.agentTemplate.create({
    data: {
      orgId: org1.id,
      name: "Backend Engineer",
      displayName: "Backend Engineer",
      description: "Implements APIs, services, and business logic",
      roleType: "worker",
      soulContent: null,
      defaultSkills: ["kanban-worker", "backend-development"],
      defaultTools: ["git", "github"],
      defaultToolsets: ["development"],
      isPublic: true,
    },
  })

  const frontendTemplate = await prisma.agentTemplate.create({
    data: {
      orgId: org1.id,
      name: "Frontend Engineer",
      displayName: "Frontend Engineer",
      description: "Implements user interfaces and client-side applications",
      roleType: "worker",
      soulContent: null,
      defaultSkills: ["kanban-worker", "frontend-development", "react-patterns"],
      defaultTools: ["git", "github"],
      defaultToolsets: ["development"],
      isPublic: true,
    },
  })

  console.log(`✅ Created 8 agent templates`)

  // ─── Agents ──────────────────────────────────────────────────────
  const ceoAgent = await prisma.agent.create({
    data: {
      orgId: org1.id,
      templateId: ceoTemplate.id,
      hermesProfile: "ceo-acme-corp",
      name: "CEO Agent",
      description: "Chief Executive Agent for Acme Corporation",
      soulContent: null,
      skills: ["strategy", "leadership", "decision-making"],
      tools: ["analytics", "reporting", "planning"],
      toolsets: ["management"],
      isActive: true,
    },
  })

  const ctoAgent = await prisma.agent.create({
    data: {
      orgId: org1.id,
      templateId: ctoTemplate.id,
      hermesProfile: "clevel-acme-corp-cto-agent",
      name: "CTO Agent",
      description: "Chief Technology Officer for Acme Corporation",
      soulContent: null,
      skills: ["kanban-orchestrator", "technology-strategy"],
      tools: ["analytics", "reporting"],
      toolsets: ["management"],
      isActive: true,
    },
  })

  const cmoAgent = await prisma.agent.create({
    data: {
      orgId: org1.id,
      templateId: cmoTemplate.id,
      hermesProfile: "clevel-acme-corp-cmo-agent",
      name: "CMO Agent",
      description: "Chief Marketing Officer for Acme Corporation",
      soulContent: null,
      skills: ["kanban-orchestrator", "marketing-strategy"],
      tools: ["analytics", "reporting"],
      toolsets: ["management"],
      isActive: true,
    },
  })

  const devAgent1 = await prisma.agent.create({
    data: {
      orgId: org1.id,
      templateId: backendTemplate.id,
      hermesProfile: "worker-acme-corp-alpha",
      name: "Alpha Dev",
      description: "Backend specialist",
      soulContent: null,
      skills: ["kanban-worker", "backend-development", "nodejs", "postgresql"],
      tools: ["git", "github", "prisma", "supabase"],
      toolsets: ["development"],
      isActive: true,
    },
  })

  const devAgent2 = await prisma.agent.create({
    data: {
      orgId: org1.id,
      templateId: frontendTemplate.id,
      hermesProfile: "worker-acme-corp-beta",
      name: "Beta Dev",
      description: "Frontend specialist",
      soulContent: null,
      skills: ["kanban-worker", "frontend-development", "react", "typescript"],
      tools: ["git", "github", "tailwind", "nextjs"],
      toolsets: ["development"],
      isActive: true,
    },
  })

  console.log(`✅ Created 5 agents`)

  // ─── Tasks ───────────────────────────────────────────────────────
  const tasks = [
    {
      title: "Define Q2 product roadmap",
      body: "Create the product roadmap for Q2 based on user feedback and strategic goals",
      status: "triage",
      priority: 1,
      assignee: "ceo-acme-corp",
      projectId: project1.id,
    },
    {
      title: "Bug: Login page not responsive",
      body: "Users report issues on mobile devices",
      status: "triage",
      priority: 2,
      assignee: null,
      projectId: project2.id,
    },
    {
      title: "Implement user dashboard",
      body: "Create analytics dashboard for users",
      status: "todo",
      priority: 1,
      assignee: "clevel-acme-corp-cto-agent",
      projectId: project1.id,
    },
    {
      title: "Update API documentation",
      body: "API docs are outdated, need to refresh endpoints and examples",
      status: "todo",
      priority: 0,
      assignee: "worker-acme-corp-alpha",
      projectId: project2.id,
    },
    {
      title: "Security audit",
      body: "Quarterly security review of authentication and authorization",
      status: "todo",
      priority: 2,
      assignee: null,
      projectId: project1.id,
    },
    {
      title: "Setup CI/CD pipeline",
      body: "Configure GitHub Actions for automated testing and deployment",
      status: "ready",
      priority: 1,
      assignee: "worker-acme-corp-alpha",
      projectId: project2.id,
    },
    {
      title: "Database migration to v2",
      body: "Prepare migration script for v2 schema changes",
      status: "ready",
      priority: 0,
      assignee: "worker-acme-corp-alpha",
      projectId: project1.id,
    },
    {
      title: "Redesign landing page",
      body: "New marketing site with improved conversion funnel",
      status: "running",
      priority: 1,
      assignee: "clevel-acme-corp-cmo-agent",
      projectId: project1.id,
    },
    {
      title: "Integrate payment gateway",
      body: "Add Stripe integration for subscriptions",
      status: "running",
      priority: 2,
      assignee: "worker-acme-corp-alpha",
      projectId: project1.id,
    },
    {
      title: "Launch marketing campaign",
      body: "Waiting for legal approval on copy",
      status: "blocked",
      priority: 1,
      assignee: "ceo-acme-corp",
      projectId: project1.id,
    },
    {
      title: "User authentication system",
      body: "Implement login/signup with BetterAuth",
      status: "done",
      priority: 2,
      assignee: "worker-acme-corp-alpha",
      projectId: project1.id,
    },
    {
      title: "Database schema design",
      body: "Initial Prisma schema with all models",
      status: "done",
      priority: 2,
      assignee: "worker-acme-corp-alpha",
      projectId: project1.id,
    },
  ]

  for (const taskData of tasks) {
    await prisma.task.create({
      data: {
        ...taskData,
        orgId: org1.id,
        projectId: taskData.projectId,
        workspaceType: "scratch",
      },
    })
  }

  console.log(`✅ Created ${tasks.length} tasks`)

  console.log("\n✨ Seed completed successfully!")
  console.log("\nTest Organizations:")
  console.log(`  - Acme Corporation (acme-corp)`)
  console.log(`  - TechStart Inc (techstart)`)
  console.log("\nTest Data Summary:")
  console.log(`  - 2 Organizations`)
  console.log(`  - 3 Projects`)
  console.log(`  - 8 Agent Templates (CEO + 4 C-Level + 3 Worker)`)
  console.log(`  - 5 Agents (CEO + CTO + CMO + 2 Workers)`)
  console.log(`  - ${tasks.length} Tasks across all columns`)
  console.log("\n⚠️  Note: You need to create a user account via the UI to access these organizations")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })