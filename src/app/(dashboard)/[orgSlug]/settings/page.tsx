import { requireAuth } from "@/lib/auth/session"
import { getOrganizationBySlug } from "@/lib/organization/helpers"
import { redirect } from "next/navigation"
import { OrganizationSettingsForm } from "@/components/settings/organization-settings-form"
import { prisma } from "@/lib/db/prisma"

export default async function SettingsPage({
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

  // Fetch full organization data with counts
  const orgWithData = await prisma.organization.findUnique({
    where: { id: organization.id },
    include: {
      _count: {
        select: {
          members: true,
          projects: true,
          tasks: true,
          agents: true
        }
      }
    }
  })

  if (!orgWithData) {
    redirect("/dashboard")
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-[#070605]">
          Settings
        </h1>
        <p className="text-[#6B6560]">
          Manage your organization settings and preferences
        </p>
      </div>

      <OrganizationSettingsForm 
        organization={{
          ...orgWithData,
          createdAt: orgWithData.createdAt.toISOString()
        }}
      />
    </div>
  )
}