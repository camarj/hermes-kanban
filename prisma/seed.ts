import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting database seed...")

  // Clean existing data (optional - be careful in production!)
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

  // Create test user (you'll need to register this user via the UI first)
  // For now, we'll create placeholder data

  // Create Organizations
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

  console.log(`✅ Created ${2} organizations`)

  // Create Projects
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

  const project3 = await prisma.project.create({
    data: {
      orgId: org2.id,
      name: "Portfolio Management",
      description: "Track startup portfolio performance",
      status: "active",
    },
  })

  console.log(`✅ Created ${3} projects`)

  // Create Agent Templates
  const ceoTemplate = await prisma.agentTemplate.create({
    data: {
      orgId: org1.id,
      name: "CEO Agent",
      displayName: "Chief Executive Officer",
      description: "Strategic leader with decision-making capabilities",
      roleType: "ceo",
      soulContent: "You are a strategic CEO focused on growth and execution. Make decisions based on data and long-term vision.",
      defaultSkills: ["strategy", "leadership", "decision-making"],
      defaultTools: ["analytics", "reporting", "planning"],
      defaultToolsets: ["management"],
      isPublic: true,
    },
  })

  const workerTemplate = await prisma.agentTemplate.create({
    data: {
      orgId: org1.id,
      name: "Developer Agent",
      displayName: "Software Developer",
      description: "Full-stack developer agent for code tasks",
      roleType: "worker",
      soulContent: "You are an expert software developer. Write clean, efficient code following best practices.",
      defaultSkills: ["coding", "debugging", "testing", "architecture"],
      defaultTools: ["git", "github", "vscode", "docker"],
      defaultToolsets: ["development"],
      isPublic: true,
    },
  })

  console.log(`✅ Created ${2} agent templates`)

  // Create Agents
  const ceoAgent = await prisma.agent.create({
    data: {
      orgId: org1.id,
      templateId: ceoTemplate.id,
      hermesProfile: "acme-ceo",
      name: "Sarah (CEO)",
      description: "Strategic decision maker",
      soulContent: ceoTemplate.soulContent,
      skills: ceoTemplate.defaultSkills,
      tools: ceoTemplate.defaultTools,
      toolsets: ceoTemplate.defaultToolsets,
      isActive: true,
    },
  })

  const devAgent1 = await prisma.agent.create({
    data: {
      orgId: org1.id,
      templateId: workerTemplate.id,
      hermesProfile: "acme-dev-1",
      name: "DevBot Alpha",
      description: "Frontend specialist",
      soulContent: workerTemplate.soulContent,
      skills: [...workerTemplate.defaultSkills, "react", "typescript"],
      tools: [...workerTemplate.defaultTools, "tailwind", "nextjs"],
      toolsets: workerTemplate.defaultToolsets,
      isActive: true,
    },
  })

  const devAgent2 = await prisma.agent.create({
    data: {
      orgId: org1.id,
      templateId: workerTemplate.id,
      hermesProfile: "acme-dev-2",
      name: "DevBot Beta",
      description: "Backend specialist",
      soulContent: workerTemplate.soulContent,
      skills: [...workerTemplate.defaultSkills, "nodejs", "postgresql"],
      tools: [...workerTemplate.defaultTools, "prisma", "supabase"],
      toolsets: workerTemplate.defaultToolsets,
      isActive: true,
    },
  })

  const inactiveAgent = await prisma.agent.create({
    data: {
      orgId: org1.id,
      hermesProfile: "acme-intern",
      name: "Intern Bot",
      description: "Learning assistant",
      soulContent: "Learning mode - observe and assist",
      skills: ["observing", "documenting"],
      tools: [],
      toolsets: [],
      isActive: false,
    },
  })

  console.log(`✅ Created ${4} agents`)

  // Create Tasks for Kanban Board
  const tasks = [
    // Triage column
    {
      title: "Review new feature requests",
      body: "Go through the backlog and prioritize new features for Q2",
      status: "triage",
      priority: 1,
      assignee: "acme-ceo",
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
    // To Do column
    {
      title: "Implement user dashboard",
      body: "Create analytics dashboard for users",
      status: "todo",
      priority: 1,
      assignee: "acme-dev-1",
      projectId: project1.id,
    },
    {
      title: "Update documentation",
      body: "API docs are outdated, need to refresh",
      status: "todo",
      priority: 0,
      assignee: "acme-intern",
      projectId: project2.id,
    },
    {
      title: "Security audit",
      body: "Quarterly security review",
      status: "todo",
      priority: 2,
      assignee: null,
      projectId: project1.id,
    },
    // Ready column
    {
      title: "Setup CI/CD pipeline",
      body: "Configure GitHub Actions for automated testing",
      status: "ready",
      priority: 1,
      assignee: "acme-dev-2",
      projectId: project2.id,
    },
    {
      title: "Database migration script",
      body: "Prepare migration for v2 schema",
      status: "ready",
      priority: 0,
      assignee: "acme-dev-2",
      projectId: project1.id,
    },
    // Running column
    {
      title: "Redesign landing page",
      body: "New marketing site with improved conversion",
      status: "running",
      priority: 1,
      assignee: "acme-dev-1",
      projectId: project1.id,
    },
    {
      title: "Integrate payment gateway",
      body: "Add Stripe integration for subscriptions",
      status: "running",
      priority: 2,
      assignee: "acme-dev-2",
      projectId: project1.id,
    },
    // Blocked column
    {
      title: "Launch marketing campaign",
      body: "Waiting for legal approval on copy",
      status: "blocked",
      priority: 1,
      assignee: "acme-ceo",
      projectId: project1.id,
    },
    // Done column
    {
      title: "User authentication system",
      body: "Implement login/signup with BetterAuth",
      status: "done",
      priority: 2,
      assignee: "acme-dev-1",
      projectId: project1.id,
    },
    {
      title: "Database schema design",
      body: "Initial Prisma schema with all models",
      status: "done",
      priority: 2,
      assignee: "acme-dev-2",
      projectId: project1.id,
    },
    {
      title: "Setup development environment",
      body: "Docker compose and local dev setup",
      status: "done",
      priority: 0,
      assignee: "acme-dev-2",
      projectId: project2.id,
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
  console.log(`  - 2 Agent Templates`)
  console.log(`  - 4 Agents (3 active, 1 inactive)`)
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