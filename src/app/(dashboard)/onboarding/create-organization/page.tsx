import { redirect } from "next/navigation"
import { hasOrganizations } from "@/lib/organization/helpers"
import { CreateOrganizationForm } from "@/components/organization/create-organization-form"
import { auth } from "@/lib/auth/auth"
import { headers } from "next/headers"

export default async function OnboardingPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  })
  
  if (!session) {
    redirect("/login")
  }
  
  // If user already has organizations, redirect to dashboard
  const userHasOrgs = await hasOrganizations(session.user.id)
  if (userHasOrgs) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F1EB] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-semibold text-[#070605] mb-2">
            Welcome to Hermes Kanban
          </h1>
          <p className="text-[#6B6560]">
            Let&apos;s set up your first organization
          </p>
        </div>
        <CreateOrganizationForm />
      </div>
    </div>
  )
}