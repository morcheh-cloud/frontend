import { ArrowRight, ChevronRight } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { type GuideMeta, guideHref, guides } from "@/components/help/guides"
import {
  HeroSearch,
  PhoneHomeBar,
  RecentGuides,
  SearchShortcut,
  Topic,
} from "./components/home-parts"
import { indexFor } from "./search-index"

export const metadata: Metadata = {
  title: "Help",
}

const topics = [
  "Add a server",
  "SSH key",
  "Upload files",
  "Permissions",
  "Backups",
  "Ban an IP",
  "sudo",
  "Logs",
  "Reboot",
]

const groups = [...new Set(guides.map((g) => g.group))]

export default function HelpHome() {
  return (
    <main className="flex flex-1 flex-col pb-[calc(--spacing(12)+env(safe-area-inset-bottom))] md:pb-0">
      <PhoneHomeBar />

      <section className="border-border md:border-b md:bg-subtle">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pt-4 md:items-center md:gap-0 md:px-6 md:py-20 md:text-center">
          <p className="hidden font-label text-caption tracking-label text-brand uppercase md:block">
            Help center
          </p>
          <h1 className="hidden text-heading-lg font-light md:mt-3 md:block">
            How can we help?
          </h1>
          <p className="hidden max-w-xl text-body text-muted-foreground md:mt-4 md:block">
            Every part of Morche, explained with steps, real examples and the
            settings we recommend.
          </p>
          <div className="w-full md:mt-8 md:max-w-2xl">
            <HeroSearch />
          </div>
          <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 md:mx-0 md:mt-5 md:flex-wrap md:justify-center md:overflow-visible md:px-0">
            <span className="hidden h-8 items-center text-body-sm text-ash md:flex">
              Popular:
            </span>
            {topics.map((t) => (
              <Topic key={t} query={t} />
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-10 pt-8 md:gap-14 md:px-6 md:pt-14 md:pb-24">
        <RecentGuides />

        {groups.map((group) => {
          const list = guides.filter((g) => g.group === group)
          return (
            <section key={group} className="flex flex-col gap-2 md:gap-4">
              <div className="flex items-baseline justify-between px-4 md:px-0">
                <h2 className="font-label text-caption tracking-label text-ash uppercase md:font-sans md:text-subheading md:font-medium md:tracking-normal md:text-foreground md:normal-case">
                  {group}
                </h2>
                <span className="hidden text-body-sm text-ash md:inline">
                  {list.length} {list.length === 1 ? "guide" : "guides"}
                </span>
              </div>
              <ul className="divide-y divide-border border-y border-border md:grid md:grid-cols-2 md:gap-4 md:divide-y-0 md:border-0 lg:grid-cols-3">
                {list.map((guide) => (
                  <li key={guide.slug}>
                    <GuideCard guide={guide} />
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        <p className="hidden items-center justify-center gap-2 border-t border-border pt-10 text-body-sm text-muted-foreground md:flex">
          Looking for something specific? Press
          <SearchShortcut />
          or
          <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-muted px-1 text-xs font-medium">
            /
          </kbd>
          to search every guide.
        </p>
      </div>
    </main>
  )
}

function GuideCard({ guide }: { guide: GuideMeta }) {
  const Icon = guide.icon
  const meta = indexFor(guide.slug)
  const sections = meta?.sections ?? []
  return (
    <Link
      href={guideHref(guide.slug)}
      className="group flex h-full items-center gap-4 px-4 py-3 outline-none active:bg-muted md:flex-col md:items-stretch md:gap-0 md:rounded-2xl md:border md:border-border md:bg-card md:p-6 md:transition-[box-shadow,border-color] md:hover:border-mist md:hover:shadow-md md:focus-visible:ring-3 md:focus-visible:ring-ring/50 md:active:bg-card"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1 md:mt-4">
        <span className="block text-body font-medium">{guide.title}</span>
        <span className="mt-0.5 block text-body-sm text-muted-foreground max-md:line-clamp-2 md:mt-1.5">
          {guide.summary}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-ash md:hidden rtl:rotate-180" />

      <span className="mt-5 hidden items-center gap-2 border-t border-border pt-4 text-caption tracking-normal text-ash md:flex">
        <span>
          {sections.length} {sections.length === 1 ? "topic" : "topics"}
        </span>
        <span aria-hidden>·</span>
        <span>{meta?.minutes ?? 1} min read</span>
        <ArrowRight className="ms-auto size-4 -translate-x-1 opacity-0 transition-[opacity,translate] group-hover:translate-x-0 group-hover:text-brand group-hover:opacity-100 rtl:rotate-180" />
      </span>
    </Link>
  )
}
