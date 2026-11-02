import type { Metadata } from "next"
import { Suspense } from "react"

import { Logo } from "@/components/logo"
import { AuthScreen } from "./components/auth-screen"
import { ColonyMap } from "./components/colony-map"

export const metadata: Metadata = {
  title: "Sign in",
}

export default function LoginPage() {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      {/* Phone: a full-screen native sign-in view, no card, safe-area aware.
          sm–lg: the login box centred as a card. lg: a plain form beside the map. */}
      <section className="flex flex-col px-6 pt-[max(--spacing(8),env(safe-area-inset-top))] pb-[max(--spacing(6),env(safe-area-inset-bottom))] sm:items-center sm:justify-center sm:py-12 lg:items-stretch lg:px-12 lg:py-10">
        <Logo className="hidden lg:inline-flex" />

        <div className="flex w-full flex-1 flex-col gap-10 sm:max-w-sm sm:flex-none sm:gap-8 lg:m-auto">
          <Logo className="lg:hidden" />

          <Suspense>
            <AuthScreen />
          </Suspense>
        </div>
      </section>

      <aside className="relative hidden flex-col overflow-hidden border-s border-border bg-subtle p-12 lg:flex">
        {/* Faint dot grid, fading out towards the edges. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(var(--color-mist)_1px,transparent_1px)] mask-[radial-gradient(ellipse_at_center,black_30%,transparent_75%)] bg-size-[20px_20px]"
        />

        <div className="relative grid flex-1 place-items-center">
          <ColonyMap />
        </div>

        <div className="relative max-w-md">
          <h2 className="text-heading font-light">Every server, one colony.</h2>
          <p className="mt-3 text-muted-foreground">
            Connect over SSH, watch health and manage services across your whole
            fleet from one place.
          </p>
        </div>
      </aside>
    </main>
  )
}
