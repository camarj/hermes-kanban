"use client"

import { ChatMessage } from "@/hooks/use-chat"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatMessageBubbleProps {
  message: ChatMessage
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"

  return (
    <div className={cn("flex gap-3 px-4 py-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs font-medium",
            isUser
              ? "bg-[#E8E4DE] text-[#070605]"
              : "bg-[#2D9AA5] text-white"
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "max-w-[75%] rounded-lg px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-[#2D9AA5] text-white"
            : "bg-white border border-[#D4CFC7] text-[#070605]"
        )}
      >
        {isAssistant && message.isStreaming && !message.content ? (
          <div className="flex items-center gap-1.5 py-1">
            <span className="w-2 h-2 rounded-full bg-[#2D9AA5] animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-[#2D9AA5] animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-[#2D9AA5] animate-bounce [animation-delay:300ms]" />
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {message.content}
            {isAssistant && message.isStreaming && message.content && (
              <span className="inline-block w-0.5 h-4 ml-0.5 bg-[#2D9AA5] animate-pulse align-text-bottom" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}