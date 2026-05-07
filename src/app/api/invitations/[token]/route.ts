import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"

// POST accept invitation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in first" },
        { status: 401 }
      )
    }

    const { token } = await params

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      )
    }

    // Check if already accepted
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "Invitation already accepted" },
        { status: 400 }
      )
    }

    // Check expiration
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "Invitation expired" },
        { status: 400 }
      )
    }

    // Check email matches
    if (invitation.email !== session.user.email) {
      return NextResponse.json(
        { error: "Invitation email does not match your account" },
        { status: 403 }
      )
    }

    // Check if already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        orgId_userId: {
          orgId: invitation.orgId,
          userId: session.user.id
        }
      }
    })

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this organization" },
        { status: 409 }
      )
    }

    // Get organization info
    const organization = await prisma.organization.findUnique({
      where: { id: invitation.orgId },
      select: { id: true, name: true }
    })

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    // Create member and mark invitation as accepted
    await prisma.$transaction([
      prisma.organizationMember.create({
        data: {
          orgId: invitation.orgId,
          userId: session.user.id,
          role: invitation.role
        }
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() }
      })
    ])

    return NextResponse.json({
      success: true,
      organization
    })
  } catch (error) {
    console.error("Failed to accept invitation:", error)
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    )
  }
}

// DELETE revoke invitation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; invitationId: string }> }
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

    const { orgId, invitationId } = await params

    // Verify owner or board role
    const membership = await prisma.organizationMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: session.user.id
        }
      }
    })

    if (!membership || !['owner', 'board'].includes(membership.role)) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions" },
        { status: 403 }
      )
    }

    await prisma.invitation.delete({
      where: { id: invitationId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to revoke invitation:", error)
    return NextResponse.json(
      { error: "Failed to revoke invitation" },
      { status: 500 }
    )
  }
}