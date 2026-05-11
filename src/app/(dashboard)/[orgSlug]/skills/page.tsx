import { requireAuth } from "@/lib/auth/session"
import { getOrganizationBySlug } from "@/lib/organization/helpers"
import { redirect } from "next/navigation"
import { SkillsPageClient } from "@/components/skills/skills-page-client"

export default async function SkillsPage({
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
      <SkillsPageClient orgId={organization.id} />
    </div>
  )
}
