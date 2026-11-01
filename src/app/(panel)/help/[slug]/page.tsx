import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { guideFor, guideHref, guides } from "@/components/help/guides"
import { ArticleChrome } from "../components/article-chrome"
import { content } from "../content"

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({
  params,
}: PageProps<"/help/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const guide = guideFor(slug)
  return guide ? { title: `${guide.title} · Help` } : {}
}

export default async function GuidePage({ params }: PageProps<"/help/[slug]">) {
  const { slug } = await params
  const guide = guideFor(slug)
  const sections = content[slug]
  if (!guide || !sections) notFound()

  const index = guides.indexOf(guide)
  const prev = guides[index - 1]
  const next = guides[index + 1]

  return (
    <>
      <ArticleChrome href={guideHref(slug)} title={guide.title} />
      <div className="flex w-full gap-12 px-4 pt-5 pb-24 md:px-6 md:pt-8">
        <article className="flex max-w-3xl min-w-0 flex-1 flex-col gap-10">
          <header>
            <p className="font-label text-caption tracking-label text-ash uppercase">
              {guide.group}
            </p>
            <h1 className="mt-1 text-heading font-light">{guide.title}</h1>
            <p className="mt-2 text-body text-muted-foreground">
              {guide.summary}
            </p>
          </header>

          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="flex scroll-mt-20 flex-col gap-4"
            >
              <h2 className="text-subheading font-medium">{section.title}</h2>
              {section.body}
            </section>
          ))}

          <nav
            aria-label="More guides"
            className="grid gap-3 border-t border-border pt-6 sm:grid-cols-2"
          >
            {prev && (
              <Link
                href={guideHref(prev.slug)}
                className="flex items-center gap-3 rounded-2xl border border-border p-4 hover:bg-subtle"
              >
                <ChevronLeft className="size-4 shrink-0 text-ash rtl:rotate-180" />
                <span className="min-w-0">
                  <span className="block text-caption text-ash">Previous</span>
                  <span className="block truncate font-medium">
                    {prev.title}
                  </span>
                </span>
              </Link>
            )}
            {next && (
              <Link
                href={guideHref(next.slug)}
                className="flex items-center justify-end gap-3 rounded-2xl border border-border p-4 text-end hover:bg-subtle sm:col-start-2"
              >
                <span className="min-w-0">
                  <span className="block text-caption text-ash">Next</span>
                  <span className="block truncate font-medium">
                    {next.title}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
              </Link>
            )}
          </nav>
        </article>

        <aside className="sticky top-[calc(3rem+1px+--spacing(8))] hidden w-56 shrink-0 self-start lg:block">
          <p className="font-label text-caption tracking-label text-ash uppercase">
            On this page
          </p>
          <ul className="mt-3 flex flex-col gap-1 border-s border-border text-body-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="-ms-px block border-s border-transparent py-1 ps-3 text-muted-foreground hover:border-mist hover:text-foreground"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  )
}
