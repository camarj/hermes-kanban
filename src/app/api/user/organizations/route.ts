import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db/prisma"

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    const organizations = memberships.map(m => m.organization)

    return NextResponse.json({ organizations })
  } catch (error) {
    console.error("Failed to fetch organizations:", error)
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    )
  }
}
