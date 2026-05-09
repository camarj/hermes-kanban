import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"
import { listMcpServers, createMcpServer } from "@/lib/mcp/queries"

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
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    const auth = await authorize(orgId)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const servers = await listMcpServers(orgId)
    return NextResponse.json({ servers })
  } catch (error) {
    console.error("Failed to list MCP servers:", error)
    return NextResponse.json({ error: "Failed to list MCP servers" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    const auth = await authorize(orgId)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await req.json()
    const result = await createMcpServer(orgId, {
      name: body.name,
      transport: body.transport,
      command: body.command,
      url: body.url,
      envVars: body.envVars,
      toolsFilter: body.toolsFilter,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ server: result.server }, { status: 201 })
  } catch (error) {
    console.error("Failed to create MCP server:", error)
    return NextResponse.json({ error: "Failed to create MCP server" }, { status: 500 })
  }
}
