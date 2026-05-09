import { redirect } from "next/navigation"
import { getUserOrganizations, getOrganizationBySlug } from "@/lib/organization/helpers"
import { CollapsibleSidebar } from "@/components/organization/collapsible-sidebar"
import { GlobalChatPanel } from "@/components/chat/global-chat-panel"
import { auth } from "@/lib/auth/auth"
import { headers } from "next/headers"

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const session = await auth.api.getSession({
    headers: await headers()
  })
  
  if (!session) {
    redirect("/login")
  }
  
  const { orgSlug } = await params
  
  const organization = await getOrganizationBySlug(orgSlug, session.user.id)
  
  if (!organization) {
    redirect("/dashboard")
  }
  
  const organizations = await getUserOrganizations(session.user.id)

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen relative">
        <CollapsibleSidebar
          orgSlug={orgSlug}
          organizations={organizations}
          currentOrg={organization}
          userName={session.user.name || ""}
          userEmail={session.user.email}
          userInitial={(session.user.name || session.user.email).charAt(0).toUpperCase()}
          userRole={organization.userRole}
        />
        <main className="flex-1 overflow-auto relative">
          {children}
        </main>
        <GlobalChatPanel orgId={organization.id} />
      </div>
    </div>
  )
}