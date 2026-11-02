"use client"

import { Server } from "lucide-react"
import Link from "next/link"

import { useWorkspaceCan } from "@/app/(panel)/servers/components/permissions"
import { buttonVariants } from "@/components/ui/button"

export function HomeEmpty() {
  const canAdd = useWorkspaceCan().addServer
  return (
    <section className="flex flex-col items-center rounded-2xl border border-dashed border-mist px-6 py-12 text-center md:py-20">
      <span className="mb-4 flex size-11 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Server className="size-5" strokeWidth={1.75} />
      </span>
      {canAdd ? (
        <>
          <h2 className="text-subheading font-medium">No servers yet</h2>
          <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">
            Connect a server over SSH and Morcheh will start watching it and the
            services it runs.
          </p>
          <Link
            href="/servers"
            className={buttonVariants({ className: "mt-6" })}
          >
            Add a server
          </Link>
        </>
      ) : (
        <>
          <h2 className="text-subheading font-medium">Your servers</h2>
          <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">
            Everything shared with you is on the Servers page. Ask an admin or
            the workspace owner if something is missing.
          </p>
          <Link
            href="/servers"
            className={buttonVariants({
              variant: "outline",
              className: "mt-6",
            })}
          >
            Open Servers
          </Link>
        </>
      )}
    </section>
  )
}
