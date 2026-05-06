import { requireAuth } from "@/lib/auth/session"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth/auth"
import { headers } from "next/headers"

export default async function DashboardPage() {
  const session = await requireAuth()

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
