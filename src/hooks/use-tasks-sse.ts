"use client"

import { useEffect, useRef, useCallback } from "react"
import type { Task } from "@/lib/kanban/types"

interface SSEEvent {
  type: "connected" | "task:created" | "task:updated" | "task:deleted"
  payload?: {
    taskId?: string
    task?: Task
    status?: string
  }
}

export function useTasksSSE(
  orgId: string,
  onTaskCreated?: (task: Task) => void,
  onTaskUpdated?: (task: Task) => void,
  onTaskDeleted?: (taskId: string) => void
) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(`/api/organizations/${orgId}/sse`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data)

        switch (data.type) {
          case "task:created":
            if (data.payload?.task) {
              onTaskCreated?.(data.payload.task as Task)
            }
            break
          case "task:updated":
            if (data.payload?.task) {
              onTaskUpdated?.(data.payload.task as Task)
            }
            break
          case "task:deleted":
            if (data.payload?.taskId) {
              onTaskDeleted?.(data.payload.taskId)
            }
            break
        }
      } catch (error) {
        console.error("[SSE] Parse error:", error)
      }
    }

    eventSource.onerror = () => {
      console.log("[SSE] Connection lost, reconnecting...")
      eventSource.close()
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, 3000)
    }
  }, [orgId, onTaskCreated, onTaskUpdated, onTaskDeleted])

  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  return eventSourceRef
}
