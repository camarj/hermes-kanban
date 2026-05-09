import { requireNoAuth } from "@/lib/auth/session"
import { RegisterForm } from "@/components/auth/register-form"

export default async function RegisterPage() {
  await requireNoAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F1EB] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-semibold text-[#070605] mb-2">
            Create Account
          </h1>
          <p className="text-[#6B6560]">
            Join Hermes Kanban
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}