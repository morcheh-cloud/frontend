import { Server } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/panel/page-header"
import { buttonVariants } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Home",
}

// Placeholders until the backend exposes these counts.
const stats = [
  { label: "Servers", value: "—" },
  { label: "Services", value: "—" },
  { label: "Open alerts", value: "—" },
]

export default function HomePage() {
  return (
    <>
      <PageHeader
        title="Home"
        guide="getting-started"
        description="Your servers and the services running on them, at a glance."
      />

      <div className="flex w-full flex-col gap-4 px-4 py-5 md:gap-6 md:px-6">
        <dl className="grid grid-cols-3 gap-3 md:gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-6"
            >
              <dt className="text-body-sm text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="mt-2 text-heading font-light">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <section className="flex flex-col items-center rounded-2xl border border-dashed border-mist px-6 py-12 text-center md:py-20">
          <span className="mb-4 flex size-11 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Server className="size-5" strokeWidth={1.75} />
          </span>
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
        </section>
      </div>
    </>
  )
}
