"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react"
import Link from "next/link"

type InvitationStatus = "loading" | "valid" | "accepted" | "expired" | "error"

export default function AcceptInvitationPage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string
  
  const [status, setStatus] = useState<InvitationStatus>("loading")
  const [organizationName, setOrganizationName] = useState("")
  const [error, setError] = useState("")
  const [isAccepting, setIsAccepting] = useState(false)

  useEffect(() => {
    // In a real implementation, you'd verify the invitation first
    // For now, we'll just show the accept UI
    setStatus("valid")
  }, [token])

  async function handleAccept() {
    setIsAccepting(true)
    try {
      const response = await fetch(`/api/invitations/${token}`, {
        method: "POST"
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to accept invitation")
      }

      const data = await response.json()
      setOrganizationName(data.organization.name)
      setStatus("accepted")
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/${data.organization.id}`)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation")
      setStatus("error")
    } finally {
      setIsAccepting(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md border-border">
          <CardContent className="p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Verifying invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md border-border">
          <CardContent className="p-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-4 font-serif text-xl font-semibold text-foreground">
              Invitation Accepted!
            </h2>
            <p className="mt-2 text-muted-foreground">
              You are now a member of {organizationName}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Redirecting to organization...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md border-border">
          <CardContent className="p-8 text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="mt-4 font-serif text-xl font-semibold text-foreground">
              Invitation Error
            </h2>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <Link href="/dashboard">
              <Button className="mt-6 bg-primary hover:bg-primary/90">
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-serif text-2xl">Organization Invitation</CardTitle>
          <CardDescription className="text-muted-foreground">
            You&apos;ve been invited to join an organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Click below to accept the invitation and become a member of this organization.
          </p>
          <Button
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {isAccepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              "Accept Invitation"
            )}
          </Button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-muted text-foreground"
          >
            Decline
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}