"use client"

import { Loader2, PlugZap, TriangleAlert } from "lucide-react"
import { type FormEvent, type ReactNode, useCallback, useState } from "react"
import { toast } from "sonner"

import { useAccess } from "@/components/auth/auth"
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
  DNSServer,
  DNSServerBody,
  DNSTestOutputBody,
} from "@/lib/services"
import { useCreateDnsServer, useTestDns, useUpdateDnsServer } from "../api"
import { type DnsStatus, DnsStatusDot, dnsStatusMeta } from "./meta"

const FORM_ID = "dns-server-form"

// Focus the first field on desktop only: a phone keyboard popping up over a
// sheet that is still opening hides half of it.
const focusOnPointer = (el: HTMLInputElement | null) => {
  if (el && matchMedia("(pointer: fine)").matches) el.focus()
}

type Values = {
  name: string
  url: string
  token: string
  description: string
  tls_skip_verify: boolean
  allow_internal: boolean
}

export function DnsServerFormLayer({
  open,
  onOpenChange,
  server,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  server?: DNSServer
  onSaved: (server: DNSServer) => void
}) {
  const isMobile = useIsMobile()
  const { admin } = useAccess()
  const create = useCreateDnsServer()
  const update = useUpdateDnsServer()
  const test = useTestDns()
  const pending = create.isPending || update.isPending
  const title = server ? `Edit ${server.name}` : "Add DNS server"
  const [values, setValues] = useState<Values>(() => ({
    name: server?.name ?? "",
    url: server?.url ?? "",
    token: "",
    description: server?.description ?? "",
    tls_skip_verify: server?.tls_skip_verify ?? false,
    allow_internal: server?.allow_internal ?? false,
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tested, setTested] = useState<DNSTestOutputBody | null>(null)
  const focusName = useCallback(focusOnPointer, [])

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors(({ [key]: _, ...rest }) => rest)
    if (key !== "name" && key !== "description") setTested(null)
  }

  function body(): DNSServerBody {
    const b: DNSServerBody = {
      name: values.name.trim(),
      url: values.url.trim(),
      description: values.description.trim(),
      tls_skip_verify: values.tls_skip_verify,
      allow_internal: values.allow_internal,
    }
    if (values.token.trim()) b.token = values.token.trim()
    return b
  }

  function failed(error: Error) {
    const fields = fieldErrors(error)
    if (Object.keys(fields).length) setErrors(fields)
    else toast.error(error.message)
  }

  function runTest() {
    const missing: Record<string, string> = {}
    if (!values.url.trim()) missing.url = "Enter the server's address"
    if (!server && !values.token.trim()) missing.token = "Paste an API token"
    if (Object.keys(missing).length) return setErrors(missing)
    const { url, token, tls_skip_verify, allow_internal } = body()
    test.mutate(
      {
        url,
        token,
        tls_skip_verify,
        allow_internal,
        // Editing with the token left blank: test with the saved one.
        server_id: server?.id,
      },
      { onSuccess: setTested, onError: failed },
    )
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const missing: Record<string, string> = {}
    if (!values.name.trim()) missing.name = "Give it a name"
    if (!values.url.trim()) missing.url = "Enter the server's address"
    if (!server && !values.token.trim()) missing.token = "Paste an API token"
    if (Object.keys(missing).length) return setErrors(missing)
    if (server) {
      update.mutate(
        { id: server.id, body: body() },
        {
          onSuccess: (saved) => {
            toast.success("Changes saved")
            onSaved(saved)
          },
          onError: failed,
        },
      )
    } else {
      create.mutate(body(), {
        onSuccess: (saved) => {
          if (saved.status === "online") {
            toast.success(`Added ${saved.name}`, {
              description: `${saved.zone_count} zone${saved.zone_count === 1 ? "" : "s"}`,
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
  }

  const plainHttp = /^http:\/\//i.test(values.url.trim())

  const fields = (
    <>
      <Field label="Name" error={errors.name}>
        {(p) => (
          <Input
            {...p}
            ref={server ? undefined : focusName}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="ns1"
            autoComplete="off"
          />
        )}
      </Field>
      <Field
        label="Address"
        error={errors.url}
        hint={
          plainHttp
            ? "Plain http sends the token unencrypted: fine on a private network, use https otherwise."
            : "The address of its web console, with the port."
        }
      >
        {(p) => (
          <Input
            {...p}
            value={values.url}
            onChange={(e) => set("url", e.target.value)}
            placeholder="https://ns1.example.com:53443"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono"
          />
        )}
      </Field>
      <Field
        label="API token"
        error={errors.token}
        hint={
          server
            ? "Leave blank to keep the saved token."
            : "In Technitium: your user menu › Create API Token. Stored encrypted."
        }
      >
        {(p) => (
          <SecretInput
            {...p}
            label="token"
            value={values.token}
            onChange={(e) => set("token", e.target.value)}
            placeholder={server ? "Saved, leave blank to keep" : ""}
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
            placeholder="Optional: where it runs, what it serves"
            rows={2}
          />
        )}
      </Field>
      <div className="flex flex-col gap-3">
        <CheckRow
          checked={values.tls_skip_verify}
          onChange={(on) => set("tls_skip_verify", on)}
          label="Accept a self-signed certificate"
          text="Skip checking the https certificate. Only for a server you control."
        />
        {(admin || values.allow_internal) && (
          <CheckRow
            checked={values.allow_internal}
            onChange={(on) => set("allow_internal", on)}
            label="Allow a private address"
            text="10.x, 192.168.x, 127.0.0.1 and the like. System admins only."
            error={errors.allow_internal}
          />
        )}
      </div>
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
              {server ? "Save" : "Add"}
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
            A Technitium DNS Server, reached through its HTTP API.
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
                {server ? "Save" : "Add server"}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function CheckRow({
  checked,
  onChange,
  label,
  text,
  error,
}: {
  checked: boolean
  onChange: (on: boolean) => void
  label: string
  text: string
  error?: string
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox renders the control inside
    <label className="flex items-start gap-2.5 text-body-sm max-md:min-h-11">
      <Checkbox
        checked={checked}
        onCheckedChange={(on) => onChange(on)}
        className="mt-0.5"
      />
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-caption text-muted-foreground">{text}</span>
        {error && (
          <span className="block text-caption text-destructive">{error}</span>
        )}
      </span>
    </label>
  )
}

function TestResult({ result }: { result: DNSTestOutputBody }) {
  const status = (
    result.status in dnsStatusMeta ? result.status : "error"
  ) as DnsStatus
  const details: ReactNode[] = []
  if (result.ok) {
    if (result.version) details.push(`Technitium ${result.version}`)
    details.push(
      `${result.zone_count} zone${result.zone_count === 1 ? "" : "s"}`,
    )
    details.push(`${result.latency_ms} ms`)
  }
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-lg bg-subtle px-3 py-2.5 text-body-sm"
    >
      {result.ok ? (
        <DnsStatusDot status="online" className="mt-1.5" />
      ) : (
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
      )}
      <div className="min-w-0">
        <p className="font-medium">
          {result.ok
            ? `Connected${result.server_domain ? ` to ${result.server_domain}` : ""}`
            : dnsStatusMeta[status].label}
        </p>
        <p className="text-caption text-muted-foreground">
          {result.ok ? details.join(" · ") : result.message}
        </p>
      </div>
    </div>
  )
}
