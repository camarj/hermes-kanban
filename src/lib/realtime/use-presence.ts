"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

interface PresenceUser {
  id: string
  name: string
  email: string
  color: string
}

interface UsePresenceOptions {
  orgId: string
  userId: string
  userName: string
  userEmail: string
}

const COLORS = [
  "#2D9AA5",
  "#3B82F6",
  "#F59E0B",
  "#EF4444",
  "#10B981",
  "#8B5CF6",
  "#EC4899",
]

export function usePresence({ orgId, userId, userName, userEmail }: UsePresenceOptions) {
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const colorIndex = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % COLORS.length
  const userColor = COLORS[colorIndex]

  const subscribe = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    const channel = supabase.channel(`presence:${orgId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        const users: PresenceUser[] = []
        
        Object.values(state).forEach((presences) => {
          presences.forEach((presence: unknown) => {
            const p = presence as PresenceUser
            if (p.id !== userId) {
              users.push(p)
            }
          })
        })
        
        setOnlineUsers(users)
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("User joined:", key)
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("User left:", key)
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true)
          await channel.track({
            id: userId,
            name: userName,
            email: userEmail,
            color: userColor,
            onlineAt: new Date().toISOString(),
          })
        } else {
          setIsConnected(false)
        }
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [orgId, userId, userName, userEmail, userColor, supabase])

  useEffect(() => {
    if (!orgId || !userId) return

    const cleanup = subscribe()
    
    // Ping every 30 seconds to keep presence alive
    const interval = setInterval(async () => {
      if (channelRef.current) {
        await channelRef.current.track({
          id: userId,
          name: userName,
          email: userEmail,
          color: userColor,
          onlineAt: new Date().toISOString(),
        })
      }
    }, 30000)

    return () => {
      clearInterval(interval)
      cleanup()
    }
  }, [orgId, userId, userName, userEmail, userColor, subscribe])

  return {
    onlineUsers,
    isConnected,
    userColor,
  }
}