"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  Bot,
  Users,
  Plug,
} from "lucide-react"
import { OrganizationSwitcher } from "@/components/organization/organization-switcher"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

interface Organization {
  id: string
  name: string
  slug: string
  objective: string | null
  createdAt: Date
  updatedAt: Date
  ownerId: string | null
  members: { role: string }[]
  userRole: string
}

interface CollapsibleSidebarProps {
  orgSlug: string
  organizations: { id: string; name: string; slug: string; objective: string | null; createdAt: Date; updatedAt: Date; ownerId: string | null }[]
  currentOrg: Organization
  userName: string
  userEmail: string
  userInitial: string
  userRole: string
}

export function CollapsibleSidebar({
  orgSlug,
  organizations,
  currentOrg,
  userName,
  userEmail,
  userInitial,
  userRole,
}: CollapsibleSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
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
      label: "MCP Servers",
      href: `/${orgSlug}/mcp-servers`,
      icon: <Plug className="h-4 w-4" />,
    },
    {
      label: "Settings",
      href: `/${orgSlug}/settings`,
      icon: <Settings className="h-4 w-4" />,
    },
  ]

  return (
    <TooltipProvider delay={0}>
      <aside
        className={cn(
          "border-r border-border bg-card flex flex-col transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className={cn(
          "h-16 flex items-center border-b border-border",
          collapsed ? "justify-center px-2" : "px-4 justify-between"
        )}>
          {!collapsed && (
            <Link href="/dashboard" className="font-serif text-xl font-semibold text-foreground">
              Hermes Kanban
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {!collapsed && (
          <div className="p-3 border-b border-border">
            <OrganizationSwitcher
              organizations={organizations}
              currentOrg={currentOrg}
            />
          </div>
        )}

        <nav className="flex-1 py-4">
          <div className="flex flex-col gap-1 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              const link = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-md text-sm transition-colors",
                    collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.icon}
                  {!collapsed && item.label}
                </Link>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger render={link} />
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                )
              }

              return link
            })}
          </div>
        </nav>

        <div className={cn(
          "border-t border-border",
          collapsed ? "p-2" : "p-3"
        )}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger render={
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center cursor-default">
                    <span className="text-sm font-medium text-foreground">
                      {userInitial}
                    </span>
                  </div>
                } />
                <TooltipContent side="right">
                  <div>{userName || userEmail}</div>
                  <div className="text-xs text-muted-foreground capitalize">{userRole}</div>
                </TooltipContent>
              </Tooltip>
              <div className="flex flex-col items-center gap-1">
                <ThemeToggle />
                <SignOutButton />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-foreground">
                    {userInitial}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">
                    {userName || userEmail}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {userRole}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <SignOutButton />
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}