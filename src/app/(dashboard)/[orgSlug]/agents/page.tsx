import { requireAuth } from "@/lib/auth/session"
import { getOrganizationBySlug } from "@/lib/organization/helpers"
import { redirect } from "next/navigation"
import { AgentsPageClient } from "@/components/agents/agents-page-client"

export default async function AgentsPage({
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

  return (
    <div className="p-8">
      <AgentsPageClient 
        orgId={organization.id}
        orgSlug={organization.slug}
        orgName={organization.name}
        orgObjective={organization.objective}
      />
    </div>
  )
}
