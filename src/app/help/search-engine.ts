import { guideHref } from "@/components/help/guides"
import type { IndexedGuide } from "./search-index"

// Client-side ranking over the help index. Every word of the query must
// appear; titles outrank keywords, keywords outrank body text, and a match at
// the start of a word outranks one inside it.

export type Hit =
  | {
      kind: "guide"
      key: string
      href: string
      slug: string
      title: string
      summary: string
      score: number
    }
  | {
      kind: "section"
      key: string
      href: string
      slug: string
      id: string
      guide: string
      title: string
      snippet: string
      score: number
    }

export function terms(query: string) {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

// 0 = absent, 1 = inside a word, 2 = at a word start.
function weight(haystack: string, term: string) {
  if (!haystack.includes(term)) return 0
  return new RegExp(`(^|[^a-z0-9])${escape(term)}`).test(haystack) ? 2 : 1
}

export function escape(term: string) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// ~160 characters of `text` around the first matching word.
function snippet(text: string, words: string[]) {
  const lower = text.toLowerCase()
  const first = Math.min(
    ...words.map((w) => lower.indexOf(w)).filter((i) => i >= 0),
  )
  if (!Number.isFinite(first)) return text.slice(0, 160)
  let start = Math.max(0, first - 50)
  if (start > 0) start = text.indexOf(" ", start) + 1 || start
  const end = Math.min(text.length, start + 160)
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`
}

export function searchHelp(index: IndexedGuide[], query: string): Hit[] {
  const words = terms(query)
  if (!words.length) return []
  const guides: Hit[] = []
  const sections: Hit[] = []

  for (const g of index) {
    const title = g.title.toLowerCase()
    const keys = g.keywords.join(" · ").toLowerCase()
    const summary = g.summary.toLowerCase()

    const guideScores = words.map(
      (w) => 12 * weight(title, w) + 6 * weight(keys, w) + 2 * weight(summary, w),
    )
    if (guideScores.every((s) => s > 0)) {
      guides.push({
        kind: "guide",
        key: g.slug,
        href: guideHref(g.slug),
        slug: g.slug,
        title: g.title,
        summary: g.summary,
        score: guideScores.reduce((a, b) => a + b, 0),
      })
    }

    for (const s of g.sections) {
      const head = s.title.toLowerCase()
      const body = s.text.toLowerCase()
      let own = false
      let score = 0
      let all = true
      for (const w of words) {
        const inHead = weight(head, w)
        const inBody = weight(body, w)
        const inGuide = weight(title, w) || weight(keys, w)
        if (!inHead && !inBody && !inGuide) {
          all = false
          break
        }
        if (inHead || inBody) own = true
        score += 8 * inHead + 2 * inBody + 2 * inGuide
      }
      if (!all || !own) continue
      sections.push({
        kind: "section",
        key: `${g.slug}#${s.id}`,
        href: guideHref(g.slug, s.id),
        slug: g.slug,
        id: s.id,
        guide: g.title,
        title: s.title,
        snippet: snippet(s.text, words),
        score,
      })
    }
  }

  const byScore = (a: Hit, b: Hit) => b.score - a.score
  return [...guides.sort(byScore).slice(0, 4), ...sections.sort(byScore)].slice(
    0,
    40,
  )
}
