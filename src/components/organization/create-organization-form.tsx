"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function CreateOrganizationForm() {
  const [name, setName] = useState("")
  const [objective, setObjective] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, objective }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create organization")
      }

      const data = await response.json()
      
      // Redirect to the created organization's dashboard
      if (data.organization?.slug) {
        router.push(`/${data.organization.slug}`)
        router.refresh()
      } else {
        // Fallback to dashboard
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-[#D4CFC7] bg-white">
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Create Your Organization</CardTitle>
        <CardDescription className="text-[#6B6560]">
          Set up your first organization to get started with Hermes Kanban
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[#070605]">
              Organization Name *
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Acme Inc"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="border-[#D4CFC7] focus:border-[#2D9AA5] focus:ring-[#2D9AA5]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="objective" className="text-[#070605]">
              Objective
            </Label>
            <Textarea
              id="objective"
              placeholder="What is your organization's main goal? Describe your mission, vision, and what you want to achieve..."
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={5}
              className="border-[#D4CFC7] focus:border-[#2D9AA5] focus:ring-[#2D9AA5] resize-y min-h-[120px]"
            />
            <p className="text-xs text-[#6B6560]">
              Describe your organization&apos;s purpose and goals — you can write multiple paragraphs
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button 
            type="submit" 
            className="w-full bg-[#2D9AA5] hover:bg-[#1A7A82]"
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Create Organization"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-xs text-[#6B6560]">
          You can always change this information later in settings
        </p>
      </CardFooter>
    </Card>
  )
}