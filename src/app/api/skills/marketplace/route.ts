import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { headers } from "next/headers"

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const skills = await prisma.skill.findMany({
      where: { source: "curated", isPublic: true, orgId: null },
      orderBy: { name: "asc" },
    })
    return NextResponse.json({ skills })
  } catch (err) {
    console.error("Failed to fetch marketplace:", err)
    return NextResponse.json({ error: "Failed to fetch marketplace" }, { status: 500 })
  }
}
