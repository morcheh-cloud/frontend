"use client"

import { FlaskConical, Loader2 } from "lucide-react"
import { type FormEvent, useId, useState } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Fail2BanTestBody } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Field, Segmented } from "../../../components/fields"
import { useServerPage } from "../../components/server-page"
import { useTestFilter } from "../api"
import { useF2bActions } from "./fail2ban-actions"

export type TestPrefill = { filter?: string; log?: string }

type Rule = "filter" | "regex"
type Source = "file" | "journal" | "sample"

const FORM_ID = "f2b-test-form"

// fail2ban-regex against a log file, the journal or pasted lines: which
// lines a filter (or a regex being written) would count as failures.
export function TestDialog({
  open,
  onOpenChange,
  prefill,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefill: TestPrefill
}) {
  const { phone } = useServerPage()
  const title = "Test a filter"
  const body = <TestBody prefill={prefill} />

  if (phone) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        className="px-4 pt-2 pb-[calc(--spacing(8)+env(safe-area-inset-bottom))]"
      >
        {body}
      </BottomSheet>
    )
  }
  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] gap-5 overflow-y-auto p-6 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Runs fail2ban-regex on the server. Nothing is banned.
          </DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  )
}

function TestBody({ prefill }: { prefill: TestPrefill }) {
  const { server, phone } = useServerPage()
  const a = useF2bActions()
  const test = useTestFilter(server.id)
  const listId = useId()
  const [rule, setRule] = useState<Rule>("filter")
  const [filter, setFilter] = useState(prefill.filter ?? "sshd")
  const [failregex, setFailregex] = useState("")
  const [ignoreregex, setIgnoreregex] = useState("")
  const [source, setSource] = useState<Source>(
    prefill.log === "journal" ? "journal" : "file",
  )
  const [log, setLog] = useState(
    prefill.log && prefill.log !== "journal"
      ? prefill.log
      : "/var/log/auth.log",
  )
  const [sample, setSample] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const result = test.data

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (rule === "filter" && !filter.trim()) next.filter = "Pick a filter"
    if (rule === "regex" && !failregex.trim()) {
      next.failregex = "Write the regex; <HOST> marks the address"
    }
    if (source === "file" && !log.trim()) next.log = "A log file path"
    if (source === "sample" && !sample.trim()) next.sample = "Paste a few lines"
    setErrors(next)
    if (Object.keys(next).length) return

    const body: Fail2BanTestBody = {}
    if (rule === "filter") body.filter = filter.trim()
    else {
      body.failregex = failregex.trim()
      if (ignoreregex.trim()) body.ignoreregex = ignoreregex.trim()
    }
    if (source === "sample") body.sample = sample
    else body.log = source === "journal" ? "journal" : log.trim()
    test.mutate(body)
  }

  return (
    <form
      id={FORM_ID}
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-3">
        <Segmented
          label="Rule"
          value={rule}
          onChange={setRule}
          options={[
            { value: "filter", label: "A filter" },
            { value: "regex", label: "My own regex" },
          ]}
        />
        {rule === "filter" ? (
          <Field label="Filter" error={errors.filter}>
            {(p) => (
              <>
                <Input
                  {...p}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  list={listId}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono md:text-body-sm"
                />
                <datalist id={listId}>
                  {a.overview.filters.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
        ) : (
          <>
            <Field
              label="Fail regex"
              hint="One per line. <HOST> marks the address to ban."
              error={errors.failregex}
            >
              {(p) => (
                <Textarea
                  {...p}
                  value={failregex}
                  onChange={(e) => setFailregex(e.target.value)}
                  placeholder="^.*Failed password for .* from <HOST>"
                  rows={3}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="font-mono text-body-sm"
                />
              )}
            </Field>
            <Field label="Ignore regex" hint="Optional: lines to skip.">
              {(p) => (
                <Input
                  {...p}
                  value={ignoreregex}
                  onChange={(e) => setIgnoreregex(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono md:text-body-sm"
                />
              )}
            </Field>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Segmented
          label="Lines to test"
          value={source}
          onChange={setSource}
          options={[
            { value: "file", label: "Log file" },
            { value: "journal", label: "Journal" },
            { value: "sample", label: "Paste" },
          ]}
        />
        {source === "file" && (
          <Field label="Log file" error={errors.log}>
            {(p) => (
              <Input
                {...p}
                value={log}
                onChange={(e) => setLog(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                className="font-mono md:text-body-sm"
              />
            )}
          </Field>
        )}
        {source === "journal" && (
          <p className="text-caption text-muted-foreground">
            Reads the systemd journal, the way jails with backend = systemd do.
          </p>
        )}
        {source === "sample" && (
          <Field label="Log lines" error={errors.sample}>
            {(p) => (
              <Textarea
                {...p}
                value={sample}
                onChange={(e) => setSample(e.target.value)}
                placeholder="Nov  1 10:00:00 web sshd[812]: Failed password for root from 192.0.2.1 port 22 ssh2"
                rows={5}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono text-caption"
              />
            )}
          </Field>
        )}
      </div>

      <Button
        type="submit"
        size={phone ? "lg" : "default"}
        disabled={test.isPending}
        className="md:self-end"
      >
        {test.isPending ? (
          <Loader2 className="animate-spin" />
        ) : (
          <FlaskConical />
        )}
        {test.isPending ? "Testing…" : result ? "Test again" : "Test"}
      </Button>

      {test.error && (
        <p
          role="alert"
          className="rounded-2xl border border-border bg-subtle p-3 text-body-sm break-words whitespace-pre-wrap text-destructive"
        >
          {test.error.message}
        </p>
      )}

      {result && (
        <div
          className={cn("flex flex-col gap-3", test.isPending && "opacity-60")}
        >
          <div className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border">
            {[
              { label: "Lines read", value: result.lines },
              { label: "Matched", value: result.matched },
              { label: "Ignored", value: result.ignored },
            ].map((c) => (
              <div key={c.label} className="px-4 py-3">
                <p className="text-subheading font-medium tabular-nums">
                  {c.value}
                </p>
                <p className="text-caption text-muted-foreground">{c.label}</p>
              </div>
            ))}
          </div>
          {result.matches.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-body-sm font-medium">
                Would count as failures
                {result.matches.length < result.matched &&
                  ` (first ${result.matches.length})`}
              </p>
              <pre className="max-h-64 overflow-auto rounded-2xl border border-border bg-subtle p-3 font-mono text-caption break-all whitespace-pre-wrap">
                {result.matches.join("\n")}
              </pre>
            </div>
          ) : (
            <p className="text-body-sm text-muted-foreground">
              No line matched. Check the log path, or that the filter fits this
              service's log format.
            </p>
          )}
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer items-center text-body-sm font-medium text-muted-foreground outline-none hover:text-foreground md:min-h-8">
              fail2ban-regex's full report
            </summary>
            <pre className="max-h-80 overflow-auto rounded-2xl border border-border bg-subtle p-3 font-mono text-caption break-all whitespace-pre-wrap">
              {result.output}
            </pre>
          </details>
        </div>
      )}
    </form>
  )
}
