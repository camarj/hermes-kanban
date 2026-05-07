import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/session"
import { getUserOrganizations, getOrganizationBySlug } from "@/lib/organization/helpers"
import { OrganizationSwitcher } from "@/components/organization/organization-switcher"
import { OrgSidebarNav } from "@/components/organization/org-sidebar-nav"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth/auth"
import { headers } from "next/headers"

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const session = await requireAuth()
  const { orgSlug } = await params
  
  // Get current organization
  const organization = await getOrganizationBySlug(orgSlug, session.user.id)
  
  if (!organization) {
    redirect("/dashboard")
  }
  
  // Get all organizations for the switcher
  const organizations = await getUserOrganizations(session.user.id)

  async function signOut() {
    "use server"
    await auth.api.signOut({
      headers: await headers()
    })
  }

  return (
    <div className="min-h-screen bg-[#F5F1EB]">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-64 border-r border-[#D4CFC7] bg-white flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b border-[#D4CFC7]">
            <Link href="/dashboard" className="font-serif text-xl font-semibold text-[#070605]">
              Hermes Kanban
            </Link>
          </div>
          
          {/* Organization Switcher */}
          <div className="p-3 border-b border-[#D4CFC7]">
            <OrganizationSwitcher 
              organizations={organizations} 
              currentOrg={organization}
            />
          </div>
          
          {/* Navigation */}
          <div className="flex-1 py-4">
            <OrgSidebarNav orgSlug={orgSlug} />
          </div>
          
          {/* User Section */}
          <div className="p-3 border-t border-[#D4CFC7]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-full bg-[#E8E4DE] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-[#070605]">
                    {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-[#070605] truncate">
                    {session.user.name || session.user.email}
                  </span>
                  <span className="text-xs text-[#6B6560] capitalize">
                    {organization.userRole}
                  </span>
                </div>
              </div>
              <form action={signOut}>
                <Button 
                  type="submit"
                  variant="ghost" 
                  size="sm"
                  className="text-[#6B6560] hover:text-[#070605] flex-shrink-0"
                >
                  Log out
                </Button>
              </form>
            </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}