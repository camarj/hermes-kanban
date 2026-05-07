"use client"

import { useState, useRef, type FormEvent, type KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SendHorizontal, Square } from "lucide-react"

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading: boolean
  isStreaming: boolean
  onStop: () => void
  disabled?: boolean
}

export function ChatInput({ onSend, isLoading, isStreaming, onStop, disabled }: ChatInputProps) {
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || (isLoading && !isStreaming)) return
    onSend(trimmed)
    setInput("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleInputChange(value: string) {
    setInput(value)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-[#D4CFC7] bg-white p-4">
      <div className="flex items-end gap-3 max-w-3xl mx-auto">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Hermes Gateway is offline..." : "Message the CEO agent..."}
            disabled={disabled || (isLoading && !isStreaming)}
            rows={1}
            className="min-h-[44px] max-h-[160px] resize-none rounded-xl border-[#D4CFC7] bg-[#F5F1EB] focus-visible:ring-[#2D9AA5] text-sm pr-4 py-3"
          />
        </div>
        {isStreaming ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onStop}
            className="h-11 w-11 rounded-xl border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600 flex-shrink-0"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading || disabled}
            className="h-11 w-11 rounded-xl bg-[#2D9AA5] hover:bg-[#1A7A82] flex-shrink-0"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-[#9A9590] mt-2 text-center">
        CEO agent delegates tasks to worker agents. Press Enter to send, Shift+Enter for new line.
      </p>
    </form>
  )
}