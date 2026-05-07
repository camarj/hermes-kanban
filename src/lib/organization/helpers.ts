import { prisma } from "@/lib/db/prisma"

export async function hasOrganizations(userId: string): Promise<boolean> {
  const count = await prisma.organizationMember.count({
    where: { userId }
  })
  return count > 0
}

export async function getUserOrganizations(userId: string) {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    include: {
      organization: true
    },
    orderBy: {
      joinedAt: "desc"
    }
  })
  
  return memberships.map(m => m.organization)
}

export async function getOrganizationBySlug(slug: string, userId: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      members: {
        where: { userId },
        select: { role: true }
      }
    }
  })
  
  if (!org || org.members.length === 0) {
    return null
  }
  
  return {
    ...org,
    userRole: org.members[0].role
  }
}

export async function getCurrentOrganization(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    include: {
      organization: true
    },
    orderBy: {
      joinedAt: "desc"
    }
  })
  
  return membership?.organization || null
}