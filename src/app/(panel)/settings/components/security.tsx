"use client"

import {
  Bell,
  Globe,
  Info,
  Plus,
  ShieldAlert,
  TriangleAlert,
  X,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode, useEffect, useState } from "react"
import { toast } from "sonner"

import { ChannelIcon, channelLabel } from "@/app/(panel)/alerts/components/meta"
import { alertsHref } from "@/app/(panel)/alerts/components/rules-meta"
import { PageHeader } from "@/components/panel/page-header"
import {
  useSecuritySettings,
  useUpdateSecurity,
} from "@/components/sessions/api"
import {
  checkEntry,
  parseRange,
  rangeContains,
  rangeSize,
} from "@/components/sessions/ip"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { fieldErrors } from "@/lib/api"
import type { SecuritySettings, SecuritySettingsBody } from "@/lib/services"
import { cn } from "@/lib/utils"
import { AdminOnly } from "./no-access"

const MAX_CHANNELS = 20

type Row = { key: string; address: string; note: string }
type Draft = {
  enabled: boolean
  rows: Row[]
  alertNew: boolean
  alertFailed: boolean
  channels: string[]
}

let seq = 0
const rowOf = (address = "", note = ""): Row => ({
  key: `r${++seq}`,
  address,
  note,
})

function draftOf(s: SecuritySettings): Draft {
  return {
    enabled: s.allowlist_enabled,
    rows: (s.allowlist ?? []).map((e) => rowOf(e.address, e.note ?? "")),
    alertNew: s.alert_new_address,
    alertFailed: s.alert_failed_sign_ins,
    channels: s.sign_in_channels ?? [],
  }
}

function bodyOf(d: Draft): SecuritySettingsBody {
  return {
    allowlist_enabled: d.enabled,
    allowlist: d.rows
      .filter((r) => r.address.trim() || r.note.trim())
      .map((r) => ({ address: r.address.trim(), note: r.note.trim() })),
    alert_new_address: d.alertNew,
    alert_failed_sign_ins: d.alertFailed,
    sign_in_channels: d.channels,
  }
}

const same = (a: Draft, b: Draft) =>
  JSON.stringify(bodyOf(a)) === JSON.stringify(bodyOf(b))

// Does any entry in the list cover this address?
function covers(rows: Row[], ip: string) {
  return rows.some((r) => {
    const range = parseRange(r.address)
    return !!range && rangeContains(range, ip)
  })
}

export function SecuritySettingsPage() {
  return (
    <AdminOnly>
      <PageHeader title="Security" guide="access" />
      <Loader />
    </AdminOnly>
  )
}

function Loader() {
  const settings = useSecuritySettings()
  if (settings.isPending)
    return (
      <div className="flex w-full flex-col gap-6 px-4 py-5 md:px-6">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    )
  if (settings.isError)
    return (
      <div className="w-full px-4 py-5 md:px-6">
        <p className="text-body-sm text-destructive">
          Couldn't load the security settings: {settings.error.message}
        </p>
        <Button
          variant="outline"
          className="mt-3 max-md:h-11"
          onClick={() => settings.refetch()}
        >
          Try again
        </Button>
      </div>
    )
  return <SecurityForm saved={settings.data} />
}

function SecurityForm({ saved }: { saved: SecuritySettings }) {
  const [draft, setDraft] = useState(() => draftOf(saved))
  const [base, setBase] = useState(() => draftOf(saved))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const update = useUpdateSecurity()
  const dirty = !same(draft, base)

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const save = () => {
    // Problems the backend would refuse anyway, shown before the round trip.
    const local: Record<string, string> = {}
    const kept = bodyOf(draft).allowlist
    draft.rows
      .filter((r) => r.address.trim() || r.note.trim())
      .forEach((r, i) => {
        const problem = checkEntry(r.address)
        if (problem) local[`allowlist[${i}].address`] = problem
      })
    if (draft.enabled && kept.length === 0)
      local.allowlist = "Add at least one address before turning the list on."
    if (Object.keys(local).length) {
      setErrors(local)
      toast.error("Fix the highlighted addresses first")
      return
    }
    const body = bodyOf(draft)
    update.mutate(body, {
      onSuccess: (next) => {
        const fresh = draftOf(next)
        setDraft(fresh)
        setBase(fresh)
        setErrors({})
        toast.success("Security settings saved")
      },
      onError: (err) => {
        const fields = fieldErrors(err)
        setErrors(fields)
        toast.error(
          Object.keys(fields).length ? "Some settings need a fix" : err.message,
        )
      },
    })
  }

  // Errors are keyed by the position among the rows that are sent.
  const sentIndex = new Map<string, number>()
  for (const r of draft.rows)
    if (r.address.trim() || r.note.trim()) sentIndex.set(r.key, sentIndex.size)

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-5 md:px-6">
      <Allowlist
        saved={saved}
        draft={draft}
        set={set}
        errors={errors}
        errorOf={(r) => {
          const i = sentIndex.get(r.key)
          return i === undefined ? undefined : errors[`allowlist[${i}].address`]
        }}
      />
      <Alerts saved={saved} draft={draft} set={set} errors={errors} />
      <SaveBar
        dirty={dirty}
        pending={update.isPending}
        onSave={save}
        onDiscard={() => {
          setDraft(base)
          setErrors({})
        }}
      />
    </div>
  )
}

function Card({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string
  title: string
  description: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="-mx-4 scroll-mt-16 border-border max-md:border-y max-md:p-4 md:mx-0 md:rounded-2xl md:border md:p-6"
    >
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="font-medium">
            {title}
          </h2>
          <p className="mt-1 text-body-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {action}
      </div>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </section>
  )
}

function Callout({
  tone,
  icon: Icon,
  children,
}: {
  tone: "warning" | "danger" | "info"
  icon: typeof Info
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-body-sm",
        tone === "warning" && "border-warning/30 bg-warning/10",
        tone === "danger" && "border-destructive/30 bg-destructive/10",
        tone === "info" && "border-border bg-subtle",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-destructive",
          tone === "info" && "text-muted-foreground",
        )}
      />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function Allowlist({
  saved,
  draft,
  set,
  errors,
  errorOf,
}: {
  saved: SecuritySettings
  draft: Draft
  set: (p: Partial<Draft>) => void
  errors: Record<string, string>
  errorOf: (r: Row) => string | undefined
}) {
  const me = saved.your_address
  const mine = !!me && covers(draft.rows, me)
  const lockout = draft.enabled && !mine

  const change = (key: string, patch: Partial<Row>) =>
    set({
      rows: draft.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    })
  const remove = (key: string) =>
    set({ rows: draft.rows.filter((r) => r.key !== key) })
  const add = (address = "", note = "") => {
    const rows = draft.rows.filter((r) => r.address.trim() || r.note.trim())
    set({ rows: [...rows, rowOf(address, note)] })
  }

  // Pasting several lines into an address field makes a row for each.
  const paste = (key: string, text: string) => {
    const lines = text
      .split(/[\n,;]+/)
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length < 2) return false
    const at = draft.rows.findIndex((r) => r.key === key)
    const fresh = lines.map((l) => {
      const [address, ...note] = l.split(/\s+/)
      return rowOf(address, note.join(" ").replace(/^#\s*/, ""))
    })
    const rows = [...draft.rows]
    const replace = rows[at] && !rows[at].address.trim() ? 1 : 0
    rows.splice(replace ? at : at + 1, replace, ...fresh)
    set({ rows })
    return true
  }

  return (
    <Card
      id="allowlist"
      title="Allowed addresses"
      description="Only these addresses and ranges can reach the panel, the sign-in page included. Everyone else sees a “not allowed” page and can't even try a password."
      action={
        <Switch
          aria-label="Only allow these addresses"
          checked={draft.enabled}
          onCheckedChange={(enabled) => {
            // Turning it on with an empty list starts with your address.
            if (enabled && !draft.rows.some((r) => r.address.trim()) && me)
              set({ enabled, rows: [rowOf(me, "My address")] })
            else set({ enabled })
          }}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-subtle px-4 py-3">
        <Globe className="size-4 shrink-0 text-muted-foreground" />
        <span className="text-body-sm text-muted-foreground">Your address</span>
        <span className="font-mono text-body-sm tabular-nums">
          {me || "unknown"}
        </span>
        {me &&
          (mine ? (
            <span className="inline-flex h-5 items-center rounded-full bg-success/10 px-2 text-caption text-success">
              In the list
            </span>
          ) : (
            <span className="inline-flex h-5 items-center rounded-full bg-warning/10 px-2 text-caption text-warning">
              Not in the list
            </span>
          ))}
        {me && !mine && (
          <Button
            variant="outline"
            size="sm"
            className="ms-auto max-md:h-11"
            onClick={() => add(me, "My address")}
          >
            <Plus />
            Add my address
          </Button>
        )}
      </div>

      {saved.your_address_private && (
        <Callout tone="info" icon={Info}>
          Your address is a private one.{" "}
          {saved.trust_proxy
            ? "That's fine on a local network or a VPN."
            : "If the panel sits behind a reverse proxy or a load balancer, every visitor looks like the proxy's own address, so the list can't tell people apart: start the backend with TRUST_PROXY=true there."}
        </Callout>
      )}

      {lockout && (
        <Callout tone="danger" icon={ShieldAlert}>
          <p className="font-medium">This would lock you out</p>
          <p className="text-muted-foreground">
            Your address ({me || "unknown"}) isn't covered by any entry, so
            Morche won't save the list while it's on. Add your address or a
            range that includes it.
          </p>
        </Callout>
      )}

      {draft.rows.length > 0 ? (
        <ul className="flex flex-col gap-3 md:gap-2">
          <li
            aria-hidden
            className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-2 text-caption text-muted-foreground md:grid"
          >
            <span>Address or range</span>
            <span>Note</span>
          </li>
          {draft.rows.map((r) => (
            <AllowRow
              key={r.key}
              row={r}
              me={me}
              error={errorOf(r)}
              onChange={(p) => change(r.key, p)}
              onRemove={() => remove(r.key)}
              onPaste={(text) => paste(r.key, text)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-body-sm text-muted-foreground">
          No addresses yet. Add yours first so you can't lock yourself out.
        </p>
      )}
      {errors.allowlist && (
        <p className="text-caption text-destructive">{errors.allowlist}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" className="max-md:h-11" onClick={() => add()}>
          <Plus />
          Add an address
        </Button>
        <span className="text-caption text-ash">
          One address (203.0.113.7) or a range (203.0.113.0/24, 2001:db8::/48).
          Paste a list to add several.
        </span>
      </div>

      <p className="text-caption text-ash">
        Locked out anyway? On the machine running Morche, run{" "}
        <code className="rounded bg-muted px-1 font-mono">
          server allowlist off
        </code>
        .
      </p>
    </Card>
  )
}

function AllowRow({
  row,
  me,
  error,
  onChange,
  onRemove,
  onPaste,
}: {
  row: Row
  me: string
  error?: string
  onChange: (p: Partial<Row>) => void
  onRemove: () => void
  onPaste: (text: string) => boolean
}) {
  const [touched, setTouched] = useState(false)
  const typed = row.address.trim()
  const problem = error ?? (touched && typed ? checkEntry(row.address) : "")
  const range = typed ? parseRange(typed) : null
  const youre = !!me && !!range && rangeContains(range, me)
  const noteId = `${row.key}-hint`

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_2.75rem] gap-2 max-md:rounded-xl max-md:border max-md:border-border max-md:p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem]">
      <div className="flex min-w-0 flex-col gap-1">
        <Input
          aria-label="Address or range"
          aria-invalid={problem ? true : undefined}
          aria-describedby={noteId}
          value={row.address}
          placeholder="203.0.113.0/24"
          inputMode="text"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="font-mono"
          onChange={(e) => onChange({ address: e.target.value })}
          onBlur={() => setTouched(true)}
          onPaste={(e) => {
            if (onPaste(e.clipboardData.getData("text"))) e.preventDefault()
          }}
        />
        <p
          id={noteId}
          className={cn(
            "flex flex-wrap items-center gap-x-2 text-caption",
            problem ? "text-destructive" : "text-ash",
          )}
        >
          {problem || (range && rangeSize(typed))}
          {!problem && youre && (
            <span className="inline-flex h-5 items-center rounded-full bg-brand-soft px-2 text-caption text-brand-strong">
              Covers you
            </span>
          )}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remove ${typed || "this row"}`}
        title="Remove"
        className="size-11 md:order-last md:size-9"
        onClick={onRemove}
      >
        <X />
      </Button>
      <Input
        aria-label="Note"
        value={row.note}
        placeholder="Office, VPN, home…"
        maxLength={200}
        className="max-md:col-span-2"
        onChange={(e) => onChange({ note: e.target.value })}
      />
    </li>
  )
}

function Alerts({
  saved,
  draft,
  set,
  errors,
}: {
  saved: SecuritySettings
  draft: Draft
  set: (p: Partial<Draft>) => void
  errors: Record<string, string>
}) {
  const channels = saved.channels ?? []
  const groups = new Map<string, typeof channels>()
  for (const c of channels) {
    const list = groups.get(c.workspace_name) ?? []
    list.push(c)
    groups.set(c.workspace_name, list)
  }
  const picked = new Set(draft.channels)
  const sending = draft.alertNew || draft.alertFailed
  const full = picked.size >= MAX_CHANNELS
  const channelError = Object.entries(errors).find(([k]) =>
    k.startsWith("sign_in_channels"),
  )?.[1]

  const toggle = (id: string, on: boolean) =>
    set({
      channels: on
        ? [...draft.channels, id]
        : draft.channels.filter((c) => c !== id),
    })

  return (
    <Card
      id="sign-in-alerts"
      title="Sign-in alerts"
      description="Every sign-in is kept in the Audit log either way. These send a message to the channels below as well."
    >
      <SwitchRow
        label="Sign-in from a new address"
        hint="Someone signed in from a network the account hadn't used. The person is also asked on the panel whether it was them."
        checked={draft.alertNew}
        onChange={(alertNew) => set({ alertNew })}
      />
      <SwitchRow
        label="Repeated wrong passwords"
        hint="Several wrong passwords for one account in 15 minutes, when Morche starts refusing more tries."
        checked={draft.alertFailed}
        onChange={(alertFailed) => set({ alertFailed })}
      />

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-body-sm font-medium">Send to</h3>
          {channels.length > 0 && (
            <span className="text-caption text-ash">
              {picked.size
                ? `${picked.size} of ${channels.length} picked`
                : "None picked"}
            </span>
          )}
        </div>
        {channels.length === 0 ? (
          <Callout tone="info" icon={Bell}>
            <p>No notification channels yet.</p>
            <Link
              href={alertsHref("/alerts", { tab: "channels" })}
              className="text-brand hover:underline"
            >
              Add one under Alerts
            </Link>
          </Callout>
        ) : (
          [...groups].map(([workspace, list]) => (
            <fieldset key={workspace} className="flex flex-col gap-1">
              <legend className="mb-1 font-label text-caption tracking-label text-ash uppercase">
                {workspace}
              </legend>
              {list.map((c) => {
                const on = picked.has(c.id)
                return (
                  // biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox inside is the control
                  <label
                    key={c.id}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-muted md:min-h-10"
                  >
                    <Checkbox
                      checked={on}
                      disabled={!on && full}
                      onCheckedChange={(v) => toggle(c.id, v === true)}
                    />
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <ChannelIcon kind={c.kind} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-body-sm">
                      {c.name}
                      <span className="text-ash">
                        {" "}
                        · {channelLabel(c.kind)}
                      </span>
                    </span>
                    {!c.enabled && (
                      <span
                        title="This channel is turned off: nothing is sent to it until it's on again"
                        className="inline-flex h-5 shrink-0 items-center rounded-full bg-muted px-2 text-caption text-muted-foreground"
                      >
                        Off
                      </span>
                    )}
                  </label>
                )
              })}
            </fieldset>
          ))
        )}
        {full && (
          <p className="text-caption text-ash">
            Up to {MAX_CHANNELS} channels.
          </p>
        )}
        {channelError && (
          <p className="text-caption text-destructive">{channelError}</p>
        )}
        {sending && channels.length > 0 && picked.size === 0 && (
          <Callout tone="warning" icon={TriangleAlert}>
            Alerts are on but no channel is picked, so nothing is sent.
          </Callout>
        )}
      </div>
    </Card>
  )
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the Switch inside is the control
    <label className="flex cursor-pointer items-start justify-between gap-6">
      <span className="min-w-0">
        <span className="block text-body-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-caption text-muted-foreground">
          {hint}
        </span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

function SaveBar({
  dirty,
  pending,
  onSave,
  onDiscard,
}: {
  dirty: boolean
  pending: boolean
  onSave: () => void
  onDiscard: () => void
}) {
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  if (!dirty) return null
  return (
    <div className="sticky bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] z-30 -mx-4 flex items-center gap-2 border-t border-border bg-background px-4 py-2 md:bottom-6 md:mx-auto md:w-fit md:rounded-2xl md:border md:bg-card md:p-1.5 md:ps-4 md:shadow-md">
      <p
        role="status"
        className="min-w-0 flex-1 truncate text-body-sm text-muted-foreground"
      >
        Unsaved changes
      </p>
      <Button
        variant="ghost"
        className="max-md:h-11"
        disabled={pending}
        onClick={onDiscard}
      >
        Discard
      </Button>
      <Button className="max-md:h-11" disabled={pending} onClick={onSave}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  )
}
