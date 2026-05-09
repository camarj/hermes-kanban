import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/auth"
import { headers } from "next/headers"
import { hasOrganizations, getUserOrganizations } from "@/lib/organization/helpers"

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  // No session - redirect to login
  if (!session) {
    redirect("/login")
  }

  // Check if user has organizations
  const userHasOrgs = await hasOrganizations(session.user.id)

  // No organizations - redirect to onboarding
  if (!userHasOrgs) {
    redirect("/onboarding/create-organization")
  }

  // Get user's organizations and redirect to the first one
  const organizations = await getUserOrganizations(session.user.id)

  if (organizations.length > 0) {
    redirect(`/${organizations[0].slug}`)
  }

  // Fallback - should never reach here
  redirect("/login")
}
