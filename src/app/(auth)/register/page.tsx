import { requireNoAuth } from "@/lib/auth/session"
import { RegisterForm } from "@/components/auth/register-form"

export default async function RegisterPage() {
  await requireNoAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">
            Create Account
          </h1>
          <p className="text-muted-foreground">
            Join Hermes Kanban
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}