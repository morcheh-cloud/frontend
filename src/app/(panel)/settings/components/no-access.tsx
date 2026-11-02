"use client"

import { Lock } from "lucide-react"
import type { ReactNode } from "react"

import { useAccess } from "@/components/auth/auth"

export function NoAccess({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center md:py-20">
      <span className="mb-4 flex size-11 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Lock className="size-5" />
      </span>
      <h1 className="text-body font-medium">You can't open this page</h1>
      <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">
        {text ?? "Only an admin can manage this."}
      </p>
    </div>
  )
}

// Hides what the API would refuse anyway. The API is what actually enforces it.
export function AdminOnly({ children }: { children: ReactNode }) {
  const { admin } = useAccess()
  return admin ? children : <NoAccess />
}
