"use client"

import { Loader2, PlugZap, TriangleAlert } from "lucide-react"
import { type FormEvent, useCallback, useState } from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import { Field } from "@/components/field"
import { SecretInput } from "@/components/secret-input"
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
import type {
  CloudAccount,
  CloudAccountBody,
  CloudTestOutputBody,
} from "@/lib/services"
import {
  useCreateCloudAccount,
  useTestCloudAccount,
  useUpdateCloudAccount,
} from "../api"
import { accountStatusMeta, providers, StatusDot, statusOf } from "./meta"

const FORM_ID = "cloud-account-form"

// Focus the first field on desktop only: a phone keyboard popping up over a
// sheet that is still opening hides half of it.
const focusOnPointer = (el: HTMLInputElement | null) => {
  if (el && matchMedia("(pointer: fine)").matches) el.focus()
}

type Values = {
  name: string
  api_key: string
  description: string
  allow_changes: boolean
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

export function CloudAccountFormLayer({
  open,
  onOpenChange,
  account,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: CloudAccount
  onSaved: (account: CloudAccount) => void
}) {
  const isMobile = useIsMobile()
  const create = useCreateCloudAccount()
  const update = useUpdateCloudAccount()
  const test = useTestCloudAccount()
  const pending = create.isPending || update.isPending
  const provider = providers[0]
  const title = account ? `Edit ${account.name}` : "Add cloud account"
  const [values, setValues] = useState<Values>(() => ({
    name: account?.name ?? "",
    api_key: "",
    description: account?.description ?? "",
    allow_changes: account?.allow_changes ?? false,
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tested, setTested] = useState<CloudTestOutputBody | null>(null)
  const focusName = useCallback(focusOnPointer, [])

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors(({ [key]: _, ...rest }) => rest)
    if (key === "api_key") setTested(null)
  }

  function body(): CloudAccountBody {
    const b: CloudAccountBody = {
      provider: provider.value,
      name: values.name.trim(),
      description: values.description.trim(),
      allow_changes: values.allow_changes,
    }
    if (values.api_key.trim()) b.api_key = values.api_key.trim()
    return b
  }

  function failed(error: Error) {
    const fields = fieldErrors(error)
    if (Object.keys(fields).length) setErrors(fields)
    else toast.error(error.message)
  }

  function runTest() {
    if (!account && !values.api_key.trim()) {
      return setErrors({ api_key: "Paste an API key" })
    }
    test.mutate(
      {
        provider: provider.value,
        api_key: values.api_key.trim() || undefined,
        // Editing with the key left blank: test with the saved one.
        account_id: account?.id,
      },
      { onSuccess: setTested, onError: failed },
    )
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const missing: Record<string, string> = {}
    if (!values.name.trim()) missing.name = "Give it a name"
    if (!account && !values.api_key.trim()) missing.api_key = "Paste an API key"
    if (Object.keys(missing).length) return setErrors(missing)
    if (account) {
      update.mutate(
        { id: account.id, body: body() },
        {
          onSuccess: (saved) => {
            toast.success("Changes saved")
            onSaved(saved)
          },
          onError: failed,
        },
      )
      return
    }
    create.mutate(body(), {
      onSuccess: (saved) => {
        if (saved.status === "online") {
          toast.success(`Added ${saved.name}`, {
            description: `${plural(saved.server_count, "server")}, ${saved.running_count} running`,
          })
        } else {
          toast.warning(`Added ${saved.name}, but it isn't connected`, {
            description: saved.status_message,
          })
        }
        onSaved(saved)
      },
      onError: failed,
    })
  }

  const fields = (
    <>
      <Field label="Provider" hint="More providers are on the way.">
        {(p) => <Input {...p} value={provider.label} readOnly disabled />}
      </Field>
      <Field label="Name" error={errors.name}>
        {(p) => (
          <Input
            {...p}
            ref={account ? undefined : focusName}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Arvan production"
            autoComplete="off"
          />
        )}
      </Field>
      <Field
        label="API key"
        error={errors.api_key}
        hint={
          account
            ? `Saved key ends in ${account.key_hint || "…"}. Leave blank to keep it.`
            : `${provider.keyHint} Stored encrypted.`
        }
      >
        {(p) => (
          <SecretInput
            {...p}
            label="API key"
            value={values.api_key}
            onChange={(e) => set("api_key", e.target.value)}
            placeholder={account ? "Saved, leave blank to keep" : ""}
            autoComplete="off"
          />
        )}
      </Field>
      <Field label="Description" error={errors.description}>
        {(p) => (
          <Textarea
            {...p}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Optional: which team or project it belongs to"
            rows={2}
          />
        )}
      </Field>
      {/* biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox renders the control inside */}
      <label className="flex items-start gap-2.5 text-body-sm max-md:min-h-11">
        <Checkbox
          checked={values.allow_changes}
          onCheckedChange={(on) => set("allow_changes", on)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Allow changes from Morche</span>
          <span className="block text-caption text-muted-foreground">
            Turn servers on or off, restart and rename them from here. Off means
            read only: Morche never sends a change, whatever the key allows.
            Leave it off for production accounts unless you need it.
          </span>
          {errors.allow_changes && (
            <span className="block text-caption text-destructive">
              {errors.allow_changes}
            </span>
          )}
        </span>
      </label>
    </>
  )

  const testButton = (
    <Button
      type="button"
      variant="outline"
      disabled={test.isPending}
      onClick={runTest}
    >
      {test.isPending ? <Loader2 className="animate-spin" /> : <PlugZap />}
      Test connection
    </Button>
  )
  const testResult = tested && <TestResult result={tested} />

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
              disabled={pending}
              className="h-11 justify-self-end text-body text-brand"
            >
              {account ? "Save" : "Add"}
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
          {testButton}
          {testResult}
        </form>
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>
            An account at a cloud provider, reached with its API key.
          </SheetDescription>
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
          <div className="flex flex-col gap-3 border-t border-border px-6 py-4">
            {testResult}
            <div className="flex items-center gap-2">
              {testButton}
              <span className="flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {account ? "Save" : "Add account"}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function TestResult({ result }: { result: CloudTestOutputBody }) {
  const status = statusOf(result.status)
  const details = result.ok
    ? [
        plural(result.servers, "server"),
        `${result.running} running`,
        plural(result.regions, "region"),
        `${result.latency_ms} ms`,
      ]
    : []
  return (
    <div
      role="status"
      className="flex flex-col gap-1 rounded-lg bg-subtle px-3 py-2.5 text-body-sm"
    >
      <div className="flex items-start gap-2.5">
        {result.ok ? (
          <StatusDot dot={accountStatusMeta.online.dot} className="mt-1.5" />
        ) : (
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
        )}
        <div className="min-w-0">
          <p className="font-medium">
            {result.ok ? "Connected" : accountStatusMeta[status].label}
          </p>
          <p className="text-caption text-muted-foreground">
            {result.ok ? details.join(" · ") : result.message}
          </p>
          {result.ok && result.servers === 0 && (
            <p className="mt-1 text-caption text-muted-foreground">
              The key works but sees no servers. If you expected some, check the
              key's access policy in the provider's panel.
            </p>
          )}
        </div>
      </div>
      {result.problems.map((p) => (
        <p key={p.region} className="ms-6.5 text-caption text-warning">
          {p.region}: {p.message}
        </p>
      ))}
    </div>
  )
}
