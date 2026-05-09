"use client"

import { useEffect, useState } from "react"
import { Sun, Moon, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"

type Theme = "light" | "dark" | "system"

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove("light", "dark", "system")
  if (theme === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    root.classList.add(isDark ? "dark" : "light")
    root.classList.add("system")
  } else {
    root.classList.add(theme)
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme | null) ?? "system"
    setTheme(stored)
    applyTheme(stored)
  }, [])

  useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => applyTheme("system")
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  function cycle() {
    const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light"
    setTheme(next)
    localStorage.setItem("theme", next)
    applyTheme(next)
  }

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor
  const label = theme === "light" ? "Modo claro" : theme === "dark" ? "Modo oscuro" : "Sistema"

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycle}
      aria-label={`Tema: ${label}. Click para cambiar.`}
      title={label}
      className="text-muted-foreground hover:text-foreground flex-shrink-0"
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}
