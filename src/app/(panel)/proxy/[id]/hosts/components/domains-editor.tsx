"use client"

import {
  ArrowUpToLine,
  Asterisk,
  Copy,
  Globe,
  Lock,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react"
import { type ClipboardEvent, type KeyboardEvent, useState } from "react"

import { FieldError } from "@/app/(panel)/cronjobs/components/editor-parts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Certificate } from "@/lib/services"
import { cn } from "@/lib/utils"
import { copyText } from "../../../components/proxy-actions"
import { covers, domainList } from "./draft"

// The same rule the backend checks: a name (a leading *. allowed) or an
// IP address.
const domainRe =
  /^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/
const ipRe = /^(\d{1,3}(\.\d{1,3}){3}|[0-9a-f:]+:[0-9a-f:.]*)$/

export const tidyDomain = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")

export const validDomain = (d: string) =>
  d.length <= 253 && (domainRe.test(d) || ipRe.test(d))

// Where else a name is answered: another site of this proxy, or a server
// block written by hand on the server.
export type DomainUse = { label: string; where: string }

// The www / bare twin of the first name, when it's missing.
function suggestion(domains: string[]) {
  const first = domains.find((d) => !d.startsWith("*.") && !ipRe.test(d))
  if (!first) return undefined
  const parts = first.split(".")
  const twin = first.startsWith("www.")
    ? first.slice(4)
    : parts.length === 2
      ? `www.${first}`
      : undefined
  return twin && !domains.includes(twin) ? twin : undefined
}

// The site's names as a list: the first is the main one (titles, links),
// each shows whether a certificate on the server covers it and whether
// something else answers it already.
export function DomainsEditor({
  value,
  onChange,
  certs,
  usedElsewhere,
  serverHost,
  error,
  readOnly,
  phone,
}: {
  // One name per line, as the draft keeps it.
  value: string
  onChange: (value: string) => void
  certs: Certificate[]
  usedElsewhere: (domain: string) => DomainUse | undefined
  serverHost: string
  error?: string
  readOnly: boolean
  phone: boolean
}) {
  const domains = domainList(value)
  const [text, setText] = useState("")
  const [problem, setProblem] = useState("")
  const write = (list: string[]) => onChange(list.join("\n"))

  // Adds every name in the text; keeps what couldn't be added in the box.
  function add(raw: string) {
    const names = raw
      .split(/[\s,;]+/)
      .map(tidyDomain)
      .filter(Boolean)
    if (names.length === 0) return
    const next = [...domains]
    const bad: string[] = []
    let dup = ""
    for (const n of names) {
      if (!validDomain(n)) bad.push(n)
      else if (next.includes(n)) dup = n
      else next.push(n)
    }
    if (next.length !== domains.length) write(next)
    setText(bad.join(" "))
    setProblem(
      bad.length
        ? `${bad[0]} isn't a domain name. Use letters, digits, dots and dashes, like app.example.com.`
        : dup && names.length === 1
          ? `${dup} is already in the list.`
          : "",
    )
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || (e.key === " " && text)) {
      e.preventDefault()
      add(text)
    } else if (e.key === "Backspace" && !text && domains.length > 0) {
      // An empty box: Backspace takes the last name back to edit it.
      e.preventDefault()
      const last = domains[domains.length - 1]
      write(domains.slice(0, -1))
      setText(last)
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text")
    if (/[\s,;]/.test(pasted.trim())) {
      e.preventDefault()
      add(`${text} ${pasted}`)
    }
  }

  const remove = (d: string) => write(domains.filter((x) => x !== d))
  const makeMain = (d: string) => write([d, ...domains.filter((x) => x !== d)])
  const twin = readOnly ? undefined : suggestion(domains)
  const touch = phone ? "size-11" : "size-8"

  return (
    <div className="flex flex-col gap-3">
      {domains.length > 0 && (
        <ul
          aria-label="Domains"
          className={cn(
            "flex flex-col divide-y divide-border",
            phone ? "-mx-4 border-y border-border" : "rounded-lg border",
          )}
        >
          {domains.map((d, i) => {
            const wildcard = d.startsWith("*.")
            const cert = certs.find((c) => covers(c, d))
            const other = usedElsewhere(d)
            const Icon = wildcard ? Asterisk : Globe
            return (
              <li
                key={d}
                className={cn(
                  "flex items-center gap-3",
                  phone ? "min-h-14 ps-4 pe-1" : "min-h-12 ps-3 pe-1.5",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    i === 0
                      ? "bg-brand-soft text-brand-strong"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1 py-2">
                  <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate font-mono text-body-sm">{d}</span>
                    {i === 0 && domains.length > 1 && (
                      <Tag tone="brand">Main</Tag>
                    )}
                    {wildcard && <Tag>Every name under it</Tag>}
                    {cert && (
                      <Tag>
                        <Lock className="size-3" />
                        Certificate
                      </Tag>
                    )}
                  </p>
                  {other && (
                    <p className="mt-0.5 flex items-start gap-1.5 text-caption text-warning">
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                      <span className="min-w-0">
                        Also answered by {other.label}
                        <span className="text-muted-foreground">
                          {" "}
                          · {other.where}
                        </span>
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center">
                  {!phone && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={touch}
                      aria-label={`Copy ${d}`}
                      onClick={() => copyText(d, "Domain")}
                    >
                      <Copy />
                    </Button>
                  )}
                  {!readOnly && i > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={touch}
                      aria-label={`Make ${d} the main name`}
                      title="Make it the main name"
                      onClick={() => makeMain(d)}
                    >
                      <ArrowUpToLine />
                    </Button>
                  )}
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(touch, "hover:text-destructive")}
                      aria-label={`Remove ${d}`}
                      onClick={() => remove(d)}
                    >
                      <X />
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!readOnly && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Plus className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ash" />
              <Input
                aria-label="Add a domain"
                aria-invalid={!!problem || (!!error && domains.length === 0)}
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  setProblem("")
                }}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                onBlur={() => text.trim() && add(text)}
                placeholder={
                  domains.length
                    ? "Add another name"
                    : "Add a domain, like app.example.com"
                }
                enterKeyHint="done"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="ps-9 font-mono"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 md:h-9"
              disabled={!text.trim()}
              onClick={() => add(text)}
            >
              Add
            </Button>
          </div>
          {problem ? (
            <FieldError text={problem} />
          ) : (
            <p className="text-caption text-ash">
              Enter or a comma adds it. Paste a list to add them all.
              *.example.com covers every name one level under it.
            </p>
          )}
        </div>
      )}

      {twin && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption text-muted-foreground">
            Visitors often type the other one too:
          </span>
          <button
            type="button"
            onClick={() => write([...domains, twin])}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-mist px-3 font-mono text-caption text-muted-foreground outline-none hover:border-brand hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 max-md:h-11"
          >
            <Plus className="size-3.5" />
            {twin}
          </button>
        </div>
      )}

      {error && <FieldError text={error} />}

      {domains.length > 0 && (
        <p className="text-caption text-muted-foreground">
          Point each name's DNS (an A or AAAA record) at{" "}
          <button
            type="button"
            onClick={() => copyText(serverHost, "Address")}
            className="rounded font-mono text-foreground outline-none hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50"
            title="Copy"
          >
            {serverHost}
          </button>
          , the proxy's server.
        </p>
      )}
    </div>
  )
}

function Tag({
  tone,
  children,
}: {
  tone?: "brand"
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-caption",
        tone === "brand"
          ? "bg-brand-soft text-brand-strong"
          : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  )
}
