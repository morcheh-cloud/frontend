"use client"

import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { Field } from "@/components/field"
import { ColorPicker } from "@/components/palette"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useIsMobile } from "@/hooks/use-mobile"
import { fieldErrors } from "@/lib/api"
import type {
  App,
  AppCategory,
  AppCreateBody,
  AppUpdateBody,
} from "@/lib/services"
import { useSaveApp, useUploadLogo } from "../api"
import {
  type AccountDraft,
  AccountsEditor,
  accountDrafts,
  accountsBody,
} from "./accounts-editor"
import { type LogoDraft, LogoPicker, logoDraft } from "./logo-picker"
import {
  type AppColor,
  appColorKeys,
  safeHref,
  suggestName,
  withScheme,
} from "./meta"

type Values = {
  address: string
  name: string
  // The name was typed, so the address no longer suggests one.
  named: boolean
  category: string
  logo: LogoDraft
  color: AppColor
  critical: boolean
  note: string
  accounts: AccountDraft[]
}

const NONE = "none"
const FORM_ID = "app-form"

const initialValues = (
  app: App | undefined,
  category: string | undefined,
  categories: AppCategory[],
): Values => {
  const known = (id?: string) =>
    id && categories.some((c) => c.id === id) ? id : NONE
  return {
    address: app?.address ?? "",
    name: app?.name ?? "",
    named: !!app,
    category: known(app ? app.category_id : category),
    logo: logoDraft(app),
    color: (appColorKeys as readonly string[]).includes(app?.color ?? "")
      ? (app?.color as AppColor)
      : "slate",
    critical: app?.critical ?? false,
    note: app?.note ?? "",
    accounts: app ? accountDrafts(app.accounts) : [],
  }
}

// What's wrong before anything is sent.
function check(v: Values, app?: App) {
  const errors: Record<string, string> = {}
  const address = withScheme(v.address)
  if (!address) errors.address = "Enter the service's address."
  else if (!safeHref(address)) {
    errors.address = /^https?:\/\/[^/]*@/i.test(address)
      ? "Keep logins in an account below, not in the address."
      : "Use an http:// or https:// address."
  }
  if (!v.name.trim()) errors.name = "Give the service a name."
  if (v.logo.kind === "upload" && !v.logo.file && app?.logo_kind !== "upload")
    errors.logo = "Choose an image to upload."
  return errors
}

function createBody(v: Values): AppCreateBody {
  return {
    address: withScheme(v.address),
    name: v.name.trim(),
    category_id: v.category === NONE ? undefined : v.category,
    color: v.color,
    critical: v.critical,
    note: v.note.trim(),
    logo_kind: v.logo.kind === "icon" ? "icon" : "auto",
    logo_icon: v.logo.kind === "icon" ? v.logo.icon : undefined,
    accounts: accountsBody(v.accounts),
  }
}

function updateBody(v: Values, app: App): AppUpdateBody {
  const category = v.category === NONE ? "" : v.category
  return {
    address: withScheme(v.address),
    name: v.name.trim(),
    // Only when it changes: a new category puts the service at its end.
    category_id: category !== (app.category_id ?? "") ? category : undefined,
    color: v.color,
    critical: v.critical,
    note: v.note.trim(),
    // An upload sets its own kind once it's stored.
    logo_kind: v.logo.kind === "upload" ? undefined : v.logo.kind,
    logo_icon: v.logo.kind === "icon" ? v.logo.icon : undefined,
    accounts: accountsBody(v.accounts),
  }
}

// Add or edit a service. A picked image goes up after the service is saved,
// since a new one has no id before that.
export function AppFormLayer({
  open,
  onOpenChange,
  app,
  category,
  categories,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  app?: App
  // Where a new service starts.
  category?: string
  categories: AppCategory[]
  onSaved: (app: App) => void
}) {
  const [v, setV] = useState(() => initialValues(app, category, categories))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const save = useSaveApp()
  const upload = useUploadLogo()
  const pending = save.isPending || upload.isPending
  const set = (patch: Partial<Values>) =>
    setV((prev) => ({ ...prev, ...patch }))

  function submit(e: FormEvent) {
    e.preventDefault()
    const found = check(v, app)
    setErrors(found)
    if (Object.keys(found).length) return

    const file = v.logo.kind === "upload" ? v.logo.file : null
    const mutation = app
      ? { id: app.id, body: updateBody(v, app) }
      : { body: createBody(v) }
    save.mutate(mutation, {
      onSuccess: async (saved) => {
        let result = saved
        if (file) {
          try {
            result = await upload.mutateAsync({ id: saved.id, file })
          } catch (err) {
            toast.error(`Saved ${saved.name}, but the logo didn't upload`, {
              description: (err as Error).message,
            })
          }
        }
        onSaved(result)
      },
      onError: (error) => {
        const fields = fieldErrors(error)
        if (Object.keys(fields).length) setErrors(fields)
        else toast.error(error.message)
      },
    })
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={app ? `Edit ${app.name}` : "Add service"}
      description="A web service your team opens: its address, a logo and the logins."
      className="max-h-[85vh] overflow-y-auto sm:max-w-xl"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending}>
            {app ? "Save" : "Add service"}
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        noValidate
        onSubmit={submit}
        className="flex flex-col gap-5"
      >
        <Field
          label="Address"
          error={errors.address}
          hint="Where the service opens, e.g. portainer.acme.ir or 10.0.0.5:9000."
        >
          {(p) => (
            <Input
              {...p}
              value={v.address}
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="next"
              placeholder="https://"
              onChange={(e) => {
                const address = e.target.value
                set(
                  v.named
                    ? { address }
                    : { address, name: suggestName(address) },
                )
              }}
              onBlur={() => set({ address: withScheme(v.address) })}
            />
          )}
        </Field>
        <Field label="Name" error={errors.name}>
          {(p) => (
            <Input
              {...p}
              value={v.name}
              enterKeyHint="next"
              onChange={(e) =>
                set({ name: e.target.value, named: !!e.target.value })
              }
            />
          )}
        </Field>
        <Field label="Category" error={errors.category_id}>
          {(p) => (
            <CategorySelect
              id={p.id}
              value={v.category}
              categories={categories}
              onChange={(category) => set({ category })}
            />
          )}
        </Field>
        <LogoPicker
          app={app}
          value={v.logo}
          onChange={(logo) => set({ logo })}
          name={v.name}
          color={v.color}
          error={errors.logo ?? errors.logo_icon}
        />
        <ColorPicker value={v.color} onChange={(color) => set({ color })} />
        {/* biome-ignore lint/a11y/noLabelWithoutControl: the Base UI switch inside is the control */}
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 select-none">
          <span>
            <span className="block text-body-sm font-medium">Critical</span>
            <span className="block text-caption text-muted-foreground">
              Marked in red and listed under Critical, for the services that
              must never be down.
            </span>
          </span>
          <Switch
            checked={v.critical}
            onCheckedChange={(critical) => set({ critical })}
          />
        </label>
        <Field label="Note" error={errors.note}>
          {(p) => (
            <Textarea
              {...p}
              value={v.note}
              rows={3}
              placeholder="Everyone with access can read this. Don't put passwords here."
              onChange={(e) => set({ note: e.target.value })}
            />
          )}
        </Field>
        <AccountsEditor
          appId={app?.id}
          value={v.accounts}
          onChange={(accounts) => set({ accounts })}
          errors={errors}
        />
      </form>
    </ResponsiveDialog>
  )
}

function CategorySelect({
  id,
  value,
  categories,
  onChange,
}: {
  id: string
  value: string
  categories: AppCategory[]
  onChange: (id: string) => void
}) {
  const isMobile = useIsMobile()
  const options = [
    ...[...categories]
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ value: c.id, label: c.name })),
    { value: NONE, label: "Uncategorized" },
  ]

  if (isMobile) {
    return (
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(next) => next && onChange(next)}
    >
      <SelectTrigger id={id} className="h-10 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-72">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
