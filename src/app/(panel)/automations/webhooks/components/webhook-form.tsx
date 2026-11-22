"use client"

import { BellOff, Lock, Plus, X } from "lucide-react"

import {
  FieldError,
  Section,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { useAccess } from "@/components/auth/auth"
import { useEventCatalog } from "@/components/events/catalog"
import { EventPicker } from "@/components/events/event-picker"
import { Field } from "@/components/field"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { OutgoingWebhook, WebhookBody } from "@/lib/services"
import { hostOf } from "./meta"

// The webhook form, shared by /automations/webhooks/new (EditorPage) and the
// Settings tab of a saved one. `saved` = the names of headers already stored,
// whose blank value keeps what's saved.

type Header = { key: string; name: string; value: string; saved?: string }

export type Draft = {
  name: string
  url: string
  all: boolean
  events: string[]
  includeMuted: boolean
  enabled: boolean
  allowInternal: boolean
  headers: Header[]
}

export type Errors = Record<string, string>

let seq = 0
const header = (name = "", saved?: string): Header => ({
  key: `h${++seq}`,
  name,
  value: "",
  saved,
})

export function draftOf(w?: OutgoingWebhook): Draft {
  return {
    name: w?.name ?? "",
    url: w?.url ?? "",
    all: w ? w.events.length === 0 : false,
    events: w?.events ?? [],
    includeMuted: w?.include_muted ?? false,
    enabled: w?.enabled ?? true,
    allowInternal: w?.allow_internal ?? false,
    headers: (w?.header_names ?? []).map((n) => header(n, n)),
  }
}

// Header row keys are fresh for every draft: leave them out.
export const serial = (d: Draft) =>
  JSON.stringify({
    ...d,
    events: [...d.events].sort(),
    headers: d.headers.map(({ key, ...h }) => h),
  })

export function toBody(d: Draft): WebhookBody {
  const url = d.url.trim()
  return {
    name: d.name.trim() || hostOf(url) || "Webhook",
    url,
    events: d.all ? [] : d.events,
    include_muted: d.includeMuted,
    enabled: d.enabled,
    allow_internal: d.allowInternal,
    // Always sent: the rows are the new set (a removed row goes), a blank
    // value keeps the saved one.
    headers: Object.fromEntries(
      d.headers
        .filter((h) => h.name.trim())
        .map((h) => [h.name.trim(), h.value]),
    ),
  }
}

// An HTTP token, as the backend's header check.
const headerName = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/
const reserved = [
  "content-type",
  "content-length",
  "host",
  "user-agent",
  "transfer-encoding",
  "connection",
]

// Mirrors the backend's WebhookBody.clean.
export function check(d: Draft): Errors {
  const e: Errors = {}
  try {
    const u = new URL(d.url.trim())
    if ((u.protocol !== "http:" && u.protocol !== "https:") || !u.host)
      e.url = "Enter an http:// or https:// address"
    else if (u.username || u.password)
      e.url = "Put credentials in a header, not in the address"
  } catch {
    e.url = "Enter an http:// or https:// address"
  }
  if (!d.all && d.events.length === 0)
    e.events = "Pick at least one event, or send all of them"
  if (d.headers.filter((h) => h.name.trim()).length > 20)
    e.headers = "At most 20 headers"
  for (const h of d.headers) {
    const n = h.name.trim()
    if (!n) continue
    const low = n.toLowerCase()
    if (!headerName.test(n)) e.headers = `“${n}” isn't a valid header name`
    else if (reserved.includes(low) || low.startsWith("x-morche-"))
      e.headers = `${n} is set by Morche`
    else if (/[\r\n]/.test(h.value))
      e.headers = "A header value can't hold a line break"
    else if (!h.value && h.saved !== n) e.headers = `Enter a value for ${n}`
  }
  return e
}

// Backend field locations → this form's keys.
export function errorKey(location: string) {
  if (location.startsWith("events")) return "events"
  if (location.startsWith("headers")) return "headers"
  if (location === "allow_internal") return "url"
  return location
}

export function WebhookSections({
  d,
  set,
  errors,
  phone,
}: {
  d: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
}) {
  const access = useAccess()
  const catalog = useEventCatalog()
  const alerts = d.all || d.events.some((e) => e.startsWith("alert."))

  return (
    <>
      <Section
        title="Where it sends"
        hint="Morche POSTs each event as JSON to this address, signed with the webhook's secret."
        phone={phone}
      >
        <Field
          label="Address"
          error={errors.url}
          hint="Your endpoint: a chat bridge, an incident tool, your own service."
        >
          {(p) => (
            <Input
              {...p}
              value={d.url}
              onChange={(e) => set({ url: e.target.value })}
              placeholder="https://hooks.example.com/morche"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono placeholder:font-sans placeholder:text-ash"
            />
          )}
        </Field>
        <Field
          label="Name"
          error={errors.name}
          hint="How it shows in lists. Left empty, the address's host is used."
        >
          {(p) => (
            <Input
              {...p}
              value={d.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={hostOf(d.url.trim()) || "Incident bridge"}
              maxLength={100}
              className="placeholder:text-ash"
            />
          )}
        </Field>
        {access.admin ? (
          <ToggleRow
            id="webhook-internal"
            label="Allow a private address"
            hint="For an endpoint inside your network (10.x, 192.168.x, localhost…). Only system admins can allow it."
            checked={d.allowInternal}
            onChange={(allowInternal) => set({ allowInternal })}
          />
        ) : (
          <p className="flex gap-2 text-caption text-muted-foreground">
            <Lock className="mt-px size-3.5 shrink-0 text-ash" />
            {d.allowInternal
              ? "A system admin allowed this webhook's private address. Changing the address needs one again."
              : "Private and local addresses need a system admin to allow them."}
          </p>
        )}
      </Section>

      <Section
        title="Events"
        hint="What it's sent. New kinds of events are added to All events by themselves."
        phone={phone}
      >
        <div className="self-start">
          <Segmented
            label="Which events"
            items={[
              { value: "chosen", label: "Chosen events" },
              { value: "all", label: "All events" },
            ]}
            value={d.all ? "all" : "chosen"}
            onChange={(v) => set({ all: v === "all" })}
          />
        </div>
        {!d.all &&
          (catalog.isPending ? (
            <Skeleton className="h-60 rounded-xl" />
          ) : catalog.isError ? (
            <p className="text-body-sm text-destructive">
              Couldn't load the event types: {catalog.error.message}
            </p>
          ) : (
            <EventPicker
              catalog={catalog.data}
              value={d.events}
              onChange={(events) => set({ events })}
              invalid={!!errors.events}
            />
          ))}
        <FieldError text={errors.events} />
        {alerts && (
          <ToggleRow
            id="webhook-muted"
            label="Also send muted alerts"
            hint={
              <>
                <BellOff className="me-1 inline size-3 align-[-1px]" />
                An alert that fires during a mute still comes, with{" "}
                <code className="font-mono">data.muted = true</code>.
              </>
            }
            checked={d.includeMuted}
            onChange={(includeMuted) => set({ includeMuted })}
          />
        )}
      </Section>

      <Section
        title="Headers"
        hint="Extra headers on every delivery, like a token your endpoint expects. Kept encrypted: values are never shown again."
        phone={phone}
      >
        <div className="flex flex-col gap-2">
          {d.headers.map((h, i) => (
            <div
              key={h.key}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]"
            >
              <Input
                aria-label="Header name"
                value={h.name}
                onChange={(e) =>
                  set({
                    headers: d.headers.map((x, j) =>
                      j === i ? { ...x, name: e.target.value } : x,
                    ),
                  })
                }
                placeholder="Authorization"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono placeholder:text-ash max-md:col-start-1"
              />
              <div className="min-w-0 max-md:col-start-1 max-md:row-start-2">
                <SecretInput
                  label="header value"
                  aria-label="Header value"
                  value={h.value}
                  onChange={(e) =>
                    set({
                      headers: d.headers.map((x, j) =>
                        j === i ? { ...x, value: e.target.value } : x,
                      ),
                    })
                  }
                  placeholder={
                    h.saved && h.saved === h.name.trim()
                      ? "Saved: blank keeps it"
                      : "Value"
                  }
                  autoComplete="off"
                />
              </div>
              <Button
                variant="ghost"
                size={phone ? "icon-lg" : "icon"}
                aria-label="Remove header"
                className="max-md:col-start-2 max-md:row-span-2 max-md:row-start-1"
                onClick={() =>
                  set({ headers: d.headers.filter((_, j) => j !== i) })
                }
              >
                <X />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            className="h-11 self-stretch border-dashed md:h-9 md:self-start"
            disabled={d.headers.length >= 20}
            onClick={() => set({ headers: [...d.headers, header()] })}
          >
            <Plus />
            Add header
          </Button>
          <FieldError text={errors.headers} />
          <p className="text-caption text-ash">
            Morche sets Content-Type, User-Agent and the X-Morche-* headers
            itself.
          </p>
        </div>
      </Section>

      <Section
        title="State"
        hint="Off, nothing is sent; Send a test still works."
        phone={phone}
      >
        <ToggleRow
          id="webhook-enabled"
          label="On"
          hint={
            d.enabled
              ? "Events are sent as they happen."
              : "Events that happen while it's off are never sent."
          }
          checked={d.enabled}
          onChange={(enabled) => set({ enabled })}
        />
      </Section>
    </>
  )
}
