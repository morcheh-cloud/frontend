"use client"

import { EditorView } from "@uiw/react-codemirror"
import {
  CircleCheck,
  CircleX,
  Copy,
  CornerDownRight,
  EyeOff,
  FileCode,
  FlaskConical,
  Lightbulb,
  PencilLine,
  RotateCcw,
  TriangleAlert,
} from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import {
  Callout,
  FieldError,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import type {
  HostConfig,
  ProxyHost,
  Proxy as ReverseProxy,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useTestHost } from "../../../api"
import { copyText } from "../../../components/proxy-actions"
import { type Draft, type Errors, problemsToErrors } from "./draft"
import { NginxCode } from "./nginx-code"
import { PreviewBody, useConfigPreview } from "./preview"

// The same checks the backend makes before it takes a hand-written file,
// run as you type: blocks and quotes closed, no words Morcheh keeps for
// itself. nginx -t (Test, Save) checks the rest.
export function checkConfig(text: string): string {
  const lines = text.split("\n")
  let depth = 0
  let quote = ""
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*MORCHEH_/.test(line) || line.includes("@@morcheh-")) {
      return `Line ${i + 1} starts with a word Morcheh keeps for itself (MORCHEH_ / @@morcheh-).`
    }
    for (const ch of line) {
      if (quote) {
        if (ch === quote) quote = ""
      } else if (ch === "#") break
      else if (ch === '"' || ch === "'") quote = ch
      else if (ch === "{") depth++
      else if (ch === "}" && --depth < 0) {
        return `Line ${i + 1} closes a block it didn't open.`
      }
    }
  }
  if (quote) return "A quote is never closed."
  if (depth > 0) return "A { is never closed."
  return ""
}

type TestResult = { ok: boolean; output: string; tested: string }

// The line of this site's file nginx -t complains about, if it's this one:
// "... in /etc/nginx/morcheh/hosts/<id>.conf:12". A new site is tested
// under an id of its own, so any file of Morcheh's sites counts then.
function failedLine(output: string, hostId: string | undefined) {
  for (const m of output.matchAll(/in (\S+\.conf):(\d+)/g)) {
    const file = m[1]
    if (hostId ? file.includes(hostId) : file.includes("/morcheh/hosts/")) {
      return Number(m[2])
    }
  }
  return 0
}

// The site's whole file: what Morcheh generates from the other tabs, or a
// file written by hand (at your own risk) that's written instead.
export function ConfigTab({
  proxy: p,
  host,
  draft,
  config,
  set,
  errors,
  onProblems,
  readOnly,
  phone,
}: {
  proxy: ReverseProxy
  host: ProxyHost | undefined
  draft: Draft
  config: HostConfig
  set: (patch: Partial<Draft>) => void
  errors: Errors
  onProblems: (errors: Errors) => void
  readOnly: boolean
  phone: boolean
}) {
  const preview = useConfigPreview(p, host?.id, config)
  const test = useTestHost()
  const [result, setResult] = useState<TestResult>()
  const [askHand, setAskHand] = useOpen("proxy-config-by-hand")
  const [askBack, setAskBack] = useOpen("proxy-config-generated")
  const view = useRef<EditorView | null>(null)
  const label = p.capabilities.config_label || `${p.kind_label} config`
  const custom = draft.custom
  const byHand = custom.trim() !== ""
  const local = byHand ? checkConfig(custom) : ""
  const current = JSON.stringify(config)
  const noDomain = draft.type !== "stream" && config.domains.length === 0

  // Gentle notes on a hand-written file: things Morcheh relies on that it
  // no longer has.
  const notes = useMemo(() => {
    if (!byHand) return []
    const out: string[] = []
    const missing = config.domains.filter((d) => !custom.includes(d))
    if (missing.length) {
      out.push(
        `${missing.join(", ")} ${missing.length === 1 ? "isn't" : "aren't"} in the file. Domains in General only name the site in lists; the file decides what's answered.`,
      )
    }
    if (preview.text.includes("access_log") && !custom.includes("access_log")) {
      out.push(
        "There's no access_log line: live traffic and the Logs tab read the one Morcheh wrote, so they'll stay empty.",
      )
    }
    return out
  }, [byHand, custom, config.domains, preview.text])

  if (host?.redacted) {
    return (
      <div
        className={cn(
          "flex items-start gap-3 text-body-sm text-muted-foreground",
          phone ? "px-4 py-5" : "rounded-2xl border border-border p-6",
        )}
      >
        <EyeOff className="mt-0.5 size-4 shrink-0 text-ash" />
        <p>
          {host.handwritten
            ? "This site's config is written by hand. It's hidden from you, like header values."
            : "The config holds header values, which are hidden from you."}
        </p>
      </div>
    )
  }

  function runTest() {
    if (local) {
      toast.error(local)
      return
    }
    const tested = current
    test.mutate(
      { id: p.id, host: host?.id, config },
      {
        onSuccess: (r) => setResult({ ok: r.ok, output: r.output, tested }),
        onError: (err) => {
          const details =
            err instanceof ApiError ? (err.body?.errors ?? []) : []
          const mapped = problemsToErrors(details, draft)
          if (Object.keys(mapped).length > 0) {
            setResult(undefined)
            onProblems(mapped)
            toast.error(Object.values(mapped)[0])
            return
          }
          setResult({ ok: false, output: err.message, tested })
        },
      },
    )
  }

  const changed = result && result.tested !== current
  const badLine =
    byHand && result && !result.ok ? failedLine(result.output, host?.id) : 0

  // The file is the text trimmed: count the blank lines dropped above it.
  function goToLine(n: number) {
    const v = view.current
    if (!v) return
    const lead = (custom.match(/^\s*/)?.[0] ?? "").split("\n").length - 1
    const line = v.state.doc.line(
      Math.min(Math.max(n + lead, 1), v.state.doc.lines),
    )
    v.dispatch({
      selection: { anchor: line.from, head: line.to },
      effects: EditorView.scrollIntoView(line.from, { y: "center" }),
    })
    v.focus()
  }
  const canTest = !readOnly && !noDomain && !local
  const actions = (
    <>
      {!readOnly && (
        <Button
          variant="outline"
          className={phone ? "h-11 flex-1" : "h-9"}
          disabled={!canTest || test.isPending}
          onClick={runTest}
        >
          <FlaskConical />
          {test.isPending ? "Testing…" : phone ? "Test" : "Test on the server"}
        </Button>
      )}
      {!readOnly &&
        (byHand ? (
          <Button
            variant="outline"
            className={phone ? "h-11 flex-1" : "h-9"}
            onClick={() => setAskBack(true)}
          >
            <RotateCcw />
            {phone ? "Use generated" : "Use the generated one"}
          </Button>
        ) : (
          <Button
            variant="outline"
            className={phone ? "h-11 flex-1" : "h-9"}
            disabled={!preview.ready}
            onClick={() => setAskHand(true)}
          >
            <PencilLine />
            Edit by hand
          </Button>
        ))}
      <Button
        variant="ghost"
        size={phone ? "icon-lg" : "icon"}
        className={phone ? "" : "size-9"}
        aria-label="Copy the config"
        disabled={byHand ? !custom.trim() : !preview.ready}
        onClick={() => copyText(byHand ? custom : preview.text, "Config")}
      >
        <Copy />
      </Button>
    </>
  )

  return (
    <section
      aria-label={label}
      className={cn(
        "flex min-w-0 flex-col gap-4",
        phone ? "px-4 py-5" : "rounded-2xl border border-border p-6",
      )}
    >
      <div
        className={cn(
          "flex gap-3",
          phone ? "flex-col" : "flex-wrap items-center",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              byHand
                ? "bg-warning/10 text-warning"
                : "bg-brand-soft text-brand-strong",
            )}
          >
            {byHand ? (
              <PencilLine className="size-5" />
            ) : (
              <FileCode className="size-5" />
            )}
          </span>
          <div className="min-w-0">
            <h2 className="text-body font-medium">
              {byHand ? "Written by hand" : `Generated ${label}`}
            </h2>
            <p className="text-caption text-muted-foreground">
              {byHand
                ? "Written to the server as it is. The other tabs don't change it."
                : "Made from the other tabs and updated as you change them."}
              <span
                className={cn(
                  "ms-2 text-ash transition-opacity",
                  !(preview.stale && !byHand) && "opacity-0",
                )}
              >
                Updating…
              </span>
            </p>
          </div>
        </div>
        <div className={cn("flex items-center gap-2", phone && "w-full")}>
          {actions}
        </div>
      </div>

      {byHand && (
        <Callout icon={<TriangleAlert />} tone="warning">
          At your own risk: Morcheh no longer checks what's inside, only that
          {` ${p.kind_label} `}accepts it. It's still tested (nginx -t) before
          it's loaded, so a file {p.kind_label} refuses never goes live. Use
          Test to check it on the server first.
        </Callout>
      )}

      {byHand ? (
        <div className="flex flex-col gap-2">
          <NginxCode
            value={custom}
            onChange={readOnly ? undefined : (v) => set({ custom: v })}
            label={label}
            lineNumbers
            onView={(v) => {
              view.current = v
            }}
            className={cn(
              phone ? "min-h-[50svh]" : "min-h-96",
              (local || errors.custom) && "border-destructive",
            )}
          />
          {local ? (
            <p className="flex items-center gap-1.5 text-caption text-destructive">
              <CircleX className="size-3.5 shrink-0" />
              {local}
            </p>
          ) : (
            <FieldError text={errors.custom} />
          )}
        </div>
      ) : (
        <PreviewBody
          preview={preview}
          label={label}
          className="max-h-[70svh] overflow-auto"
        />
      )}

      {noDomain && byHand && (
        <p className="text-caption text-muted-foreground">
          Add a domain in General to test or save it.
        </p>
      )}

      {result && (
        <div
          role="status"
          className={cn(
            "flex flex-col gap-2 rounded-lg border p-3",
            result.ok
              ? "border-border bg-subtle"
              : "border-destructive/20 bg-destructive/5",
          )}
        >
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm font-medium">
            {result.ok ? (
              <CircleCheck className="size-4 shrink-0 text-success" />
            ) : (
              <CircleX className="size-4 shrink-0 text-destructive" />
            )}
            {result.ok
              ? `${p.kind_label} accepts it`
              : `${p.kind_label} refused it`}
            {changed && (
              <span className="text-caption font-normal text-ash">
                Changed since this test
              </span>
            )}
          </p>
          {result.output.trim() && (
            <pre className="max-h-60 overflow-auto font-mono text-caption whitespace-pre-wrap text-muted-foreground">
              {result.output.trim()}
            </pre>
          )}
          {badLine > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="self-start max-md:h-11"
              onClick={() => goToLine(badLine)}
            >
              <CornerDownRight />
              Go to line {badLine}
            </Button>
          )}
          <p className="text-caption text-ash">
            Tested with every other site of this proxy, then put back as it was.
            Nothing was saved or loaded.
          </p>
        </div>
      )}

      {notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notes.map((n) => (
            <li key={n}>
              <Callout icon={<Lightbulb />}>{n}</Callout>
            </li>
          ))}
        </ul>
      )}

      <p className="text-caption text-ash">
        Written to its own file in /etc/{p.kind}/morcheh/ and tested before it's
        loaded. If the test fails, nothing changes on the server.
      </p>

      <ConfirmDialog
        open={askHand}
        onOpenChange={setAskHand}
        title="Write this config by hand?"
        description={
          <>
            You start from the generated file and change what you like. From
            then on Morcheh writes your text as it is: HTTPS, Security, Paths,
            Headers and Advanced no longer change it, until you go back to the
            generated one. It's still tested before it's loaded.
          </>
        }
        confirmLabel="Edit by hand"
        onConfirm={() => {
          setAskHand(false)
          set({ custom: preview.text.trim() })
          setResult(undefined)
        }}
      />
      <ConfirmDialog
        open={askBack}
        onOpenChange={setAskBack}
        title="Use the generated config?"
        description="Your hand-written text is dropped and the file is made from the other tabs again, once you save."
        confirmLabel="Use the generated one"
        destructive
        onConfirm={() => {
          setAskBack(false)
          set({ custom: "" })
          setResult(undefined)
        }}
      />
    </section>
  )
}
