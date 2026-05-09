import { requireAuth } from "@/lib/auth/session"
import { getOrganizationBySlug } from "@/lib/organization/helpers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db/prisma"
import { OrgPageClient } from "@/components/organization/org-page-client"
import type { Agent } from "@/lib/agents/types"

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const session = await requireAuth()
  const { orgSlug } = await params

  const organization = await getOrganizationBySlug(orgSlug, session.user.id)

  if (!organization) {
    redirect("/dashboard")
  }

  const agentsRaw = await prisma.agent.findMany({
    where: { orgId: organization.id, isActive: true },
    orderBy: { createdAt: "desc" },
  })

  const agents: Agent[] = agentsRaw.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    hermesProfile: a.hermesProfile,
    soulContent: a.soulContent,
    skills: a.skills,
    tools: a.tools,
    toolsets: a.toolsets,
    mcpServers: a.mcpServers as unknown[],
    webhooks: a.webhooks as unknown[],
    apiIntegrations: a.apiIntegrations as unknown[],
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
    templateId: a.templateId,
    template: null,
  }))

  return <OrgPageClient orgId={organization.id} agents={agents} />
}
