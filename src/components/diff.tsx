"use client"

import { cn } from "@/lib/utils"

export type DiffLine = { kind: " " | "+" | "-" | "@"; text: string }

// Lines added and removed, with 2 lines of context around each change.
export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.split("\n")
  const b = after.split("\n")
  if (a.at(-1) === "") a.pop()
  if (b.at(-1) === "") b.pop()
  let all: DiffLine[]
  if (a.length * b.length > 4_000_000) {
    all = [
      ...a.map((text) => ({ kind: "-" as const, text })),
      ...b.map((text) => ({ kind: "+" as const, text })),
    ]
  } else {
    // Longest common subsequence, walked from the end.
    const n = a.length
    const m = b.length
    const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] =
          a[i] === b[j]
            ? dp[i + 1][j + 1] + 1
            : Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
    all = []
    let i = 0
    let j = 0
    while (i < n && j < m) {
      if (a[i] === b[j]) {
        all.push({ kind: " ", text: a[i] })
        i++
        j++
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        all.push({ kind: "-", text: a[i++] })
      } else {
        all.push({ kind: "+", text: b[j++] })
      }
    }
    while (i < n) all.push({ kind: "-", text: a[i++] })
    while (j < m) all.push({ kind: "+", text: b[j++] })
  }
  const keep = all.map(() => false)
  all.forEach((l, i) => {
    if (l.kind === " ") return
    for (
      let k = Math.max(0, i - 2);
      k <= Math.min(all.length - 1, i + 2);
      k++
    ) {
      keep[k] = true
    }
  })
  const out: DiffLine[] = []
  let skipped = false
  all.forEach((l, i) => {
    if (keep[i]) {
      if (skipped && out.length > 0) out.push({ kind: "@", text: "⋯" })
      skipped = false
      out.push(l)
    } else skipped = true
  })
  return out
}

// Lines a diff shows, coloured; `mask` hides what's after = (a .env).
export function DiffLines({
  lines,
  mask,
  className,
}: {
  lines: DiffLine[]
  mask?: boolean
  className?: string
}) {
  return (
    <pre
      className={cn(
        "overflow-auto rounded-lg bg-muted py-2 font-mono text-caption",
        className,
      )}
    >
      {lines.map((l, j) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static lines
          key={j}
          className={cn(
            "px-2 break-all whitespace-pre-wrap",
            l.kind === "+" && "bg-success/10 text-success",
            l.kind === "-" && "bg-destructive/10 text-destructive",
            l.kind === "@" && "text-ash",
          )}
        >
          {l.kind === "@"
            ? l.text
            : `${l.kind} ${mask ? maskValue(l.text) : l.text}`}
        </div>
      ))}
    </pre>
  )
}

// NAME=secret → NAME=•••• (comments and blank lines stay).
export function maskValue(line: string) {
  if (/^\s*(#|$)/.test(line)) return line
  const i = line.indexOf("=")
  return i < 0
    ? line
    : `${line.slice(0, i + 1)}${line.length > i + 1 ? "••••" : ""}`
}
