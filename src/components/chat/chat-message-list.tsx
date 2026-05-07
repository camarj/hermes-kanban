"use client"

import { ChatMessage } from "@/hooks/use-chat"
import { ChatMessageBubble } from "./chat-message-bubble"
import { Bot, WifiOff } from "lucide-react"

interface ChatMessageListProps {
  messages: ChatMessage[]
  isGatewayDown: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function ChatMessageList({ messages, isGatewayDown, containerRef }: ChatMessageListProps) {
  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto"
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-[#E8E4DE] flex items-center justify-center mb-4">
            {isGatewayDown ? (
              <WifiOff className="h-8 w-8 text-[#9A9590]" />
            ) : (
              <Bot className="h-8 w-8 text-[#2D9AA5]" />
            )}
          </div>
          <h2 className="font-serif text-xl font-semibold text-[#070605] mb-2">
            {isGatewayDown ? "Gateway Offline" : "Chat with CEO Agent"}
          </h2>
          <p className="text-sm text-[#6B6560] max-w-md">
            {isGatewayDown
              ? "The Hermes Gateway is not responding. Start it with hermes gateway run and try again."
              : "Send a message to the CEO agent. It will analyze your request and delegate tasks to worker agents as needed."}
          </p>
          {!isGatewayDown && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
              {[
                "What tasks are currently blocked?",
                "Create a task to implement user auth",
                "Give me a status update on all tasks",
                "Which agent should handle the API integration?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  data-suggestion={suggestion}
                  className="text-left text-sm px-4 py-3 rounded-lg border border-[#D4CFC7] bg-white hover:bg-[#F5F1EB] hover:border-[#2D9AA5] transition-colors text-[#070605]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="py-4 space-y-2">
          {messages.map((message) => (
            <ChatMessageBubble key={message.id} message={message} />
          ))}
        </div>
      )}
    </div>
  )
}