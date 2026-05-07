import { requireAuth } from "@/lib/auth/session"
import { getOrganizationBySlug } from "@/lib/organization/helpers"
import { redirect } from "next/navigation"
import { MemberList } from "@/components/members/member-list"
import { prisma } from "@/lib/db/prisma"

export default async function MembersPage({
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

  // Fetch members
  const members = await prisma.organizationMember.findMany({
    where: { orgId: organization.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      }
    },
    orderBy: { joinedAt: "desc" }
  })

  // Fetch pending invitations
  const invitations = await prisma.invitation.findMany({
    where: {
      orgId: organization.id,
      acceptedAt: null
    },
    orderBy: { createdAt: "desc" }
  })

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-[#070605]">
          Members
        </h1>
        <p className="text-[#6B6560]">
          Manage your organization members and invitations
        </p>
      </div>

      <MemberList
        members={members.map((m) => ({
          id: m.id,
          orgId: m.orgId,
          role: m.role as "owner" | "board" | "member",
          responsibilities: m.responsibilities,
          domains: m.domains,
          joinedAt: m.joinedAt.toISOString(),
          user: m.user,
        }))}
        invitations={invitations.map((i) => ({
          ...i,
          createdAt: i.createdAt.toISOString(),
          expiresAt: i.expiresAt.toISOString(),
        }))}
        orgId={organization.id}
        currentUserRole={organization.userRole}
      />
    </div>
  )
}