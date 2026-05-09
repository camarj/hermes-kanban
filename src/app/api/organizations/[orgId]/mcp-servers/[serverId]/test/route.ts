import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"
import { getMcpServer } from "@/lib/mcp/queries"
import { testMcpConnection } from "@/lib/mcp/test-connection"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; serverId: string }> }
) {
  try {
    const { orgId, serverId } = await params

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const membership = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId, userId: session.user.id } },
    })
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const server = await getMcpServer(orgId, serverId)
    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 })
    }

    const result = await testMcpConnection(server)
    return NextResponse.json({ result })
  } catch (error) {
    console.error("Failed to test MCP server:", error)
    return NextResponse.json({ error: "Failed to test MCP server" }, { status: 500 })
  }
}
