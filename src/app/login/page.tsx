import type { Metadata } from "next"

import { Logo } from "@/components/logo"
import { LoginForm } from "./components/login-form"

export const metadata: Metadata = {
  title: "Sign in",
}

export default function LoginPage() {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      {/* Phone: a full-screen native sign-in view, no card, safe-area aware.
          sm and up: the login box centred as a card. */}
      <section className="flex flex-col px-6 pt-[max(--spacing(8),env(safe-area-inset-top))] pb-[max(--spacing(6),env(safe-area-inset-bottom))] sm:items-center sm:justify-center sm:py-12">
        <div className="flex w-full flex-1 flex-col gap-10 sm:max-w-sm sm:flex-none sm:gap-8">
          <Logo />

          <div className="sm:rounded-2xl sm:border sm:border-border sm:bg-card sm:p-8 sm:shadow-sm">
            <h1 className="mb-8 text-heading font-light sm:mb-6">Sign in</h1>
            <LoginForm />
          </div>

          <p className="mt-auto text-center text-body-sm text-muted-foreground sm:mt-0 sm:text-start">
            Forgot your password? Ask your Morcheh admin to reset it.
          </p>
        </div>
      </section>

      {/* Reserved: the user will design this half later. */}
      <div className="m-4 hidden rounded-3xl bg-linear-to-br from-brand-soft via-subtle to-subtle lg:block" />
    </main>
  )
}
