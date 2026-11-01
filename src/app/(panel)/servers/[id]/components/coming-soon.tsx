"use client"

import { Check } from "lucide-react"

import { SectionHeader } from "./section-header"
import { useServerPage } from "./server-page"

// What a section that isn't built yet will do, so its place in the nav is
// already meaningful.
export function ComingSoon() {
  const { section } = useServerPage()
  const Icon = section.icon

  return (
    <>
      <SectionHeader />
      <div className="flex flex-col items-center px-6 py-16 text-center md:rounded-2xl md:border md:border-dashed md:border-mist md:py-20">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
          <Icon className="size-5" />
        </span>
        <p className="mt-4 font-label text-caption tracking-label text-ash uppercase">
          Coming soon
        </p>
        <h3 className="mt-1 text-body font-medium">{section.label}</h3>
        <p className="mt-1 max-w-md text-body-sm text-muted-foreground">
          {section.summary}
        </p>
        {section.planned && (
          <ul className="mt-6 flex max-w-md flex-col gap-2 text-start text-body-sm">
            {section.planned.map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-ash" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
