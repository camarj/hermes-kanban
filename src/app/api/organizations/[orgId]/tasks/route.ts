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

    // Verify user is member of organization
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

    // Get all tasks for organization
    const tasks = await prisma.task.findMany({
      where: {
        orgId,
        status: {
          not: "archived"
        }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" }
      ]
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error("Failed to fetch tasks:", error)
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    )
  }
}

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
    const { title, body: taskBody, status, priority, projectId } = body

    if (!title || typeof title !== "string" || title.trim().length < 1) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    // Verify user is member of organization
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

    // If projectId provided, verify it belongs to org
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          orgId
        }
      })
      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        )
      }
    }

    // Create default project if none specified
    let targetProjectId = projectId
    if (!targetProjectId) {
      const defaultProject = await prisma.project.findFirst({
        where: { orgId }
      })
      if (defaultProject) {
        targetProjectId = defaultProject.id
      } else {
        // Create a default project
        const newProject = await prisma.project.create({
          data: {
            orgId,
            name: "Default Project",
            description: "Auto-created default project",
            createdBy: session.user.id
          }
        })
        targetProjectId = newProject.id
      }
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        body: taskBody?.trim() || null,
        status: status || "triage",
        priority: priority ?? 0,
        orgId,
        projectId: targetProjectId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error("Failed to create task:", error)
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    )
  }
}