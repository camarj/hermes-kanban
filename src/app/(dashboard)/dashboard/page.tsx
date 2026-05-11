import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/auth"
import { headers } from "next/headers"
import { getCurrentOrganization } from "@/lib/organization/helpers"

// /dashboard is a server-side dispatcher: it never renders. We send the user
// to their first organization (`/{orgSlug}`) or to onboarding if they have
// none. All post-login redirects (proxy, callbackURLs, etc.) flow through
// here so we don't have to chase every entrypoint.
export default async function DashboardDispatchPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect("/login")
  }

  const org = await getCurrentOrganization(session.user.id)
  if (!org) {
    redirect("/onboarding/create-organization")
  }

  redirect(`/${org.slug}`)
}
