"use client"

import { Plus, X } from "lucide-react"
import type { ReactNode } from "react"

import {
  type Engine,
  engineMeta,
  engines,
} from "@/app/(panel)/databases/components/meta"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { MonitorConfig } from "@/lib/services"
import { cn } from "@/lib/utils"
import { ToggleRow } from "../../cronjobs/components/editor-parts"
import {
  type Draft,
  defaultPort,
  type Errors,
  newRow,
  type Row,
  serverLocations,
  uses,
} from "./draft"
import { type Kind, KindIcon, kindGroups, kindMeta, kinds } from "./meta"

export type FieldProps = {
  d: Draft
  set: (patch: Partial<Draft>) => void
  setC: (patch: Partial<MonitorConfig>) => void
  errors: Errors
  phone: boolean
  // Names of the secrets already saved ("password", "token", "header:X-Key").
  saved: string[]
}

const mono = "font-mono placeholder:font-sans placeholder:text-ash"
const plain = { autoCapitalize: "none", autoCorrect: "off", spellCheck: false }

// ---- kind picker ----

export function KindPicker({
  value,
  onChange,
  phone,
}: {
  value: Kind
  onChange: (k: Kind) => void
  phone: boolean
}) {
  return (
    <fieldset className={cn("flex flex-col", phone ? "gap-4" : "gap-5")}>
      <legend className="sr-only">What to watch</legend>
      {kindGroups.map((g) => (
        <div key={g.value} className="flex flex-col gap-2">
          <p className="font-label text-caption tracking-label text-ash uppercase">
            {g.label}
          </p>
          <div
            className={cn(
              phone
                ? "flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border"
                : "grid grid-cols-1 gap-2 sm:grid-cols-2",
            )}
          >
            {kinds
              .filter((k) => k.group === g.value)
              .map((k) => (
                <label
                  key={k.value}
                  className={cn(
                    "group flex cursor-pointer items-center gap-3 px-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                    phone
                      ? "min-h-16 py-3 has-checked:bg-brand-soft"
                      : "min-h-15 rounded-lg border border-border py-2.5 hover:bg-subtle has-checked:border-brand has-checked:bg-brand-soft",
                  )}
                >
                  <input
                    type="radio"
                    name="monitor-kind"
                    value={k.value}
                    checked={value === k.value}
                    onChange={() => onChange(k.value)}
                    className="sr-only"
                  />
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-has-checked:bg-background group-has-checked:text-brand-strong">
                    <KindIcon kind={k.value} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm font-medium">
                      {k.label}
                    </span>
                    <span className="block truncate text-caption text-muted-foreground">
                      {k.short}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="size-4 shrink-0 rounded-full border border-input bg-background transition-[border-width,border-color] group-has-checked:border-[5px] group-has-checked:border-brand"
                  />
                </label>
              ))}
          </div>
        </div>
      ))}
    </fieldset>
  )
}

export function FixedKind({ kind }: { kind: Kind }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <KindIcon kind={kind} className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-body-sm font-medium">{kindMeta[kind].label}</p>
        <p className="text-caption text-muted-foreground">
          {kindMeta[kind].short}. Set when the monitor was made: for something
          else, make a new one.
        </p>
      </div>
    </div>
  )
}

// ---- small controls ----

// A select: native on phones, Base UI on desktop.
export function Pick<T extends string>({
  id,
  value,
  onChange,
  items,
  phone,
  className,
}: {
  id?: string
  value: T
  onChange: (v: T) => void
  items: { value: T; label: string; detail?: string }[]
  phone: boolean
  className?: string
}) {
  if (phone) {
    return (
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          "h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
      >
        {items.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => v != null && onChange(v as T)}
    >
      <SelectTrigger id={id} className={cn("h-10 w-full", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-72">
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="truncate">{o.label}</span>
            {o.detail && (
              <span className="ms-auto truncate font-mono text-caption text-ash">
                {o.detail}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// A labelled segmented choice that scrolls sideways when narrow.
function Choice<T extends string>({
  label,
  hint,
  items,
  value,
  onChange,
}: {
  label: string
  hint?: ReactNode
  items: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-body-sm font-medium">{label}</p>
      <div className="[scrollbar-width:none] overflow-x-auto">
        <Segmented
          label={label}
          items={items}
          value={value}
          onChange={onChange}
        />
      </div>
      {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
    </div>
  )
}

// Name/value rows (request headers).
export function RowsEditor({
  rows,
  onChange,
  secret,
  addLabel,
  namePlaceholder,
  valuePlaceholder,
}: {
  rows: Row[]
  onChange: (rows: Row[]) => void
  secret?: boolean
  addLabel: string
  namePlaceholder: string
  valuePlaceholder: string
}) {
  const put = (key: string, patch: Partial<Row>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.key} className="flex items-start gap-2">
          <Input
            aria-label="Header name"
            value={r.name}
            disabled={r.saved}
            onChange={(e) => put(r.key, { name: e.target.value })}
            placeholder={namePlaceholder}
            className={cn("w-2/5 shrink-0", mono)}
            {...plain}
          />
          <div className="min-w-0 flex-1">
            {secret ? (
              <SecretInput
                aria-label={`${r.name || "Header"} value`}
                label="value"
                value={r.value}
                onChange={(e) => put(r.key, { value: e.target.value })}
                placeholder={
                  r.saved ? "Saved: blank keeps it" : valuePlaceholder
                }
              />
            ) : (
              <Input
                aria-label={`${r.name || "Header"} value`}
                value={r.value}
                onChange={(e) => put(r.key, { value: e.target.value })}
                placeholder={valuePlaceholder}
                className={mono}
                {...plain}
              />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Remove"
            className="shrink-0 md:size-9"
            onClick={() => onChange(rows.filter((x) => x.key !== r.key))}
          >
            <X />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        className="h-11 justify-start self-stretch border-dashed md:h-9 md:self-start"
        onClick={() => onChange([...rows, newRow()])}
      >
        <Plus />
        {addLabel}
      </Button>
    </div>
  )
}

function HostPort({
  d,
  set,
  setC,
  errors,
  hostLabel = "Host",
}: FieldProps & { hostLabel?: string }) {
  const def = defaultPort(d)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
      <Field label={hostLabel} error={errors["config.host"]}>
        {(p) => (
          <Input
            {...p}
            value={d.c.host ?? ""}
            onChange={(e) => setC({ host: e.target.value })}
            placeholder="db.example.com or 10.0.0.5"
            className={mono}
            inputMode="url"
            {...plain}
          />
        )}
      </Field>
      <Field label="Port" error={errors["config.port"]}>
        {(p) => (
          <Input
            {...p}
            value={d.port}
            onChange={(e) => set({ port: e.target.value.replace(/\D/g, "") })}
            placeholder={def ? String(def) : "Port"}
            inputMode="numeric"
            className="tabular-nums placeholder:text-ash"
          />
        )}
      </Field>
    </div>
  )
}

const urlPlaceholders: Partial<Record<Kind, string>> = {
  http: "https://example.com/health",
  websocket: "wss://example.com/socket",
  socketio: "https://example.com",
  elasticsearch: "https://search.example.com:9200",
}

// ---- "What to check": the target of each kind ----

export function TargetFields(props: FieldProps) {
  const { d, setC, errors, phone } = props
  const k = d.kind
  const c = d.c
  return (
    <>
      {uses.url(k) && (
        <div className={cn("flex gap-3", phone ? "flex-col" : "items-start")}>
          {k === "http" && (
            <Field
              label="Method"
              className={phone ? undefined : "w-32 shrink-0"}
            >
              {(p) => (
                <Pick
                  {...p}
                  phone={phone}
                  value={c.method || "GET"}
                  onChange={(method) => setC({ method })}
                  items={(
                    [
                      "GET",
                      "HEAD",
                      "POST",
                      "PUT",
                      "PATCH",
                      "DELETE",
                      "OPTIONS",
                    ] as const
                  ).map((m) => ({ value: m, label: m }))}
                />
              )}
            </Field>
          )}
          <Field
            label="Address"
            error={errors["config.url"]}
            className="min-w-0 flex-1"
          >
            {(p) => (
              <Input
                {...p}
                value={c.url ?? ""}
                onChange={(e) => setC({ url: e.target.value })}
                onBlur={() => {
                  const u = (c.url ?? "").trim()
                  if (u && !/^[a-z]+:\/\//i.test(u)) {
                    setC({
                      url: `${k === "websocket" ? "wss" : "https"}://${u}`,
                    })
                  }
                }}
                placeholder={urlPlaceholders[k]}
                type="url"
                inputMode="url"
                className={mono}
                {...plain}
              />
            )}
          </Field>
        </div>
      )}

      {k === "http" && c.method !== "GET" && c.method !== "HEAD" && (
        <Field
          label="Body"
          hint="Sent as is. Add a Content-Type header for JSON."
        >
          {(p) => (
            <Textarea
              {...p}
              value={c.body ?? ""}
              onChange={(e) => setC({ body: e.target.value })}
              rows={3}
              placeholder='{"ping": true}'
              className={mono}
              {...plain}
            />
          )}
        </Field>
      )}

      {k === "database" && (
        <Field label="Database" error={errors["config.engine"]}>
          {(p) => (
            <Pick
              {...p}
              phone={phone}
              value={(c.engine || "postgres") as Engine}
              onChange={(engine) => setC({ engine: engine as Engine })}
              items={engines.map((e) => ({
                value: e.value,
                label: e.label,
                detail: String(e.port),
              }))}
            />
          )}
        </Field>
      )}

      {uses.hostPort(k) && <HostPort {...props} />}

      {k === "ping" && (
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
          <Field label="Host" error={errors["config.host"]}>
            {(p) => (
              <Input
                {...p}
                value={c.host ?? ""}
                onChange={(e) => setC({ host: e.target.value })}
                placeholder="example.com or 10.0.0.5"
                className={mono}
                inputMode="url"
                {...plain}
              />
            )}
          </Field>
          <Field label="Packets" error={errors["config.count"]}>
            {(p) => (
              <Input
                {...p}
                value={d.count}
                onChange={(e) =>
                  props.set({ count: e.target.value.replace(/\D/g, "") })
                }
                placeholder="3"
                inputMode="numeric"
                className="tabular-nums placeholder:text-ash"
              />
            )}
          </Field>
        </div>
      )}

      {k === "tls" && (
        <Field
          label="Name to ask for"
          hint="Optional (SNI). When the certificate is for a name other than the host."
        >
          {(p) => (
            <Input
              {...p}
              value={c.server_name ?? ""}
              onChange={(e) => setC({ server_name: e.target.value })}
              placeholder="example.com"
              className={mono}
              {...plain}
            />
          )}
        </Field>
      )}

      {k === "database" && (
        <Field
          label={engineMeta[(c.engine || "postgres") as Engine].dbLabel}
          hint="Optional."
        >
          {(p) => (
            <Input
              {...p}
              value={c.database ?? ""}
              onChange={(e) => setC({ database: e.target.value })}
              placeholder={
                engineMeta[(c.engine || "postgres") as Engine].dbPlaceholder
              }
              className={mono}
              {...plain}
            />
          )}
        </Field>
      )}

      {uses.tlsMode(k) && <TlsModeField {...props} />}

      {k === "dns" && (
        <>
          <Field label="Name to look up" error={errors["config.name"]}>
            {(p) => (
              <Input
                {...p}
                value={c.name ?? ""}
                onChange={(e) => setC({ name: e.target.value })}
                placeholder="example.com"
                className={mono}
                {...plain}
              />
            )}
          </Field>
          <Choice
            label="Record"
            items={(["A", "AAAA", "CNAME", "MX", "NS", "TXT"] as const).map(
              (r) => ({
                value: r,
                label: r,
              }),
            )}
            value={c.record_type || "A"}
            onChange={(record_type) => setC({ record_type })}
          />
          <Field
            label="DNS server"
            error={errors["config.resolver"]}
            hint={
              serverLocations(d).length
                ? "Required when checked from a server, e.g. 1.1.1.1 or 10.0.0.2:53."
                : "Optional: blank asks Morche's own resolver. e.g. 1.1.1.1 or 10.0.0.2:53."
            }
          >
            {(p) => (
              <Input
                {...p}
                value={c.resolver ?? ""}
                onChange={(e) => setC({ resolver: e.target.value })}
                placeholder={
                  serverLocations(d).length
                    ? "1.1.1.1"
                    : "The system's resolver"
                }
                className={mono}
                {...plain}
              />
            )}
          </Field>
        </>
      )}

      {k === "docker" && (
        <Field
          label="Container"
          error={errors["config.container"]}
          hint="Its name or id. Up = running (and healthy, when it has a health check)."
        >
          {(p) => (
            <Input
              {...p}
              value={c.container ?? ""}
              onChange={(e) => setC({ container: e.target.value })}
              placeholder="web-app"
              className={mono}
              {...plain}
            />
          )}
        </Field>
      )}

      {k === "systemd" && (
        <Field
          label="Unit"
          error={errors["config.unit"]}
          hint="Up = active. Activating or reloading counts as degraded."
        >
          {(p) => (
            <Input
              {...p}
              value={c.unit ?? ""}
              onChange={(e) => setC({ unit: e.target.value })}
              placeholder="nginx.service"
              className={mono}
              {...plain}
            />
          )}
        </Field>
      )}

      {k === "command" && (
        <Field
          label="Command"
          error={errors["config.script"]}
          hint="Runs in the login user's shell. Exit 0 = up, 1 = degraded, anything else = down; the last line it prints becomes the message."
        >
          {(p) => (
            <Textarea
              {...p}
              value={c.script ?? ""}
              onChange={(e) => setC({ script: e.target.value })}
              rows={4}
              placeholder={
                'test "$(df --output=pcent / | tail -1 | tr -dc 0-9)" -lt 90'
              }
              className={mono}
              {...plain}
            />
          )}
        </Field>
      )}

      {(k === "docker" || k === "command") && (
        <ToggleRow
          id="monitor-sudo"
          label="Run with sudo"
          hint="Through sudo -n: the login user needs passwordless sudo."
          checked={!!c.sudo}
          onChange={(sudo) => setC({ sudo })}
        />
      )}

      {uses.ignoreTls(k) && (k !== "tcp" || c.tls_mode === "tls") && (
        <ToggleRow
          id="monitor-ignore-tls"
          label="Accept any certificate"
          hint="For self-signed certificates. The certificate's dates are still read."
          checked={!!c.ignore_tls}
          onChange={(ignore_tls) => setC({ ignore_tls })}
        />
      )}
    </>
  )
}

function TlsModeField({ d, setC }: FieldProps) {
  const k = d.kind
  if (k === "database") {
    return (
      <Choice
        label="Encryption"
        items={[
          { value: "disable", label: "Off" },
          { value: "require", label: "Required" },
          { value: "verify", label: "Verify certificate" },
        ]}
        value={(d.c.tls_mode || "disable") as "disable"}
        onChange={(tls_mode) => setC({ tls_mode })}
      />
    )
  }
  if (k === "smtp") {
    return (
      <Choice
        label="Encryption"
        hint="STARTTLS on 587, TLS from the start on 465, none on 25."
        items={[
          { value: "starttls", label: "STARTTLS" },
          { value: "tls", label: "TLS" },
          { value: "none", label: "None" },
        ]}
        value={(d.c.tls_mode || "starttls") as "starttls"}
        onChange={(tls_mode) => setC({ tls_mode })}
      />
    )
  }
  return (
    <Choice
      label="Encryption"
      items={[
        { value: "none", label: "Plain" },
        { value: "tls", label: "TLS" },
      ]}
      value={(d.c.tls_mode === "tls" ? "tls" : "none") as "none"}
      onChange={(tls_mode) => setC({ tls_mode })}
    />
  )
}

// ---- sign-in ----

export const usesSignIn = (k: Kind) =>
  uses.username(k) || uses.password(k) || uses.token(k) || uses.headers(k)

export function SignInFields({ d, set, setC, saved }: FieldProps) {
  const k = d.kind
  const has = (name: string) => saved.includes(name)
  const userLabel =
    k === "http" || k === "elasticsearch" ? "Username (basic auth)" : "Username"
  return (
    <>
      {uses.username(k) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={userLabel}>
            {(p) => (
              <Input
                {...p}
                value={d.c.username ?? ""}
                onChange={(e) => setC({ username: e.target.value })}
                placeholder={
                  k === "database"
                    ? engineMeta[(d.c.engine || "postgres") as Engine].user ||
                      "Optional"
                    : "Optional"
                }
                autoComplete="off"
                className="placeholder:text-ash"
                {...plain}
              />
            )}
          </Field>
          {uses.password(k) && (
            <Field label="Password">
              {(p) => (
                <SecretInput
                  {...p}
                  value={d.password}
                  onChange={(e) => set({ password: e.target.value })}
                  placeholder={
                    has("password") ? "Saved: blank keeps it" : "Optional"
                  }
                  autoComplete="new-password"
                />
              )}
            </Field>
          )}
        </div>
      )}
      {uses.token(k) && (
        <Field
          label={k === "nats" ? "Auth token" : "Bearer token"}
          hint={k === "nats" ? undefined : "Sent as Authorization: Bearer …"}
        >
          {(p) => (
            <SecretInput
              {...p}
              label="token"
              value={d.token}
              onChange={(e) => set({ token: e.target.value })}
              placeholder={has("token") ? "Saved: blank keeps it" : "Optional"}
              autoComplete="off"
            />
          )}
        </Field>
      )}
      {uses.headers(k) && (
        <div className="flex flex-col gap-1.5">
          <p className="text-body-sm font-medium">Secret headers</p>
          <p className="text-caption text-muted-foreground">
            API keys and the like: kept encrypted, never shown again.
          </p>
          <RowsEditor
            rows={d.secretHeaders}
            onChange={(secretHeaders) => set({ secretHeaders })}
            secret
            addLabel="Add secret header"
            namePlaceholder="X-Api-Key"
            valuePlaceholder="Value"
          />
        </div>
      )}
    </>
  )
}

// ---- what counts as up ----

export const usesAnswer = (k: Kind) =>
  k === "http" ||
  k === "websocket" ||
  k === "tcp" ||
  k === "udp" ||
  k === "dns" ||
  k === "elasticsearch"

export function AnswerFields({ d, set, setC, errors, phone }: FieldProps) {
  const k = d.kind
  const c = d.c
  return (
    <>
      {k === "http" && (
        <Field
          label="Accepted status codes"
          error={errors["config.statuses"]}
          hint="Codes or ranges, comma separated: 200-299, 301, 4xx. Blank = 200–399."
        >
          {(p) => (
            <Input
              {...p}
              value={d.statuses}
              onChange={(e) => set({ statuses: e.target.value })}
              placeholder="200-399"
              className={mono}
              {...plain}
            />
          )}
        </Field>
      )}

      {k === "elasticsearch" && (
        <Choice
          label="Counted as up"
          hint="Yellow = every primary shard is there but some replicas aren't."
          items={[
            { value: "green", label: "Green only" },
            { value: "yellow", label: "Green or yellow" },
          ]}
          value={(c.min_health || "green") as "green"}
          onChange={(min_health) => setC({ min_health })}
        />
      )}

      {uses.sendExpect(k) && (
        <>
          <Field
            label={k === "websocket" ? "Message to send" : "Send"}
            error={errors["config.send"]}
            hint={
              k === "udp"
                ? "Required: a UDP service only answers a request. \\n and \\r\\n are understood."
                : "Optional, once connected. \\n and \\r\\n are understood."
            }
          >
            {(p) => (
              <Input
                {...p}
                value={c.send ?? ""}
                onChange={(e) => setC({ send: e.target.value })}
                placeholder={
                  k === "websocket" ? '{"type":"ping"}' : "PING\\r\\n"
                }
                className={mono}
                {...plain}
              />
            )}
          </Field>
          <Field label="The answer must contain" hint="Optional.">
            {(p) => (
              <Input
                {...p}
                value={c.expect ?? ""}
                onChange={(e) => setC({ expect: e.target.value })}
                placeholder={k === "websocket" ? "pong" : "+PONG"}
                className={mono}
                {...plain}
              />
            )}
          </Field>
        </>
      )}

      {k === "http" && (
        <div className="flex flex-col gap-3">
          <Field
            label="Text in the page"
            error={errors["config.keyword"]}
            hint="Optional: checked in the answer's body."
          >
            {(p) => (
              <Input
                {...p}
                value={c.keyword ?? ""}
                onChange={(e) => setC({ keyword: e.target.value })}
                placeholder="Welcome"
                className={mono}
                {...plain}
              />
            )}
          </Field>
          {c.keyword && (
            <div className={cn("flex gap-4", phone ? "flex-col" : "items-end")}>
              <Choice
                label="Up when the text is"
                items={[
                  { value: "contains", label: "There" },
                  { value: "absent", label: "Missing" },
                  { value: "regex", label: "Matched (regex)" },
                ]}
                value={(c.keyword_mode || "contains") as "contains"}
                onChange={(keyword_mode) => setC({ keyword_mode })}
              />
              <div className="flex-1">
                <ToggleRow
                  id="monitor-case"
                  label="Match case"
                  checked={!!c.keyword_case}
                  onChange={(keyword_case) => setC({ keyword_case })}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {k === "http" && (
        <div className="flex flex-col gap-3">
          <Field
            label="JSON value"
            error={errors["config.json_path"]}
            hint="Optional: a value in a JSON answer, e.g. status or data.items[0].ok."
          >
            {(p) => (
              <Input
                {...p}
                value={c.json_path ?? ""}
                onChange={(e) => setC({ json_path: e.target.value })}
                placeholder="status"
                className={mono}
                {...plain}
              />
            )}
          </Field>
          {c.json_path?.trim() && (
            <div className="grid grid-cols-[10rem_minmax(0,1fr)] gap-3">
              <Field label="Is">
                {(p) => (
                  <Pick
                    {...p}
                    phone={phone}
                    value={c.json_op || "eq"}
                    onChange={(json_op) => setC({ json_op })}
                    items={[
                      { value: "eq", label: "Equal to" },
                      { value: "ne", label: "Not equal to" },
                      { value: "contains", label: "Contains" },
                      { value: "gt", label: "Greater than" },
                      { value: "lt", label: "Less than" },
                      { value: "exists", label: "There at all" },
                    ]}
                  />
                )}
              </Field>
              {c.json_op !== "exists" && (
                <Field label="Value">
                  {(p) => (
                    <Input
                      {...p}
                      value={c.json_value ?? ""}
                      onChange={(e) => setC({ json_value: e.target.value })}
                      placeholder="ok"
                      className={mono}
                      {...plain}
                    />
                  )}
                </Field>
              )}
            </div>
          )}
        </div>
      )}

      {k === "http" && (
        <ToggleRow
          id="monitor-no-redirects"
          label="Don't follow redirects"
          hint="Then a 301/302 is judged by the status codes above."
          checked={!!c.no_redirects}
          onChange={(no_redirects) => setC({ no_redirects })}
        />
      )}

      {k === "dns" && (
        <Field
          label="The answer must include"
          error={errors["config.expected"]}
          hint="Optional, comma separated: IPs, names or text the records must hold."
        >
          {(p) => (
            <Input
              {...p}
              value={d.expected}
              onChange={(e) => set({ expected: e.target.value })}
              placeholder="203.0.113.10, 203.0.113.11"
              className={mono}
              {...plain}
            />
          )}
        </Field>
      )}
    </>
  )
}

// ---- request headers (plain) ----

export function HeaderFields({ d, set }: FieldProps) {
  return (
    <RowsEditor
      rows={d.headers}
      onChange={(headers) => set({ headers })}
      addLabel="Add header"
      namePlaceholder="Accept"
      valuePlaceholder="application/json"
    />
  )
}
