"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  Bot,
  Users,
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

interface OrgSidebarNavProps {
  orgSlug: string
}

export function OrgSidebarNav({ orgSlug }: OrgSidebarNavProps) {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: `/${orgSlug}`,
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      label: "Projects",
      href: `/${orgSlug}/projects`,
      icon: <FolderKanban className="h-4 w-4" />,
    },
    {
      label: "Agents",
      href: `/${orgSlug}/agents`,
      icon: <Bot className="h-4 w-4" />,
    },
    {
      label: "Members",
      href: `/${orgSlug}/members`,
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: "Settings",
      href: `/${orgSlug}/settings`,
      icon: <Settings className="h-4 w-4" />,
    },
  ]

  return (
    <nav className="flex flex-col gap-1 px-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-[#2D9AA5]/10 text-[#2D9AA5] font-medium"
                : "text-[#6B6560] hover:bg-[#E8E4DE] hover:text-[#070605]"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}