"use client"

import { Loader2 } from "lucide-react"
import { type FormEvent, useCallback, useState } from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import type { DNSRecord, DNSRecordBody } from "@/lib/services"
import { recordBody, useRecordChange } from "../api"
import { ChoiceSelect } from "./fields"
import {
  absoluteName,
  caaTags,
  formatTtl,
  type RecordType,
  recordTypes,
  relativeName,
  ttlChoices,
  typeMeta,
  zoneDisplayName,
} from "./meta"

const FORM_ID = "dns-record-form"

const focusOnPointer = (el: HTMLInputElement | null) => {
  if (el && matchMedia("(pointer: fine)").matches) el.focus()
}

type Values = {
  type: RecordType
  name: string
  value: string
  ttl: string
  priority: string
  weight: string
  port: string
  flags: string
  tag: string
  comments: string
  disabled: boolean
}

function initial(zone: string, record?: DNSRecord, type?: RecordType): Values {
  return {
    type: (record?.type as RecordType) ?? type ?? "A",
    name: record ? relativeName(record.name, zone) : "",
    value: record?.value ?? "",
    ttl: String(record?.ttl ?? 3600),
    priority: String(record?.priority ?? 10),
    weight: String(record?.weight ?? 5),
    port: String(record?.port ?? ""),
    flags: String(record?.flags ?? 0),
    tag: record?.tag ?? "issue",
    comments: record?.comments ?? "",
    disabled: record?.disabled ?? false,
  }
}

const whole = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : Number.NaN)

// Add a record, or change one. On a change the type stays: Technitium can't
// turn an A record into a CNAME, so that's delete and add.
export function RecordEditorLayer({
  open,
  onOpenChange,
  serverId,
  zone,
  record,
  type,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverId: string
  zone: string
  record?: DNSRecord
  // The type a new record starts as.
  type?: RecordType
}) {
  const isMobile = useIsMobile()
  const change = useRecordChange()
  const [values, setValues] = useState(() => initial(zone, record, type))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const focusName = useCallback(focusOnPointer, [])
  const meta = typeMeta(values.type)
  const title = record ? `Edit ${record.type} record` : "Add record"
  const description = `In ${zoneDisplayName(zone)}`

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors(({ [key]: _, ...rest }) => rest)
  }

  function build():
    | { body: DNSRecordBody }
    | { missing: Record<string, string> } {
    const missing: Record<string, string> = {}
    const body: DNSRecordBody = {
      name: absoluteName(values.name, zone),
      type: values.type,
      value: values.value.trim(),
      ttl: whole(values.ttl),
      comments: values.comments.trim(),
      disabled: values.disabled,
    }
    if (!body.value) missing.value = `Enter the ${meta?.value.toLowerCase()}`
    if (Number.isNaN(body.ttl)) missing.ttl = "Seconds, a whole number"
    const number = (key: "priority" | "weight" | "port" | "flags") => {
      const n = whole(values[key])
      if (Number.isNaN(n)) missing[key] = "A whole number"
      else body[key] = n
    }
    if (values.type === "MX") number("priority")
    if (values.type === "SRV") {
      number("priority")
      number("weight")
      number("port")
    }
    if (values.type === "CAA") {
      number("flags")
      body.tag = values.tag
    }
    return Object.keys(missing).length ? { missing } : { body }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const built = build()
    if ("missing" in built) return setErrors(built.missing)
    const { body } = built
    change.mutate(
      {
        id: serverId,
        zone,
        change: record
          ? { op: "update", current: recordBody(record), record: body }
          : { op: "add", record: body },
      },
      {
        onSuccess: () => {
          toast.success(record ? "Record saved" : "Record added", {
            description: `${relativeName(body.name, zone)} ${body.type}`,
          })
          onOpenChange(false)
        },
        onError: (error) => {
          const fields: Record<string, string> = {}
          for (const [key, message] of Object.entries(fieldErrors(error))) {
            fields[key.replace(/^new\./, "")] ??= message
          }
          if (Object.keys(fields).length) setErrors(fields)
          else toast.error(error.message)
        },
      },
    )
  }

  const nameSuffix = zone === "." ? "" : `.${zone}`

  const fields = (
    <>
      {!record && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-body-sm font-medium">Type</legend>
          <div className="flex flex-wrap gap-1.5">
            {recordTypes.map((t) => (
              <button
                key={t.type}
                type="button"
                aria-pressed={values.type === t.type}
                onClick={() => set("type", t.type)}
                className="h-10 min-w-14 rounded-lg border border-input px-3 font-mono text-body-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong md:h-8"
              >
                {t.type}
              </button>
            ))}
          </div>
          <p className="text-caption text-muted-foreground">{meta?.summary}</p>
        </fieldset>
      )}
      <Field
        label="Name"
        error={errors.name}
        hint={
          values.name.trim() && values.name.trim() !== "@"
            ? absoluteName(values.name, zone)
            : `@ or blank = ${zoneDisplayName(zone)} itself`
        }
      >
        {(p) => (
          <div className="flex items-center gap-2">
            <Input
              {...p}
              ref={record ? undefined : focusName}
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={values.type === "SRV" ? "_sip._tcp" : "@"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 font-mono"
            />
            {nameSuffix && (
              <span className="max-w-[45%] truncate font-mono text-body-sm text-ash">
                {nameSuffix}
              </span>
            )}
          </div>
        )}
      </Field>
      {(values.type === "MX" || values.type === "SRV") && (
        <div className="grid grid-cols-3 gap-3">
          <NumberField
            label={values.type === "MX" ? "Preference" : "Priority"}
            value={values.priority}
            error={errors.priority}
            onChange={(v) => set("priority", v)}
          />
          {values.type === "SRV" && (
            <>
              <NumberField
                label="Weight"
                value={values.weight}
                error={errors.weight}
                onChange={(v) => set("weight", v)}
              />
              <NumberField
                label="Port"
                value={values.port}
                error={errors.port}
                onChange={(v) => set("port", v)}
              />
            </>
          )}
        </div>
      )}
      {values.type === "CAA" && (
        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <NumberField
            label="Flags"
            value={values.flags}
            error={errors.flags}
            onChange={(v) => set("flags", v)}
          />
          <Field label="Tag" error={errors.tag}>
            {(p) => (
              <ChoiceSelect
                id={p.id}
                value={values.tag}
                onChange={(v) => set("tag", v)}
                items={caaTags.map((t) => ({ value: t, label: t }))}
              />
            )}
          </Field>
        </div>
      )}
      <Field
        label={meta?.value ?? "Value"}
        error={errors.value}
        hint={meta?.hint}
      >
        {(p) =>
          values.type === "TXT" ? (
            <Textarea
              {...p}
              value={values.value}
              onChange={(e) => set("value", e.target.value)}
              placeholder={meta?.placeholder}
              rows={3}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono text-body-sm"
            />
          ) : (
            <Input
              {...p}
              value={values.value}
              onChange={(e) => set("value", e.target.value)}
              placeholder={meta?.placeholder}
              inputMode={
                values.type === "A" || values.type === "AAAA"
                  ? "decimal"
                  : "url"
              }
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono"
            />
          )
        }
      </Field>
      <Field
        label="TTL"
        error={errors.ttl}
        hint={
          Number.isNaN(whole(values.ttl))
            ? "How long resolvers may keep the answer, in seconds."
            : `Resolvers keep the answer for ${formatTtl(whole(values.ttl))}.`
        }
      >
        {(p) => (
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input
              {...p}
              value={values.ttl}
              onChange={(e) => set("ttl", e.target.value)}
              inputMode="numeric"
              className="font-mono md:w-28"
            />
            <div className="flex flex-wrap gap-1.5">
              {ttlChoices.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={whole(values.ttl) === c.value}
                  onClick={() => set("ttl", String(c.value))}
                  className="h-9 rounded-full border border-input px-3 text-caption outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong md:h-7"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Field>
      <Field label="Note" error={errors.comments}>
        {(p) => (
          <Input
            {...p}
            value={values.comments}
            onChange={(e) => set("comments", e.target.value)}
            placeholder="Optional: what it's for"
          />
        )}
      </Field>
      {/* biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox renders the control inside */}
      <label className="flex items-start gap-2.5 text-body-sm max-md:min-h-11">
        <Checkbox
          checked={values.disabled}
          onCheckedChange={(on) => set("disabled", on)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Disabled</span>
          <span className="block text-caption text-muted-foreground">
            Kept in the zone, but the server doesn't answer with it.
          </span>
        </span>
      </label>
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
        <form
          id={FORM_ID}
          onSubmit={submit}
          noValidate
          className="flex flex-col gap-5"
        >
          {fields}
        </form>
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <form
          id={FORM_ID}
          onSubmit={submit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
            {fields}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={change.isPending}>
              {change.isPending && <Loader2 className="animate-spin" />}
              {record ? "Save" : "Add record"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function NumberField({
  label,
  value,
  error,
  onChange,
}: {
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <Field label={label} error={error}>
      {(p) => (
        <Input
          {...p}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="numeric"
          className="font-mono"
        />
      )}
    </Field>
  )
}
