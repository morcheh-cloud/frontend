import type { Metadata } from "next"

import { Logo } from "@/components/logo"
import { LoginForm } from "./components/login-form"

export const metadata: Metadata = {
  title: "Sign in",
}

export default function LoginPage() {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section className="flex items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <Logo />

          <div className="rounded-2xl bg-card p-6 shadow-sm sm:p-8">
            <h1 className="mb-6 text-heading font-light">Sign in</h1>
            <LoginForm />
          </div>

          <p className="text-body-sm text-muted-foreground">
            Forgot your password? Ask your Morcheh admin to reset it.
          </p>
        </div>
      </section>

      {/* Reserved: the user will design this half later. */}
      <div className="m-4 hidden rounded-3xl bg-card shadow-sm lg:block" />
    </main>
  )
}
