import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/session"
import { hasOrganizations, getUserOrganizations } from "@/lib/organization/helpers"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth/auth"
import { headers } from "next/headers"

export default async function DashboardPage() {
  const session = await requireAuth()

  // Check if user has organizations, if not redirect to onboarding
  const userHasOrgs = await hasOrganizations(session.user.id)
  if (!userHasOrgs) {
    redirect("/onboarding/create-organization")
  }

  // Get user's organizations
  const organizations = await getUserOrganizations(session.user.id)

  async function signOut() {
    "use server"
    await auth.api.signOut({
      headers: await headers()
    })
  }

  return (
    <div className="min-h-screen bg-[#F5F1EB]">
      <header className="border-b border-[#D4CFC7] bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="font-serif text-xl font-semibold text-[#070605]">
              Hermes Kanban
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#6B6560]">
                {session.user.email}
              </span>
              <form action={signOut}>
                <Button 
                  type="submit"
                  variant="outline" 
                  className="border-[#D4CFC7] hover:bg-[#E8E4DE]"
                >
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-[#D4CFC7] bg-white p-8">
          <h2 className="font-serif text-2xl font-semibold text-[#070605] mb-4">
            Welcome to Hermes Kanban
          </h2>
          <p className="text-[#6B6560] mb-6">
            You are successfully authenticated. This is your dashboard.
          </p>

          {/* Organizations Section */}
          <div className="mb-8">
            <h3 className="font-medium text-[#070605] mb-4">Your Organizations</h3>
            {organizations.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {organizations.map((org) => (
                  <Link 
                    key={org.id} 
                    href={`/${org.slug}`}
                    className="rounded-lg border border-[#D4CFC7] p-4 hover:border-[#2D9AA5] hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2D9AA5] text-white font-semibold flex-shrink-0">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-[#070605] truncate">{org.name}</h4>
                        <p className="text-sm text-[#6B6560] truncate">{org.objective || "No objective set"}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-[#D4CFC7] rounded-lg">
                <p className="text-[#6B6560]">No organizations yet</p>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-[#D4CFC7] p-4">
              <h3 className="font-medium text-[#070605]">Organizations</h3>
              <p className="text-sm text-[#6B6560]">Manage your teams</p>
            </div>
            <div className="rounded-lg border border-[#D4CFC7] p-4">
              <h3 className="font-medium text-[#070605]">Projects</h3>
              <p className="text-sm text-[#6B6560]">View active projects</p>
            </div>
            <div className="rounded-lg border border-[#D4CFC7] p-4">
              <h3 className="font-medium text-[#070605]">Tasks</h3>
              <p className="text-sm text-[#6B6560]">Track your work</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
