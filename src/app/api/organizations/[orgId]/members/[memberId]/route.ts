import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
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

    const { orgId, memberId } = await params
    const body = await req.json()
    const { role, responsibilities, domains } = body

    const currentUserMembership = await prisma.organizationMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: session.user.id
        }
      }
    })

    if (!currentUserMembership || !['owner', 'board'].includes(currentUserMembership.role)) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions" },
        { status: 403 }
      )
    }

    const targetMember = await prisma.organizationMember.findUnique({
      where: { id: memberId }
    })

    if (!targetMember || targetMember.orgId !== orgId) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      )
    }

    if (targetMember.role === 'owner') {
      return NextResponse.json(
        { error: "Cannot modify owner" },
        { status: 403 }
      )
    }

    const member = await prisma.organizationMember.update({
      where: { id: memberId },
      data: {
        role,
        responsibilities: responsibilities || [],
        domains: domains || []
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })

    return NextResponse.json({ member })
  } catch (error) {
    console.error("Failed to update member:", error)
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
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

    const { orgId, memberId } = await params

    const currentUserMembership = await prisma.organizationMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: session.user.id
        }
      }
    })

    if (!currentUserMembership || !['owner', 'board'].includes(currentUserMembership.role)) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions" },
        { status: 403 }
      )
    }

    const targetMember = await prisma.organizationMember.findUnique({
      where: { id: memberId }
    })

    if (!targetMember || targetMember.orgId !== orgId) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      )
    }

    if (targetMember.role === 'owner') {
      return NextResponse.json(
        { error: "Cannot remove owner" },
        { status: 403 }
      )
    }

    await prisma.organizationMember.delete({
      where: { id: memberId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to remove member:", error)
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    )
  }
}
