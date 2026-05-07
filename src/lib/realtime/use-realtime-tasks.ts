"use client"

import { useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Task } from "@/lib/kanban/types"

interface UseRealtimeTasksOptions {
  orgId: string
  onTaskCreated?: (task: Task) => void
  onTaskUpdated?: (task: Task) => void
  onTaskDeleted?: (taskId: string) => void
}

export function useRealtimeTasks({
  orgId,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
}: UseRealtimeTasksOptions) {
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const subscribe = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    const channel = supabase
      .channel(`tasks:${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tasks",
          filter: `orgId=eq.${orgId}`,
        },
        async (payload) => {
          // Fetch full task with project data
          const { data: task } = await supabase
            .from("tasks")
            .select(`
              *,
              project:projects(id, name)
            `)
            .eq("id", payload.new.id)
            .single()

          if (task) {
            onTaskCreated?.(task as Task)
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `orgId=eq.${orgId}`,
        },
        async (payload) => {
          // Fetch full task with project data
          const { data: task } = await supabase
            .from("tasks")
            .select(`
              *,
              project:projects(id, name)
            `)
            .eq("id", payload.new.id)
            .single()

          if (task) {
            onTaskUpdated?.(task as Task)
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "tasks",
          filter: `orgId=eq.${orgId}`,
        },
        (payload) => {
          onTaskDeleted?.(payload.old.id)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [orgId, onTaskCreated, onTaskUpdated, onTaskDeleted, supabase])

  useEffect(() => {
    if (!orgId) return

    const cleanup = subscribe()
    return cleanup
  }, [orgId, subscribe])

  return {
    isConnected: !!channelRef.current,
  }
}