import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"
import crypto from "crypto"

// GET pending invitations
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

    // Verify membership
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

    const invitations = await prisma.invitation.findMany({
      where: {
        orgId,
        acceptedAt: null
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error("Failed to fetch invitations:", error)
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    )
  }
}

// POST create invitation
export async function POST(
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
    const body = await req.json()
    const { email, role = "member" } = body

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      )
    }

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

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId: existingUser.id
          }
        }
      })

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member" },
          { status: 409 }
        )
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        orgId,
        email,
        acceptedAt: null
      }
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: "Pending invitation already exists" },
        { status: 409 }
      )
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex")

    // Set expiration (7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invitation = await prisma.invitation.create({
      data: {
        orgId,
        email,
        role,
        invitedBy: session.user.id,
        token,
        expiresAt
      }
    })

    return NextResponse.json({ invitation }, { status: 201 })
  } catch (error) {
    console.error("Failed to create invitation:", error)
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    )
  }
}