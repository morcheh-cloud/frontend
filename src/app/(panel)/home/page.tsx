import type { Metadata } from "next"

import { PageHeader } from "@/components/panel/page-header"
import { HomeEmpty } from "./components/home-empty"

export const metadata: Metadata = {
  title: "Home",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

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

        <HomeEmpty />
      </div>
    </>
  )
}
