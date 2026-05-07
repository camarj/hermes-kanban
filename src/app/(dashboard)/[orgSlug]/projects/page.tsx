import { requireAuth } from "@/lib/auth/session"
import { getOrganizationBySlug } from "@/lib/organization/helpers"
import { redirect } from "next/navigation"
import { ProjectList } from "@/components/projects/project-list"
import { prisma } from "@/lib/db/prisma"

export default async function ProjectsPage({
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

  // Fetch projects
  const projects = await prisma.project.findMany({
    where: { orgId: organization.id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      _count: {
        select: {
          tasks: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-[#070605]">
          Projects
        </h1>
        <p className="text-[#6B6560]">
          Manage your organization&apos;s projects and track progress
        </p>
      </div>

      <ProjectList
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status as "active" | "paused" | "completed" | "archived",
          createdAt: p.createdAt.toISOString(),
          creator: p.creator,
          _count: p._count,
        }))}
        orgId={organization.id}
        orgSlug={orgSlug}
      />
    </div>
  )
}