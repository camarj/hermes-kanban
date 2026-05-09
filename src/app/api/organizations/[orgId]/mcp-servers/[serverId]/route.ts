import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"
import { getMcpServer, updateMcpServer, deleteMcpServer } from "@/lib/mcp/queries"

async function authorize(orgId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Unauthorized", status: 401 as const }

  const membership = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })
  if (!membership) return { error: "Forbidden", status: 403 as const }

  return { session, membership }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; serverId: string }> }
) {
  try {
    const { orgId, serverId } = await params
    const auth = await authorize(orgId)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const server = await getMcpServer(orgId, serverId)
    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 })
    }
    return NextResponse.json({ server })
  } catch (error) {
    console.error("Failed to get MCP server:", error)
    return NextResponse.json({ error: "Failed to get MCP server" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; serverId: string }> }
) {
  try {
    const { orgId, serverId } = await params
    const auth = await authorize(orgId)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await req.json()
    const result = await updateMcpServer(orgId, serverId, {
      name: body.name,
      transport: body.transport,
      command: body.command,
      url: body.url,
      envVars: body.envVars,
      toolsFilter: body.toolsFilter,
    })

    if (!result.ok) {
      const status = result.error === "Server not found" ? 404 : 400
      return NextResponse.json({ error: result.error }, { status })
    }

    return NextResponse.json({ server: result.server })
  } catch (error) {
    console.error("Failed to update MCP server:", error)
    return NextResponse.json({ error: "Failed to update MCP server" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; serverId: string }> }
) {
  try {
    const { orgId, serverId } = await params
    const auth = await authorize(orgId)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const result = await deleteMcpServer(orgId, serverId)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Failed to delete MCP server:", error)
    return NextResponse.json({ error: "Failed to delete MCP server" }, { status: 500 })
  }
}
