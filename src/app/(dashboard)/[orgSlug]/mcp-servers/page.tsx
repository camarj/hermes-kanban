import { requireAuth } from "@/lib/auth/session"
import { getOrganizationBySlug } from "@/lib/organization/helpers"
import { redirect } from "next/navigation"
import { McpServersPageClient } from "@/components/mcp/mcp-servers-page-client"

export default async function McpServersPage({
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
      <McpServersPageClient orgId={organization.id} />
    </div>
  )
}
