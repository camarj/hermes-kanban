"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Save, Trash2, Building2 } from "lucide-react"

interface Organization {
  id: string
  name: string
  slug: string
  objective: string | null
  createdAt: string
  _count?: {
    members: number
    projects: number
    tasks: number
    agents: number
  }
}

interface OrganizationSettingsFormProps {
  organization: Organization
  onUpdate?: (org: Organization) => void
  onDelete?: () => void
}

export function OrganizationSettingsForm({ 
  organization, 
  onUpdate,
  onDelete 
}: OrganizationSettingsFormProps) {
  const [name, setName] = useState(organization.name)
  const [objective, setObjective] = useState(organization.objective || "")
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          objective: objective.trim() || null
        })
      })

      if (!response.ok) {
        throw new Error("Failed to update organization")
      }

      const data = await response.json()
      onUpdate?.(data.organization)
    } catch (error) {
      console.error("Failed to update organization:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        throw new Error("Failed to delete organization")
      }

      onDelete?.()
    } catch (error) {
      console.error("Failed to delete organization:", error)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <Card className="border-[#D4CFC7]">
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#2D9AA5]" />
            Organization Details
          </CardTitle>
          <CardDescription className="text-[#6B6560]">
            Manage your organization&apos;s basic information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="border-[#D4CFC7] focus:border-[#2D9AA5] focus:ring-[#2D9AA5]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-slug">Slug</Label>
              <Input
                id="org-slug"
                value={organization.slug}
                disabled
                className="bg-[#F5F1EB] border-[#D4CFC7] text-[#6B6560]"
              />
              <p className="text-xs text-[#6B6560]">
                This is your organization&apos;s unique URL identifier
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-objective">Objective</Label>
              <Textarea
                id="org-objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="What is your organization's main goal?"
                rows={3}
                className="border-[#D4CFC7] focus:border-[#2D9AA5] focus:ring-[#2D9AA5]"
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Organization
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="bg-[#2D9AA5] hover:bg-[#1A7A82]"
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Stats Card */}
      {organization._count && (
        <Card className="border-[#D4CFC7] mt-6">
          <CardHeader>
            <CardTitle className="font-serif">Organization Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-[#F5F1EB] rounded-lg">
                <p className="text-2xl font-semibold text-[#070605]">
                  {organization._count.members}
                </p>
                <p className="text-sm text-[#6B6560]">Members</p>
              </div>
              <div className="text-center p-4 bg-[#F5F1EB] rounded-lg">
                <p className="text-2xl font-semibold text-[#070605]">
                  {organization._count.projects}
                </p>
                <p className="text-sm text-[#6B6560]">Projects</p>
              </div>
              <div className="text-center p-4 bg-[#F5F1EB] rounded-lg">
                <p className="text-2xl font-semibold text-[#070605]">
                  {organization._count.tasks}
                </p>
                <p className="text-sm text-[#6B6560]">Tasks</p>
              </div>
              <div className="text-center p-4 bg-[#F5F1EB] rounded-lg">
                <p className="text-2xl font-semibold text-[#070605]">
                  {organization._count.agents}
                </p>
                <p className="text-sm text-[#6B6560]">Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Delete Organization</AlertDialogTitle>
            <AlertDialogDescription className="text-[#6B6560]">
              Are you sure you want to delete &quot;{organization.name}&quot;? This action cannot be undone. 
              All projects, tasks, and agents will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#D4CFC7]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}