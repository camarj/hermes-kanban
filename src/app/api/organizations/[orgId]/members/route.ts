import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
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

    const { orgId } = await params

    const membership = await prisma.organizationMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: session.user.id
        }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const members = await prisma.organizationMember.findMany({
      where: { orgId },
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

    return NextResponse.json({ members })
  } catch (error) {
    console.error("Failed to fetch members:", error)
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    )
  }
}
