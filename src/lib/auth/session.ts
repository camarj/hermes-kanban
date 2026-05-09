import { auth } from "@/lib/auth/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getUserOrganizations } from "@/lib/organization/helpers"

export async function getSession() {
  return await auth.api.getSession({
    headers: await headers()
  })
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }
  return session
}

export async function requireNoAuth() {
  const session = await getSession()
  if (session) {
    const organizations = await getUserOrganizations(session.user.id)
    if (organizations.length > 0) {
      redirect(`/${organizations[0].slug}`)
    }
    redirect("/onboarding/create-organization")
  }
}
