"use client"

import { authClient } from "@/lib/auth/auth-client"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login")
        },
      },
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-[#6B6560] hover:text-[#070605] flex-shrink-0"
      onClick={handleSignOut}
    >
      <LogOut className="h-4 w-4" />
    </Button>
  )
}