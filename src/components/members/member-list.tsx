"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserPlus, MoreHorizontal, Mail, Crown, Shield, User } from "lucide-react"

interface Member {
  id: string
  role: "owner" | "board" | "member"
  responsibilities: string[]
  domains: string[]
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface Invitation {
  id: string
  email: string
  role: string
  createdAt: string
  expiresAt: string
}

interface MemberListProps {
  members: Member[]
  invitations: Invitation[]
  orgId: string
  currentUserRole: string
  onMemberUpdated?: (member: Member) => void
  onMemberRemoved?: (memberId: string) => void
  onInvitationCreated?: (invitation: Invitation) => void
  onInvitationRevoked?: (invitationId: string) => void
}

const ROLE_ICONS = {
  owner: Crown,
  board: Shield,
  member: User
}

const ROLE_COLORS = {
  owner: "bg-purple-100 text-purple-700",
  board: "bg-blue-100 text-blue-700",
  member: "bg-gray-100 text-gray-600"
}

const ROLE_LABELS = {
  owner: "Owner",
  board: "Board",
  member: "Member"
}

export function MemberList({
  members,
  invitations,
  orgId,
  currentUserRole,
  onMemberUpdated,
  onMemberRemoved,
  onInvitationCreated,
  onInvitationRevoked
}: MemberListProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"board" | "member">("member")
  const [isLoading, setIsLoading] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)

  const canManageMembers = ['owner', 'board'].includes(currentUserRole)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/organizations/${orgId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to send invitation")
      }

      const data = await response.json()
      onInvitationCreated?.(data.invitation)
      
      // Reset form
      setInviteEmail("")
      setInviteRole("member")
      setIsInviteOpen(false)
    } catch (error) {
      console.error("Failed to invite:", error)
      alert(error instanceof Error ? error.message : "Failed to send invitation")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUpdateRole(member: Member, newRole: string) {
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/members/${member.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole })
        }
      )

      if (!response.ok) {
        throw new Error("Failed to update role")
      }

      const data = await response.json()
      onMemberUpdated?.(data.member)
      setEditingMember(null)
    } catch (error) {
      console.error("Failed to update role:", error)
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Are you sure you want to remove this member?")) {
      return
    }

    try {
      const response = await fetch(
        `/api/organizations/${orgId}/members/${memberId}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        throw new Error("Failed to remove member")
      }

      onMemberRemoved?.(memberId)
    } catch (error) {
      console.error("Failed to remove member:", error)
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    if (!confirm("Are you sure you want to revoke this invitation?")) {
      return
    }

    try {
      const response = await fetch(
        `/api/organizations/${orgId}/invitations/${invitationId}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        throw new Error("Failed to revoke invitation")
      }

      onInvitationRevoked?.(invitationId)
    } catch (error) {
      console.error("Failed to revoke invitation:", error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-[#6B6560]">
            {members.length} member{members.length !== 1 ? "s" : ""}
            {invitations.length > 0 && ` • ${invitations.length} pending invitation${invitations.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {canManageMembers && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <Button
              onClick={() => setIsInviteOpen(true)}
              className="bg-[#2D9AA5] hover:bg-[#1A7A82]"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
            <DialogContent className="bg-white">
              <form onSubmit={handleInvite}>
                <DialogHeader>
                  <DialogTitle className="font-serif">Invite Member</DialogTitle>
                  <DialogDescription className="text-[#6B6560]">
                    Send an invitation to join your organization
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      required
                      className="border-[#D4CFC7] focus:border-[#2D9AA5]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "board" | "member")}>
                      <SelectTrigger className="border-[#D4CFC7]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="board">Board (Can manage)</SelectItem>
                        <SelectItem value="member">Member (View only)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsInviteOpen(false)}
                    className="border-[#D4CFC7]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !inviteEmail.includes("@")}
                    className="bg-[#2D9AA5] hover:bg-[#1A7A82]"
                  >
                    {isLoading ? "Sending..." : "Send Invitation"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Members List */}
      <div className="space-y-3">
        {members.map((member) => {
          const RoleIcon = ROLE_ICONS[member.role]
          return (
            <Card key={member.id} className="border-[#D4CFC7]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#E8E4DE] flex items-center justify-center">
                      {member.user.image ? (
                        <img
                          src={member.user.image}
                          alt={member.user.name || ""}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <span className="text-sm font-medium text-[#070605]">
                          {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[#070605]">
                        {member.user.name || member.user.email}
                      </p>
                      <p className="text-sm text-[#6B6560]">{member.user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={ROLE_COLORS[member.role]}>
                      <RoleIcon className="w-3 h-3 mr-1" />
                      {ROLE_LABELS[member.role]}
                    </Badge>

                    {canManageMembers && member.role !== "owner" && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingMember(member)}
                          className="text-[#6B6560]"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-500"
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {member.responsibilities.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {member.responsibilities.map((resp) => (
                      <Badge key={resp} variant="secondary" className="text-xs">
                        {resp}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-[#070605]">Pending Invitations</h3>
          {invitations.map((invitation) => (
            <Card key={invitation.id} className="border-[#D4CFC7] border-dashed">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F5F1EB] flex items-center justify-center">
                      <Mail className="h-5 w-5 text-[#6B6560]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#070605]">{invitation.email}</p>
                      <p className="text-sm text-[#6B6560]">
                        Invited as {ROLE_LABELS[invitation.role as keyof typeof ROLE_LABELS]}
                      </p>
                    </div>
                  </div>

                  {canManageMembers && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeInvitation(invitation.id)}
                      className="text-red-500"
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Role Dialog */}
      {editingMember && (
        <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="font-serif">Edit Member Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-[#6B6560]">
                Update role for {editingMember.user.name || editingMember.user.email || "Unknown"}
              </p>
              <Select
                value={editingMember.role}
                onValueChange={(role) => role && handleUpdateRole(editingMember, role)}
              >
                <SelectTrigger className="border-[#D4CFC7]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="board">Board</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingMember(null)}
                className="border-[#D4CFC7]"
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}