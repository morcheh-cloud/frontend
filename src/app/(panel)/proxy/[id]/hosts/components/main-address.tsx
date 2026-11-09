"use client"

import { type ClipboardEvent, type ReactNode, useId } from "react"

import { FieldError } from "@/app/(panel)/cronjobs/components/editor-parts"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { mainPortHint, PortInput, useHeldText } from "./balancing-tab"
import {
  type Draft,
  mainParts,
  splitHostPort,
  urlParts,
  withMain,
} from "./draft"

const typing = {
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const

// The one server a site (or a stream) is passed on to, in parts: protocol,
// address, port and path, like each row of a load-balanced list.
export function MainAddress({
  draft,
  set,
  error,
  hint,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  error?: string
  hint?: ReactNode
}) {
  const id = useId()
  const stream = draft.type === "stream"
  const parts = mainParts(draft)
  const scheme =
    parts.scheme.toLowerCase() === "https://" ? "https://" : "http://"
  const invalid = error ? true : undefined
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const label = "text-caption text-muted-foreground"

  // A whole address typed or pasted into the address field: take it apart,
  // keeping what it doesn't say.
  const take = (text: string) => {
    if (stream) {
      const p = splitHostPort(text.replace(/^[a-z]+:\/\//i, ""))
      return { host: p.host, port: p.port || undefined }
    }
    const p = urlParts(text)
    // A full URL says it all; host:port or host/path keeps the rest.
    if (p.scheme) return p
    return {
      host: p.host,
      port: p.port || undefined,
      rest: p.rest || undefined,
    }
  }
  const whole = (text: string) =>
    /:\/\/|[/?#]/.test(text) || splitHostPort(text).port !== ""
  const host = useHeldText(
    parts.host,
    (v) => set(withMain(draft, { host: v })),
    (v) => {
      if (v !== parts.host) set(withMain(draft, take(v)))
    },
  )
  const paste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").trim()
    if (!whole(text)) return
    e.preventDefault()
    host.clear()
    set(withMain(draft, take(text)))
  }

  return (
    <fieldset className="@container flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-body-sm font-medium">
        {stream ? "Forward to" : "App address"}
      </legend>
      <div
        className={cn(
          "grid gap-3",
          stream
            ? "grid-cols-[minmax(0,1fr)_6rem] @xl:grid-cols-[minmax(0,1fr)_7rem]"
            : "grid-cols-[minmax(0,1fr)_6rem] @xl:grid-cols-[auto_minmax(0,1fr)_7rem_minmax(0,10rem)]",
        )}
      >
        {!stream && (
          <div className="col-span-2 flex flex-col items-start gap-1 @xl:col-span-1">
            <span className={label}>Protocol</span>
            <Segmented
              label="Protocol the app is asked with"
              items={[
                { value: "http://", label: "http" },
                { value: "https://", label: "https" },
              ]}
              value={scheme}
              onChange={(v) => set(withMain(draft, { scheme: v }))}
            />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-host`} className={label}>
            Address
          </label>
          <Input
            {...typing}
            id={`${id}-host`}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            value={host.value}
            onChange={(e) => host.onChange(e.target.value)}
            onBlur={host.onBlur}
            onPaste={paste}
            placeholder={stream ? "10.0.0.12" : "127.0.0.1"}
            inputMode="url"
            enterKeyHint="next"
            className="font-mono"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-port`} className={label}>
            Port
          </label>
          <PortInput
            id={`${id}-port`}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            value={parts.port}
            onChange={(port) => set(withMain(draft, { port }))}
            placeholder={mainPortHint(draft)}
          />
        </div>
        {!stream && (
          <div className="col-span-2 flex min-w-0 flex-col gap-1 @xl:col-span-1">
            <label htmlFor={`${id}-path`} className={label}>
              Path (optional)
            </label>
            <Input
              {...typing}
              id={`${id}-path`}
              value={parts.rest}
              onChange={(e) => set(withMain(draft, { rest: e.target.value }))}
              onBlur={(e) => {
                const v = e.target.value.trim()
                const rest = v && !/^[/?#]/.test(v) ? `/${v}` : v
                if (rest !== parts.rest) set(withMain(draft, { rest }))
              }}
              placeholder="/"
              inputMode="url"
              enterKeyHint="done"
              className="font-mono"
            />
          </div>
        )}
      </div>
      {error ? (
        <div id={`${id}-error`}>
          <FieldError text={error} />
        </div>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-caption text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </fieldset>
  )
}
