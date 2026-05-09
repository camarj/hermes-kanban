"use client"

import { useState, useEffect, useCallback } from "react"
import type { Task, TaskStatus } from "@/lib/kanban/types"

export type { Task, TaskStatus }

export function useTasks(orgId: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    if (!orgId) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/organizations/${orgId}/tasks`)
      if (!res.ok) throw new Error("Failed to fetch tasks")
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchTasks()

    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchTasks()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchTasks])

  const syncWithHermes = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${orgId}/kanban-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) throw new Error("Sync failed")
      const result = await res.json()
      await fetchTasks()
      return result
    } catch (err) {
      console.error("Hermes sync error:", err)
      throw err
    }
  }, [orgId, fetchTasks])

  const createTask = async (data: {
    title: string
    body?: string
    status?: string
    priority?: number
    projectId?: string
  }) => {
    const res = await fetch(`/api/organizations/${orgId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Failed to create task")
    const result = await res.json()
    setTasks((prev) => [...prev, result.task])
    return result.task
  }

  const updateTask = async (taskId: string, data: Partial<Task>) => {
    const res = await fetch(`/api/organizations/${orgId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Failed to update task")
    const result = await res.json()
    setTasks((prev) => prev.map((t) => (t.id === taskId ? result.task : t)))
    return result.task
  }

  const deleteTask = async (taskId: string) => {
    const res = await fetch(`/api/organizations/${orgId}/tasks/${taskId}`, {
      method: "DELETE",
    })
    if (!res.ok) throw new Error("Failed to delete task")
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    syncWithHermes,
    createTask,
    updateTask,
    deleteTask,
  }
}
