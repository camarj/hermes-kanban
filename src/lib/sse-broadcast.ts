type SSEMessage = {
  type: "task:created" | "task:updated" | "task:deleted" | "connected"
  payload?: {
    taskId?: string
    task?: unknown
    status?: string
  }
}

const clients = new Map<string, Set<ReadableStreamDefaultController>>()

export function getSSEClients(orgId: string) {
  if (!clients.has(orgId)) {
    clients.set(orgId, new Set())
  }
  return clients.get(orgId)!
}

export function addSSEClient(orgId: string, controller: ReadableStreamDefaultController) {
  const orgClients = getSSEClients(orgId)
  orgClients.add(controller)
}

export function removeSSEClient(orgId: string, controller: ReadableStreamDefaultController) {
  const orgClients = getSSEClients(orgId)
  orgClients.delete(controller)
}

export function broadcastSSE(orgId: string, message: SSEMessage) {
  const orgClients = getSSEClients(orgId)
  const data = `data: ${JSON.stringify(message)}\n\n`
  
  orgClients.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(data))
    } catch {
      orgClients.delete(controller)
    }
  })
}
