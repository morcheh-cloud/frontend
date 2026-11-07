"use client"

import type { ComponentProps } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

// Text people wrote (server notes…) as GitHub-flavoured Markdown. Raw HTML is
// never rendered, and react-markdown drops javascript: and other unsafe URLs.
export function Markdown({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "min-w-0 text-body-sm break-words text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

function Anchor({ href, children, ...rest }: ComponentProps<"a">) {
  const external = !!href && /^(https?:|mailto:)/i.test(href)
  return (
    <a
      {...rest}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="text-brand underline-offset-2 hover:underline"
    >
      {children}
    </a>
  )
}

const components: Components = {
  h1: ({ node: _, ...p }) => (
    <h3 className="mt-5 mb-2 text-body font-medium" {...p} />
  ),
  h2: ({ node: _, ...p }) => (
    <h4 className="mt-5 mb-2 text-body font-medium" {...p} />
  ),
  h3: ({ node: _, ...p }) => (
    <h5 className="mt-4 mb-1.5 text-body-sm font-medium" {...p} />
  ),
  h4: ({ node: _, ...p }) => (
    <h6 className="mt-4 mb-1.5 text-body-sm font-medium" {...p} />
  ),
  p: ({ node: _, ...p }) => <p className="my-2" {...p} />,
  a: ({ node: _, ...p }) => <Anchor {...p} />,
  ul: ({ node: _, ...p }) => (
    <ul className="my-2 list-disc ps-5 [&_ul]:my-0.5" {...p} />
  ),
  ol: ({ node: _, ...p }) => (
    <ol className="my-2 list-decimal ps-5 [&_ol]:my-0.5" {...p} />
  ),
  li: ({ node: _, className, ...p }) => (
    <li
      className={cn(
        "my-0.5",
        // Task lists: the checkbox replaces the bullet.
        className?.includes("task-list-item") && "-ms-5 list-none",
      )}
      {...p}
    />
  ),
  input: ({ node: _, ...p }) => (
    <input {...p} disabled className="me-1.5 align-middle accent-brand" />
  ),
  blockquote: ({ node: _, ...p }) => (
    <blockquote
      className="my-3 border-s-2 border-mist ps-3 text-muted-foreground"
      {...p}
    />
  ),
  hr: () => <hr className="my-4 border-border" />,
  pre: ({ node: _, ...p }) => (
    <pre
      className="my-3 overflow-x-auto rounded-lg bg-subtle p-3 font-mono text-caption [&_code]:bg-transparent [&_code]:p-0"
      {...p}
    />
  ),
  code: ({ node: _, ...p }) => (
    <code
      className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
      {...p}
    />
  ),
  table: ({ node: _, ...p }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-start" {...p} />
    </div>
  ),
  th: ({ node: _, ...p }) => (
    <th
      className="border-b border-border px-2 py-1.5 text-start font-medium"
      {...p}
    />
  ),
  td: ({ node: _, ...p }) => (
    <td className="border-b border-border px-2 py-1.5 align-top" {...p} />
  ),
  img: ({ node: _, alt }) => (
    // Images from anywhere would leak who reads the note: show the alt text.
    <span className="text-ash">[{alt || "image"}]</span>
  ),
}
