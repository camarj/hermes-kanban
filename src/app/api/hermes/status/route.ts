import { NextResponse } from "next/server"
import { hermesClient } from "@/lib/hermes"

export const dynamic = "force-dynamic"

export async function GET() {
  const [isGatewayRunning, detailed] = await Promise.all([
    hermesClient.health(),
    hermesClient.healthDetailed(),
  ])

  return NextResponse.json({
    gateway: {
      available: isGatewayRunning,
      url: hermesClient.gatewayUrl,
      details: detailed,
    },
    hermesHome: hermesClient.hermesHomePath,
    profilesPath: hermesClient.profilesPath,
    kanbanDbPath: hermesClient.kanbanDbPath,
  })
}