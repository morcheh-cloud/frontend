import { ChevronLeft, ChevronRight, Clock, ListTree } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { guideFor, guideHref, guides } from "@/components/help/guides"
import { cn } from "@/lib/utils"
import {
  ArticleBar,
  InlineToc,
  JumpFlash,
  ReadingProgress,
  SectionHeading,
  Toc,
} from "../components/article-parts"
import { content } from "../content"
import { RememberGuide } from "../recent"
import { indexFor } from "../search-index"

// Every slug is prerendered; a guide waits for its params, so it can block.
export const instant = false

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({
  params,
}: PageProps<"/help/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const guide = guideFor(slug)
  return guide
    ? { title: `${guide.title} · Help`, description: guide.summary }
    : {}
}

export default async function GuidePage({ params }: PageProps<"/help/[slug]">) {
  const { slug } = await params
  const guide = guideFor(slug)
  const sections = content[slug]
  if (!guide || !sections) notFound()

  const index = guides.indexOf(guide)
  const prev = guides[index - 1]
  const next = guides[index + 1]
  const entries = sections.map((s) => ({ id: s.id, title: s.title }))
  const Icon = guide.icon

  return (
    <>
      <ArticleBar title={guide.title} entries={entries} />
      <ReadingProgress />
      <JumpFlash />
      <RememberGuide slug={slug} />

      <div className="mx-auto flex w-full max-w-[88rem] flex-1 md:px-6">
        <GuideNav active={slug} />

        <main className="min-w-0 flex-1 px-4 pt-2 pb-[calc(--spacing(16)+env(safe-area-inset-bottom))] md:px-10 md:pt-12 md:pb-24 xl:px-14">
          <article className="mx-auto flex max-w-3xl flex-col gap-12">
            <header className="flex flex-col">
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1.5 text-body-sm text-ash"
              >
                <Link href="/help" className="hover:text-foreground">
                  Help
                </Link>
                <ChevronRight className="size-3.5 rtl:rotate-180" />
                <span>{guide.group}</span>
              </nav>
              <div className="mt-4 flex items-center gap-4">
                <span className="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong md:flex">
                  <Icon className="size-6" />
                </span>
                <h1 className="text-heading font-light md:text-heading-lg">
                  {guide.title}
                </h1>
              </div>
              <p className="mt-4 text-body text-muted-foreground md:text-subheading md:font-light">
                {guide.summary}
              </p>
              <div className="mt-5 flex items-center gap-4 text-body-sm text-ash">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4" />
                  {indexFor(slug)?.minutes ?? 1} min read
                </span>
                <span className="flex items-center gap-1.5">
                  <ListTree className="size-4" />
                  {sections.length}{" "}
                  {sections.length === 1 ? "section" : "sections"}
                </span>
              </div>
              <div className="mt-6 hidden md:block xl:hidden">
                <InlineToc entries={entries} />
              </div>
            </header>

            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="-mx-4 flex scroll-mt-[calc(3.5rem+env(safe-area-inset-top))] flex-col gap-4 rounded-2xl px-4 data-flash:animate-[help-flash_1.8s_ease-out] md:-mx-5 md:scroll-mt-20 md:px-5"
              >
                <SectionHeading id={section.id} title={section.title} />
                {section.body}
              </section>
            ))}

            <nav
              aria-label="More guides"
              className="grid gap-3 border-t border-border pt-8 sm:grid-cols-2"
            >
              {prev && <Neighbour slug={prev.slug} dir="prev" />}
              {next && <Neighbour slug={next.slug} dir="next" />}
            </nav>
          </article>
        </main>

        <aside className="sticky top-14 hidden max-h-[calc(100dvh-3.5rem)] w-60 shrink-0 self-start overflow-y-auto py-12 xl:block">
          <Toc entries={entries} />
        </aside>
      </div>
    </>
  )
}

// Desktop: every guide, grouped, with the open one marked.
function GuideNav({ active }: { active: string }) {
  const groups = [...new Set(guides.map((g) => g.group))]
  return (
    <aside className="sticky top-14 hidden max-h-[calc(100dvh-3.5rem)] w-60 shrink-0 self-start overflow-y-auto border-e border-border py-10 pe-4 md:block">
      <nav aria-label="Guides" className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group} className="flex flex-col gap-1">
            <p className="px-2.5 pb-1 font-label text-caption tracking-label text-ash uppercase">
              {group}
            </p>
            {guides
              .filter((g) => g.group === group)
              .map((g) => {
                const Icon = g.icon
                const current = g.slug === active
                return (
                  <Link
                    key={g.slug}
                    href={guideHref(g.slug)}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-body-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      current
                        ? "bg-brand-soft font-medium text-brand-strong"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        current ? "text-brand" : "text-ash",
                      )}
                    />
                    <span className="truncate">{g.title}</span>
                  </Link>
                )
              })}
          </div>
        ))}
      </nav>
    </aside>
  )
}

function Neighbour({ slug, dir }: { slug: string; dir: "prev" | "next" }) {
  const guide = guideFor(slug)
  if (!guide) return null
  const next = dir === "next"
  return (
    <Link
      href={guideHref(slug)}
      className={cn(
        "group flex items-center gap-4 rounded-2xl border border-border p-4 transition-[box-shadow,border-color] outline-none hover:border-mist hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-muted md:p-5",
        next && "flex-row-reverse text-end sm:col-start-2",
      )}
    >
      {next ? (
        <ChevronRight className="size-5 shrink-0 text-ash transition-colors group-hover:text-brand rtl:rotate-180" />
      ) : (
        <ChevronLeft className="size-5 shrink-0 text-ash transition-colors group-hover:text-brand rtl:rotate-180" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-caption text-ash">
          {next ? "Next" : "Previous"}
        </span>
        <span className="block truncate font-medium">{guide.title}</span>
        <span className="mt-0.5 block truncate text-body-sm text-muted-foreground">
          {guide.summary}
        </span>
      </span>
    </Link>
  )
}
