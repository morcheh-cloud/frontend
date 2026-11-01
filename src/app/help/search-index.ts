import { isValidElement } from "react"

import { guides } from "@/components/help/guides"
import { content } from "./content"

// Plain-text copy of every guide, built on the server from the guide JSX
// (props are walked, nothing is rendered) and handed to the search.

export type IndexedSection = { id: string; title: string; text: string }

export type IndexedGuide = {
  slug: string
  title: string
  summary: string
  group: string
  keywords: string[]
  minutes: number
  sections: IndexedSection[]
}

// Props that hold no reader-facing words.
const skip = new Set(["href", "className", "guide", "section"])

function textOf(node: unknown): string {
  if (node == null || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return `${node}`
  if (Array.isArray(node)) return node.map(textOf).join(" ")
  if (isValidElement(node)) {
    return Object.entries(node.props as Record<string, unknown>)
      .filter(([key]) => !skip.has(key))
      .map(([, value]) => textOf(value))
      .join(" ")
  }
  if (typeof node === "object") return Object.values(node).map(textOf).join(" ")
  return ""
}

const clean = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .replace(/ ([.,:;!?)])/g, "$1")
    .trim()

export const helpIndex: IndexedGuide[] = guides.map((guide) => {
  const sections = (content[guide.slug] ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    text: clean(textOf(s.body)),
  }))
  const words = sections.reduce((n, s) => n + s.text.split(" ").length, 0)
  return {
    slug: guide.slug,
    title: guide.title,
    summary: guide.summary,
    group: guide.group,
    keywords: guide.keywords,
    minutes: Math.max(1, Math.round(words / 220)),
    sections,
  }
})

export function indexFor(slug: string) {
  return helpIndex.find((g) => g.slug === slug)
}
