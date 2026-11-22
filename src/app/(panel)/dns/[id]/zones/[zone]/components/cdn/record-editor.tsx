"use client"

import { Loader2, Plus, X } from "lucide-react"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useIsMobile } from "@/hooks/use-mobile"
import { fieldErrors } from "@/lib/api"
import type { CDNAddress, CDNRecord, CDNRecordFields } from "@/lib/services"
import { cdnFields, useCdnRecordChange } from "../../../../../api"
import { ChoiceSelect } from "../../../../../components/fields"
import {
  type CdnType,
  canCloud,
  cdnTtls,
  cdnTypes,
  relName,
  ttlLabel,
  upstreamLabels,
} from "./meta"
import { ToggleRow } from "./parts"

const FORM_ID = "cdn-record-form"

type Addr = { ip: string; weight: string; country: string; port: string }

const toAddr = (a: CDNAddress): Addr => ({
  ip: a.ip,
  weight: a.weight != null ? String(a.weight) : "",
  country: a.country ?? "",
  port: a.port != null ? String(a.port) : "",
})

const num = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : undefined)

// Add or change a record of an ArvanCloud domain. A record's type can't change.
export function CdnRecordEditor({
  open,
  onOpenChange,
  serverId,
  zone,
  record,
  start,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverId: string
  zone: string
  record?: CDNRecord
  // A new record's starting values (type, name…).
  start?: Partial<CDNRecordFields>
}) {
  const isMobile = useIsMobile()
  const change = useCdnRecordChange()
  const base: CDNRecordFields = record
    ? cdnFields(record)
    : { name: "", type: "A", cloud: false, ttl: 120, ...start }
  const [v, setV] = useState<CDNRecordFields>(base)
  const [addrs, setAddrs] = useState<Addr[]>(() =>
    base.addresses?.length
      ? base.addresses.map(toAddr)
      : [{ ip: "", weight: "", country: "", port: "" }],
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const type = v.type as CdnType
  const address = type === "A" || type === "AAAA"
  const cloud = canCloud(type) && v.cloud
  const title = record ? `Edit ${record.type} record` : "Add record"

  function set(p: Partial<CDNRecordFields>) {
    setV((x) => ({ ...x, ...p }))
    setErrors({})
  }

  function body(): CDNRecordFields {
    const out = cdnFields({ ...v, name: relName(v.name, zone) })
    if (address) {
      out.addresses = addrs
        .filter((a) => a.ip.trim())
        .map((a) => ({
          ip: a.ip.trim(),
          ...(num(a.weight) != null && { weight: num(a.weight) }),
          ...(num(a.port) != null && { port: num(a.port) }),
          ...(a.country.trim() && { country: a.country.trim().toUpperCase() }),
        }))
      if (out.addresses.length < 2) delete out.ip_filter
    } else {
      delete out.addresses
      delete out.ip_filter
    }
    if (!canCloud(type)) {
      out.cloud = false
      delete out.upstream_https
      delete out.host_header
    }
    return out
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const b = body()
    if (address && !b.addresses?.length)
      return setErrors({ addresses: "Add at least one address" })
    change.mutate(
      {
        id: serverId,
        zone,
        change: record
          ? { op: "update", recordId: record.id, record: b }
          : { op: "add", record: b },
      },
      {
        onSuccess: () => {
          toast.success(record ? "Record saved" : "Record added", {
            description: `${b.name === "@" ? zone : `${b.name}.${zone}`} ${b.type}`,
          })
          onOpenChange(false)
        },
        onError: (error) => {
          const f = fieldErrors(error)
          if (Object.keys(f).length) setErrors(f)
          else toast.error(error.message)
        },
      },
    )
  }

  const addrError = (i: number) =>
    errors[`addresses[${i}].ip`] ?? (i === 0 ? errors.addresses : undefined)

  const fields = (
    <div className="flex flex-col gap-5">
      {!record && (
        <Field label="Type">
          {(p) => (
            <ChoiceSelect
              id={p.id}
              value={type}
              onChange={(t) =>
                set({ type: t, cloud: canCloud(t) ? v.cloud : false })
              }
              items={cdnTypes.map((t) => ({
                value: t.type,
                label: t.type,
                detail: t.summary,
              }))}
            />
          )}
        </Field>
      )}
      <Field
        label="Name"
        error={errors.name}
        hint={`@ = ${zone} itself. "www" = www.${zone}; *.app covers every name under app.`}
      >
        {(p) => (
          <div className="flex min-w-0 items-center gap-2">
            <Input
              {...p}
              value={v.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="@"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 font-mono"
            />
            <span className="max-w-[45%] shrink-0 truncate font-mono text-body-sm text-ash">
              .{zone}
            </span>
          </div>
        )}
      </Field>

      {address && (
        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-medium">
            {type === "A" ? "IPv4 addresses" : "IPv6 addresses"}
          </span>
          {addrs.map((a, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id; order is the identity
              key={i}
              className="flex flex-col gap-1"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_5rem_4.5rem_auto] items-center gap-2">
                <Input
                  aria-label={`Address ${i + 1}`}
                  aria-invalid={addrError(i) ? true : undefined}
                  value={a.ip}
                  onChange={(e) => {
                    const next = [...addrs]
                    next[i] = { ...a, ip: e.target.value }
                    setAddrs(next)
                    setErrors({})
                  }}
                  placeholder={type === "A" ? "203.0.113.10" : "2001:db8::10"}
                  inputMode={type === "A" ? "decimal" : "text"}
                  autoCapitalize="none"
                  spellCheck={false}
                  className="font-mono"
                />
                <Input
                  aria-label={`Weight of address ${i + 1}`}
                  value={a.weight}
                  onChange={(e) => {
                    const next = [...addrs]
                    next[i] = { ...a, weight: e.target.value }
                    setAddrs(next)
                  }}
                  placeholder="Weight"
                  inputMode="numeric"
                />
                <Input
                  aria-label={`Country of address ${i + 1}`}
                  value={a.country}
                  onChange={(e) => {
                    const next = [...addrs]
                    next[i] = { ...a, country: e.target.value }
                    setAddrs(next)
                  }}
                  placeholder="IR"
                  maxLength={2}
                  autoCapitalize="characters"
                  className="uppercase"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove address ${i + 1}`}
                  disabled={addrs.length === 1}
                  onClick={() => setAddrs(addrs.filter((_, j) => j !== i))}
                >
                  <X />
                </Button>
              </div>
              {addrError(i) && (
                <p className="text-caption text-destructive">{addrError(i)}</p>
              )}
            </div>
          ))}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="max-md:h-10"
              onClick={() =>
                setAddrs([
                  ...addrs,
                  { ip: "", weight: "", country: "", port: "" },
                ])
              }
            >
              <Plus />
              Add an address
            </Button>
            <span className="text-caption text-muted-foreground">
              Weight and country are optional.
            </span>
          </div>
          {addrs.length > 1 && (
            <div className="grid gap-3 rounded-xl bg-subtle p-3 md:grid-cols-3">
              <Field label="Answer with">
                {(p) => (
                  <ChoiceSelect
                    id={p.id}
                    value={v.ip_filter?.count ?? "single"}
                    onChange={(count) =>
                      set({
                        ip_filter: {
                          order: "none",
                          geo_filter: "none",
                          ...v.ip_filter,
                          count,
                        },
                      })
                    }
                    items={[
                      { value: "single", label: "One address" },
                      { value: "multi", label: "Every address" },
                    ]}
                  />
                )}
              </Field>
              <Field label="Order">
                {(p) => (
                  <ChoiceSelect
                    id={p.id}
                    value={v.ip_filter?.order ?? "none"}
                    onChange={(order) =>
                      set({
                        ip_filter: {
                          count: "single",
                          geo_filter: "none",
                          ...v.ip_filter,
                          order,
                        },
                      })
                    }
                    items={[
                      { value: "none", label: "As listed" },
                      { value: "rr", label: "Round robin" },
                      { value: "weighted", label: "By weight" },
                    ]}
                  />
                )}
              </Field>
              <Field label="By visitor's place">
                {(p) => (
                  <ChoiceSelect
                    id={p.id}
                    value={v.ip_filter?.geo_filter ?? "none"}
                    onChange={(geo_filter) =>
                      set({
                        ip_filter: {
                          count: "single",
                          order: "none",
                          ...v.ip_filter,
                          geo_filter,
                        },
                      })
                    }
                    items={[
                      { value: "none", label: "No" },
                      { value: "country", label: "Country" },
                      { value: "location", label: "Nearest" },
                    ]}
                  />
                )}
              </Field>
            </div>
          )}
        </div>
      )}

      {!address &&
        type !== "TXT" &&
        type !== "SPF" &&
        type !== "DKIM" &&
        type !== "CAA" &&
        type !== "TLSA" && (
          <Field
            label={
              type === "MX"
                ? "Mail server"
                : type === "NS"
                  ? "Name server"
                  : "Points to"
            }
            error={errors.host}
          >
            {(p) => (
              <Input
                {...p}
                value={v.host ?? ""}
                onChange={(e) => set({ host: e.target.value })}
                placeholder={
                  type === "MX" ? "mail.example.com" : "app.example.net"
                }
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono"
              />
            )}
          </Field>
        )}

      {(type === "MX" || type === "SRV") && (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Priority" error={errors.priority}>
            {(p) => (
              <Input
                {...p}
                value={v.priority ?? ""}
                onChange={(e) => set({ priority: num(e.target.value) })}
                inputMode="numeric"
                placeholder="10"
              />
            )}
          </Field>
          {type === "SRV" && (
            <>
              <Field label="Weight" error={errors.weight}>
                {(p) => (
                  <Input
                    {...p}
                    value={v.weight ?? ""}
                    onChange={(e) => set({ weight: num(e.target.value) })}
                    inputMode="numeric"
                    placeholder="5"
                  />
                )}
              </Field>
              <Field label="Port" error={errors.port}>
                {(p) => (
                  <Input
                    {...p}
                    value={v.port ?? ""}
                    onChange={(e) => set({ port: num(e.target.value) })}
                    inputMode="numeric"
                    placeholder="5060"
                  />
                )}
              </Field>
            </>
          )}
        </div>
      )}

      {(type === "TXT" || type === "SPF" || type === "DKIM") && (
        <Field
          label="Text"
          error={errors.text}
          hint="Paste it as given, without quotes."
        >
          {(p) => (
            <Textarea
              {...p}
              value={v.text ?? ""}
              onChange={(e) => set({ text: e.target.value })}
              rows={3}
              spellCheck={false}
              className="font-mono text-body-sm"
              placeholder="v=spf1 include:_spf.example.com ~all"
            />
          )}
        </Field>
      )}

      {type === "CAA" && (
        <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
          <Field label="Tag">
            {(p) => (
              <ChoiceSelect
                id={p.id}
                value={v.tag ?? "issue"}
                onChange={(tag) => set({ tag })}
                items={[
                  { value: "issue", label: "issue" },
                  { value: "issuewild", label: "issuewild" },
                  { value: "iodef", label: "iodef" },
                ]}
              />
            )}
          </Field>
          <Field label="Value" error={errors.value}>
            {(p) => (
              <Input
                {...p}
                value={v.value ?? ""}
                onChange={(e) => set({ value: e.target.value })}
                placeholder="letsencrypt.org"
                className="font-mono"
              />
            )}
          </Field>
        </div>
      )}

      {type === "TLSA" && (
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["tlsa_usage", "Usage", "3"],
              ["tlsa_selector", "Selector", "1"],
              ["tlsa_matching_type", "Matching", "1"],
            ] as const
          ).map(([key, label, ph]) => (
            <Field key={key} label={label} error={errors[key]}>
              {(p) => (
                <Input
                  {...p}
                  value={v[key] ?? ""}
                  onChange={(e) => set({ [key]: e.target.value })}
                  placeholder={ph}
                  inputMode="numeric"
                />
              )}
            </Field>
          ))}
          <Field
            label="Certificate data"
            error={errors.certificate}
            className="col-span-3"
          >
            {(p) => (
              <Textarea
                {...p}
                value={v.certificate ?? ""}
                onChange={(e) => set({ certificate: e.target.value })}
                rows={3}
                className="font-mono text-body-sm"
              />
            )}
          </Field>
        </div>
      )}

      {canCloud(type) && (
        <div className="flex flex-col gap-3 rounded-xl border border-border p-3">
          <ToggleRow
            label="Through the CDN"
            hint={
              v.cloud
                ? "Visitors reach ArvanCloud, which hides the origin's address, caches and protects it."
                : "DNS only: visitors go straight to the address."
            }
            checked={v.cloud}
            onChange={(on) => set({ cloud: on })}
          />
          {cloud && (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Reach the origin by">
                {(p) => (
                  <ChoiceSelect
                    id={p.id}
                    value={v.upstream_https ?? "default"}
                    onChange={(upstream_https) => set({ upstream_https })}
                    items={Object.entries(upstreamLabels).map(
                      ([value, label]) => ({
                        value: value as keyof typeof upstreamLabels,
                        label,
                      }),
                    )}
                  />
                )}
              </Field>
              {(type === "CNAME" || type === "ANAME") && (
                <Field
                  label="Host header"
                  hint="What the origin sees as the site's name."
                >
                  {(p) => (
                    <ChoiceSelect
                      id={p.id}
                      value={v.host_header ?? "source"}
                      onChange={(host_header) => set({ host_header })}
                      items={[
                        { value: "source", label: "This name" },
                        { value: "dest", label: "The target's name" },
                      ]}
                    />
                  )}
                </Field>
              )}
            </div>
          )}
        </div>
      )}

      <Field
        label="TTL"
        hint={
          cloud
            ? "Through the CDN, ArvanCloud answers with its own short TTL."
            : "How long resolvers keep the answer."
        }
      >
        {(p) => (
          <ChoiceSelect
            id={p.id}
            value={String(v.ttl ?? 120)}
            onChange={(t) => set({ ttl: Number(t) as CDNRecordFields["ttl"] })}
            items={cdnTtls.map((t) => ({
              value: String(t),
              label: ttlLabel(t),
            }))}
          />
        )}
      </Field>
    </div>
  )

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </Button>
      <Button type="submit" form={FORM_ID} disabled={change.isPending}>
        {change.isPending && <Loader2 className="animate-spin" />}
        {record ? "Save" : "Add record"}
      </Button>
    </>
  )

  if (isMobile) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        header={
          <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-2 pb-2">
            <Button
              variant="ghost"
              className="h-11 justify-self-start text-body"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <span aria-hidden className="truncate text-body font-medium">
              {title}
            </span>
            <Button
              type="submit"
              form={FORM_ID}
              variant="ghost"
              disabled={change.isPending}
              className="h-11 justify-self-end text-body text-brand"
            >
              {record ? "Save" : "Add"}
            </Button>
          </div>
        }
        className="px-4 pt-5 pb-[calc(--spacing(8)+env(safe-area-inset-bottom))]"
      >
        <form id={FORM_ID} onSubmit={submit} noValidate>
          {fields}
        </form>
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>In {zone}, on ArvanCloud</SheetDescription>
        </SheetHeader>
        <form
          id={FORM_ID}
          onSubmit={submit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-6">{fields}</div>
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            {footer}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
