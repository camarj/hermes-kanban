import { redirect } from "next/navigation"
import Link from "next/link"
import { hasOrganizations, getUserOrganizations } from "@/lib/organization/helpers"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { auth } from "@/lib/auth/auth"
import { headers } from "next/headers"

export default async function DashboardPage() {
  // Proxy already handles auth - if we're here, user is authenticated
  const session = await auth.api.getSession({
    headers: await headers()
  })

  // No session means proxy already redirected - this shouldn't happen
  if (!session) {
    return null
  }

  // Check if user has organizations
  const userHasOrgs = await hasOrganizations(session.user.id)
  if (!userHasOrgs) {
    redirect("/onboarding/create-organization")
  }

  const organizations = await getUserOrganizations(session.user.id)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="font-serif text-xl font-semibold text-foreground">
              Hermes Kanban
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {session.user.email}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-border bg-card p-8">
          <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
            Welcome to Hermes Kanban
          </h2>
          <p className="text-muted-foreground mb-6">
            You are successfully authenticated. This is your dashboard.
          </p>

          {/* Organizations Section */}
          <div className="mb-8">
            <h3 className="font-medium text-foreground mb-4">Your Organizations</h3>
            {organizations.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {organizations.map((org) => (
                  <Link 
                    key={org.id} 
                    href={`/${org.slug}`}
                    className="rounded-lg border border-border p-4 hover:border-primary hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold flex-shrink-0">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-foreground truncate">{org.name}</h4>
                        <p className="text-sm text-muted-foreground truncate">{org.objective || "No objective set"}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-border rounded-lg">
                <p className="text-muted-foreground">No organizations yet</p>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <h3 className="font-medium text-foreground">Organizations</h3>
              <p className="text-sm text-muted-foreground">Manage your teams</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <h3 className="font-medium text-foreground">Projects</h3>
              <p className="text-sm text-muted-foreground">View active projects</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <h3 className="font-medium text-foreground">Tasks</h3>
              <p className="text-sm text-muted-foreground">Track your work</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
