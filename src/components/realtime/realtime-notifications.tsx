"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { CheckCircle, Trash2, Plus } from "lucide-react"

interface RealtimeToast {
  id: string
  type: "created" | "updated" | "deleted"
  message: string
}

interface RealtimeNotificationsProps {
  lastUpdate: Date | null
}

export function RealtimeNotifications({ lastUpdate }: RealtimeNotificationsProps) {
  const [toasts, setToasts] = useState<RealtimeToast[]>([])

  useEffect(() => {
    if (!lastUpdate) return

    const toast: RealtimeToast = {
      id: Date.now().toString(),
      type: "updated",
      message: "Board updated in real-time",
    }

    setToasts((prev) => [...prev, toast])

    // Remove toast after 3 seconds
    const timeout = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id))
    }, 3000)

    return () => clearTimeout(timeout)
  }, [lastUpdate])

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium",
              toast.type === "created" && "bg-green-500 text-white",
              toast.type === "updated" && "bg-blue-500 text-white",
              toast.type === "deleted" && "bg-red-500 text-white"
            )}
          >
            {toast.type === "created" && <Plus className="h-4 w-4" />}
            {toast.type === "updated" && <CheckCircle className="h-4 w-4" />}
            {toast.type === "deleted" && <Trash2 className="h-4 w-4" />}
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}