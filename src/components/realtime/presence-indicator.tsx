"use client"

import { usePresence } from "@/lib/realtime/use-presence"
import { cn } from "@/lib/utils"

interface PresenceIndicatorProps {
  orgId: string
  userId: string
  userName: string
  userEmail: string
  className?: string
}

export function PresenceIndicator({
  orgId,
  userId,
  userName,
  userEmail,
  className,
}: PresenceIndicatorProps) {
  const { onlineUsers, isConnected, userColor } = usePresence({
    orgId,
    userId,
    userName,
    userEmail,
  })

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Connection Status */}
      <div
        className={cn(
          "w-2 h-2 rounded-full",
          isConnected ? "bg-green-500" : "bg-red-500"
        )}
        title={isConnected ? "Connected" : "Disconnected"}
      />

      {/* Online Users */}
      {onlineUsers.length > 0 && (
        <div className="flex items-center">
          <span className="text-xs text-[#6B6560] mr-2">
            {onlineUsers.length} online
          </span>
          <div className="flex -space-x-2">
            {onlineUsers.slice(0, 3).map((user) => (
              <div
                key={user.id}
                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white"
                style={{ backgroundColor: user.color }}
                title={`${user.name} (${user.email})`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {onlineUsers.length > 3 && (
              <div className="w-6 h-6 rounded-full border-2 border-white bg-[#E8E4DE] flex items-center justify-center text-xs text-[#6B6560]">
                +{onlineUsers.length - 3}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current User Indicator */}
      <div
        className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white ring-2 ring-[#2D9AA5]"
        style={{ backgroundColor: userColor }}
        title={`You (${userEmail})`}
      >
        {userName.charAt(0).toUpperCase()}
      </div>
    </div>
  )
}