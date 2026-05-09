"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Plus, Building2 } from "lucide-react"

interface Organization {
  id: string
  name: string
  slug: string
}

interface OrganizationSwitcherProps {
  organizations: Organization[]
  currentOrg?: Organization
}

export function OrganizationSwitcher({ organizations, currentOrg }: OrganizationSwitcherProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleSwitch = (slug: string) => {
    router.push(`/${slug}`)
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        className="w-full justify-between px-2 py-2 rounded-md hover:bg-muted flex items-center text-left"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
            {currentOrg?.name?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-foreground">
              {currentOrg?.name || "Select organization"}
            </span>
            <span className="text-xs text-muted-foreground">
              {organizations.length} organization{organizations.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-muted-foreground">Organizations</p>
        </div>
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitch(org.slug)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded text-xs font-semibold ${
                org.id === currentOrg?.id 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-foreground"
              }`}>
                {org.name.charAt(0).toUpperCase()}
              </div>
              <span className={org.id === currentOrg?.id ? "font-medium" : ""}>
                {org.name}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <Link href="/onboarding/create-organization" className="block">
          <DropdownMenuItem className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            Create organization
          </DropdownMenuItem>
        </Link>
        <Link href="/dashboard" className="block">
          <DropdownMenuItem className="cursor-pointer">
            <Building2 className="mr-2 h-4 w-4" />
            View all organizations
          </DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}