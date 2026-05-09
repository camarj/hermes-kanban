import { requireNoAuth } from "@/lib/auth/session"
import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage() {
  await requireNoAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F1EB] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-semibold text-[#070605] mb-2">
            Hermes Kanban
          </h1>
          <p className="text-[#6B6560]">
            Sign in to your account
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}