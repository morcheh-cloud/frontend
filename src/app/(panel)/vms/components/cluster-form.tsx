"use client"

import { Loader2, PlugZap, ShieldCheck, TriangleAlert } from "lucide-react"
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
  PVECluster,
  PVEClusterBody,
  PVETestOutputBody,
} from "@/lib/services"
import { useSaveCluster, useTestConnection } from "../api"
import { type ClusterStatus, clusterStatusMeta, StatusDot } from "./meta"

const FORM_ID = "pve-cluster-form"

const focusOnPointer = (el: HTMLInputElement | null) => {
  if (el && matchMedia("(pointer: fine)").matches) el.focus()
}

type Values = {
  name: string
  url: string
  token_id: string
  secret: string
  fingerprint: string
  description: string
  tls_skip_verify: boolean
  allow_internal: boolean
}

// "root@pam!morche=xxxxxxxx-…" pasted whole: split it into its two fields.
function splitToken(v: Values): Values {
  const i = v.token_id.indexOf("=")
  if (i < 0 || v.secret.trim()) return v
  return {
    ...v,
    token_id: v.token_id.slice(0, i).trim(),
    secret: v.token_id.slice(i + 1).trim(),
  }
}

// An address without a port gets Proxmox's 8006.
function withPort(url: string) {
  const u = url.trim()
  if (!u) return u
  const full = /^[a-z]+:\/\//i.test(u) ? u : `https://${u}`
  try {
    const p = new URL(full)
    if (!p.port && p.protocol === "https:") p.port = "8006"
    return p.toString().replace(/\/$/, "")
  } catch {
    return u
  }
}

export function ClusterFormLayer({
  open,
  onOpenChange,
  cluster,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cluster?: PVECluster
  onSaved: (cluster: PVECluster) => void
}) {
  const isMobile = useIsMobile()
  const { admin } = useAccess()
  const save = useSaveCluster()
  const test = useTestConnection()
  const title = cluster ? `Edit ${cluster.name}` : "Connect a Proxmox cluster"
  const [values, setValues] = useState<Values>(() => ({
    name: cluster?.name ?? "",
    url: cluster?.url ?? "",
    token_id: cluster?.token_id ?? "",
    secret: "",
    fingerprint: cluster?.fingerprint ?? "",
    description: cluster?.description ?? "",
    tls_skip_verify: cluster?.tls_skip_verify ?? false,
    allow_internal: cluster?.allow_internal ?? false,
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tested, setTested] = useState<PVETestOutputBody | null>(null)
  const focusName = useCallback(focusOnPointer, [])

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors(({ [key]: _, ...rest }) => rest)
    if (key !== "name" && key !== "description") setTested(null)
  }

  function missing(v: Values, withName: boolean) {
    const m: Record<string, string> = {}
    if (withName && !v.name.trim()) m.name = "Give it a name"
    if (!v.url.trim()) m.url = "Enter any node's address"
    if (!v.token_id.trim()) m.token_id = "Enter the token's ID"
    else if (!/^[^@\s]+@[^!\s]+![^\s]+$/.test(v.token_id.trim()))
      m.token_id = "Write it as user@realm!tokenname"
    if (!cluster && !v.secret.trim()) m.secret = "Paste the token's secret"
    return m
  }

  function prepared() {
    const v = splitToken({ ...values, url: withPort(values.url) })
    if (v !== values) setValues(v)
    return v
  }

  function body(v: Values): PVEClusterBody {
    const b: PVEClusterBody = {
      name: v.name.trim(),
      url: v.url.trim(),
      token_id: v.token_id.trim(),
      description: v.description.trim(),
      fingerprint: v.fingerprint.trim(),
      tls_skip_verify: v.tls_skip_verify,
      allow_internal: v.allow_internal,
    }
    if (v.secret.trim()) b.secret = v.secret.trim()
    return b
  }

  function failed(error: Error) {
    const fields = fieldErrors(error)
    if (Object.keys(fields).length) setErrors(fields)
    else toast.error(error.message)
  }

  function runTest(v = prepared()) {
    const m = missing(v, false)
    if (Object.keys(m).length) return setErrors(m)
    const b = body(v)
    test.mutate(
      {
        url: b.url,
        token_id: b.token_id,
        secret: b.secret,
        fingerprint: b.fingerprint,
        tls_skip_verify: b.tls_skip_verify,
        allow_internal: b.allow_internal,
        // Editing with the secret left blank: test with the saved one.
        cluster_id: cluster?.id,
      },
      {
        onSuccess: (r) => {
          setTested(r)
          // A first successful test names the cluster for you.
          if (r.ok && !v.name.trim() && r.cluster_name)
            setValues((x) => ({ ...x, name: r.cluster_name }))
        },
        onError: failed,
      },
    )
  }

  // The test answered the certificate's fingerprint: pin it and test again.
  function trust(fingerprint: string) {
    const v = { ...prepared(), fingerprint, tls_skip_verify: false }
    setValues(v)
    setErrors(({ fingerprint: _, ...rest }) => rest)
    runTest(v)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const v = prepared()
    const m = missing(v, true)
    if (Object.keys(m).length) return setErrors(m)
    save.mutate(
      { id: cluster?.id, body: body(v) },
      {
        onSuccess: (saved) => {
          if (cluster) toast.success("Changes saved")
          else if (saved.status === "online")
            toast.success(`Connected ${saved.name}`, {
              description: `${saved.node_count} node${saved.node_count === 1 ? "" : "s"} · ${saved.guest_count} machines`,
            })
          else
            toast.warning(`Added ${saved.name}, but it isn't connected`, {
              description: saved.status_message,
            })
          onSaved(saved)
        },
        onError: failed,
      },
    )
  }

  const fields = (
    <>
      <Field
        label="Address"
        error={errors.url}
        hint="Any node of the cluster; Morche finds the others. Port 8006 if left out."
      >
        {(p) => (
          <Input
            {...p}
            ref={cluster ? undefined : focusName}
            value={values.url}
            onChange={(e) => set("url", e.target.value)}
            onBlur={() => values.url.trim() && set("url", withPort(values.url))}
            placeholder="https://pve1.example.com:8006"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono"
          />
        )}
      </Field>
      <Field
        label="API token ID"
        error={errors.token_id}
        hint="Datacenter › Permissions › API Tokens. You can paste the whole user@realm!name=secret here."
      >
        {(p) => (
          <Input
            {...p}
            value={values.token_id}
            onChange={(e) => set("token_id", e.target.value)}
            onBlur={() => setValues(splitToken)}
            placeholder="root@pam!morche"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            className="font-mono"
          />
        )}
      </Field>
      <Field
        label="Secret"
        error={errors.secret}
        hint={
          cluster
            ? "Leave blank to keep the saved secret."
            : "Shown once when the token is made. Stored encrypted."
        }
      >
        {(p) => (
          <SecretInput
            {...p}
            label="secret"
            value={values.secret}
            onChange={(e) => set("secret", e.target.value)}
            placeholder={cluster ? "Saved, leave blank to keep" : ""}
            autoComplete="off"
          />
        )}
      </Field>
      <Field
        label="Name"
        error={errors.name}
        hint="How it shows in Morche. Test connection fills in the cluster's own name."
      >
        {(p) => (
          <Input
            {...p}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Office cluster"
            autoComplete="off"
          />
        )}
      </Field>
      <Field
        label="Certificate fingerprint"
        error={errors.fingerprint}
        hint="SHA-256 of the node's certificate. Pins a self-signed certificate safely; Test connection offers it."
      >
        {(p) => (
          <Input
            {...p}
            value={values.fingerprint}
            onChange={(e) => set("fingerprint", e.target.value)}
            placeholder="Optional: AB:CD:…"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono text-body-sm"
          />
        )}
      </Field>
      <Field label="Description" error={errors.description}>
        {(p) => (
          <Textarea
            {...p}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Optional: where it is, what runs on it"
            rows={2}
          />
        )}
      </Field>
      <div className="flex flex-col gap-3">
        <CheckRow
          checked={values.tls_skip_verify}
          onChange={(on) => set("tls_skip_verify", on)}
          label="Don't check the certificate"
          text="Accepts any certificate. Pinning the fingerprint is safer."
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
      onClick={() => runTest()}
    >
      {test.isPending ? <Loader2 className="animate-spin" /> : <PlugZap />}
      Test connection
    </Button>
  )
  const testResult = tested && (
    <TestResult result={tested} pinned={values.fingerprint} onTrust={trust} />
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
              {cluster ? "Edit cluster" : "Add cluster"}
            </span>
            <Button
              type="submit"
              form={FORM_ID}
              variant="ghost"
              disabled={save.isPending}
              className="h-11 justify-self-end text-body text-brand"
            >
              {cluster ? "Save" : "Add"}
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
            Reached through its API with a token. Nothing is installed on the
            nodes.
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
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="animate-spin" />}
                {cluster ? "Save" : "Connect"}
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

function TestResult({
  result,
  pinned,
  onTrust,
}: {
  result: PVETestOutputBody
  pinned: string
  onTrust: (fingerprint: string) => void
}) {
  const status = (
    result.status in clusterStatusMeta ? result.status : "error"
  ) as ClusterStatus
  const details: ReactNode[] = []
  if (result.ok) {
    if (result.version) details.push(`Proxmox VE ${result.version}`)
    details.push(
      result.nodes_online < result.nodes
        ? `${result.nodes_online} of ${result.nodes} nodes up`
        : `${result.nodes} node${result.nodes === 1 ? "" : "s"}`,
    )
    details.push(`${result.running} of ${result.guests} machines running`)
    details.push(`${result.latency_ms} ms`)
  }
  const offerPin =
    status === "tls_error" &&
    result.fingerprint &&
    result.fingerprint !== pinned
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-lg bg-subtle px-3 py-2.5 text-body-sm"
    >
      {result.ok ? (
        <StatusDot tone="bg-success" className="mt-1.5" />
      ) : (
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {result.ok
            ? `Connected${result.cluster_name ? ` to ${result.cluster_name}` : ""}`
            : clusterStatusMeta[status].label}
        </p>
        <p className="text-caption text-muted-foreground">
          {result.ok ? details.join(" · ") : result.message}
        </p>
        {offerPin && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-caption text-muted-foreground">
              Its certificate&apos;s fingerprint is{" "}
              <span className="font-mono break-all text-foreground">
                {result.fingerprint}
              </span>
              . Compare it with the one under the node › System › Certificates
              before trusting it.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="self-start"
              onClick={() => onTrust(result.fingerprint)}
            >
              <ShieldCheck />
              Trust this certificate
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
