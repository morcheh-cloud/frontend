import { memo, useMemo } from "react"

// ansible-playbook's output with its colors (SGR codes) as styled spans,
// using the terminal tokens. Anything else (cursor moves…) is dropped.

type Style = { fg?: string; bold?: boolean; dim?: boolean }
type Span = Style & { text: string }

const NAMES = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
]

// biome-ignore lint/suspicious/noControlCharactersInRegex: matching escape codes
const ESC = /\x1b\[([0-9;?]*)([A-Za-z])|\x1b[()][A-Za-z0-9]|\x1b[=>]|\r(?!\n)/g

function apply(style: Style, params: string): Style {
  const codes = params === "" ? [0] : params.split(";").map(Number)
  let s = { ...style }
  for (let i = 0; i < codes.length; i++) {
    const c = codes[i]
    if (c === 0) s = {}
    else if (c === 1) s.bold = true
    else if (c === 2) s.dim = true
    else if (c === 22) s.bold = s.dim = false
    else if (c >= 30 && c <= 37) s.fg = `var(--term-${NAMES[c - 30]})`
    else if (c >= 90 && c <= 97) s.fg = `var(--term-bright-${NAMES[c - 90]})`
    else if (c === 39) s.fg = undefined
    else if (c === 38 && codes[i + 1] === 5) {
      const n = codes[i + 2]
      if (n < 8) s.fg = `var(--term-${NAMES[n]})`
      else if (n < 16) s.fg = `var(--term-bright-${NAMES[n - 8]})`
      i += 2
    } else if (c === 38 && codes[i + 1] === 2) i += 4
  }
  return s
}

// Lines of spans; the style carries over line ends like a terminal's does.
export function parseAnsi(text: string): Span[][] {
  const lines: Span[][] = [[]]
  let style: Style = {}
  const push = (t: string) => {
    const parts = t.split("\n")
    parts.forEach((p, i) => {
      if (i > 0) lines.push([])
      if (p) lines[lines.length - 1].push({ ...style, text: p })
    })
  }
  let last = 0
  for (const m of text.matchAll(ESC)) {
    push(text.slice(last, m.index))
    last = (m.index ?? 0) + m[0].length
    if (m[2] === "m") style = apply(style, m[1])
  }
  push(text.slice(last))
  return lines
}

export function stripAnsi(text: string) {
  return text.replace(ESC, "")
}

const BLOCK = 200

const Block = memo(function Block({ text }: { text: string }) {
  const lines = useMemo(() => parseAnsi(text), [text])
  return lines.map((line, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: lines never reorder
    <div key={i} className="min-h-[1lh]">
      {line.map((s, j) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: spans never reorder
          key={j}
          style={s.fg ? { color: s.fg } : undefined}
          className={
            s.bold ? "font-semibold" : s.dim ? "opacity-70" : undefined
          }
        >
          {s.text}
        </span>
      ))}
    </div>
  ))
})

// Split into blocks of lines so streaming re-renders only the last one. A
// block's colors start fresh, which suits Ansible: it resets after each line.
export function AnsiText({ text }: { text: string }) {
  const blocks = useMemo(() => {
    const lines = text.split("\n")
    if (lines.at(-1) === "") lines.pop()
    const out: string[] = []
    for (let i = 0; i < lines.length; i += BLOCK) {
      out.push(lines.slice(i, i + BLOCK).join("\n"))
    }
    return out
  }, [text])
  return blocks.map((b, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: blocks only grow at the end
    <Block key={i} text={b} />
  ))
}
