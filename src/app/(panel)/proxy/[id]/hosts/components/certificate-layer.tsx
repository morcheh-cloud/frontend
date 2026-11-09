"use client"

import { Info, TriangleAlert } from "lucide-react"
import { useState } from "react"

import {
  Callout,
  FieldError,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { PrivateKeyInput, SecretInput } from "@/components/secret-input"
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
import { ApiError, fieldErrors } from "@/lib/api"
import type { CertRequest, Job, Proxy as ReverseProxy } from "@/lib/services"
import { useCertificateAuthorities, useCreateCertificate } from "../../../api"
import { splitList } from "./draft"

type Source = CertRequest["source"]

const sources = [
  { value: "acme", label: "From a CA" },
  { value: "self-signed", label: "Self-signed" },
  { value: "upload", label: "Upload" },
] as const satisfies readonly { value: Source; label: string }[]

const CUSTOM = "custom"

const typing = {
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const

type Form = {
  source: Source
  domains: string
  ca: string
  directory: string
  email: string
  eabKid: string
  eabHmac: string
  keyType: "ecdsa" | "rsa"
  force: boolean
  days: string
  certificate: string
  key: string
}

// Gets a certificate onto the proxy's server: from a CA over ACME (certbot,
// renewed by itself), self-signed, or a pair the user already has. Runs as a
// background job; `onStarted` gets it so the page can fill in the files.
export function CertificateLayer({
  open,
  onOpenChange,
  proxy: p,
  domains,
  onStarted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  proxy: ReverseProxy
  // The site's names, offered as the certificate's.
  domains: string[]
  onStarted: (job: Job) => void
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Get a certificate"
      description={`Put on ${p.server_name}, for this site and any other.`}
      className="sm:max-w-lg"
    >
      {open && (
        <CertificateForm
          proxy={p}
          domains={domains}
          onCancel={() => onOpenChange(false)}
          onStarted={(job) => {
            onOpenChange(false)
            onStarted(job)
          }}
        />
      )}
    </ResponsiveDialog>
  )
}

function CertificateForm({
  proxy: p,
  domains,
  onCancel,
  onStarted,
}: {
  proxy: ReverseProxy
  domains: string[]
  onCancel: () => void
  onStarted: (job: Job) => void
}) {
  const jobs = useJobActions()
  const create = useCreateCertificate()
  const cas = useCertificateAuthorities(p.id)
  const [form, setForm] = useState<Form>({
    source: "acme",
    domains: domains.join("\n"),
    ca: "letsencrypt",
    directory: "",
    email: "",
    eabKid: "",
    eabHmac: "",
    keyType: "ecdsa",
    force: false,
    days: "365",
    certificate: "",
    key: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }))
    setErrors({})
  }

  const list = cas.data ?? []
  const ca = list.find((c) => c.id === form.ca)
  const custom = form.ca === CUSTOM
  const acme = form.source === "acme"
  const names = splitList(form.domains)
  const wildcard = acme && names.some((d) => d.startsWith("*."))
  const showEab = acme && (ca?.eab || custom)

  function body(): CertRequest {
    const b: CertRequest = { source: form.source, domains: names }
    if (acme) {
      b.ca = form.ca
      if (custom) b.directory = form.directory.trim()
      if (form.email.trim()) b.email = form.email.trim()
      if (showEab && (form.eabKid.trim() || form.eabHmac.trim())) {
        b.eab_kid = form.eabKid.trim()
        b.eab_hmac = form.eabHmac.trim()
      }
      if (form.force) b.force = true
    }
    if (form.source !== "upload") b.key_type = form.keyType
    if (form.source === "self-signed") b.days = Number(form.days) || 365
    if (form.source === "upload") {
      b.certificate = form.certificate
      b.key = form.key
    }
    return b
  }

  function submit() {
    create.mutate(
      { id: p.id, body: body() },
      {
        onSuccess: (job) => {
          jobs.track(job)
          onStarted(job)
        },
        onError: (err) => {
          const found = fieldErrors(err)
          // domains[2] → the list, with the name in front.
          for (const [k, v] of Object.entries(found)) {
            const m = /^domains\[(\d+)\]$/.exec(k)
            if (m) {
              found.domains ??= names[Number(m[1])]
                ? `${names[Number(m[1])]}: ${v}`
                : v
            }
          }
          if (!Object.keys(found).length || err instanceof ApiError === false)
            found.form = (err as Error).message
          setErrors(found)
        },
      },
    )
  }

  const action =
    form.source === "acme"
      ? "Get certificate"
      : form.source === "self-signed"
        ? "Make certificate"
        : "Save certificate"

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="flex">
        <Segmented
          label="Where it comes from"
          items={sources}
          value={form.source}
          onChange={(source) => set({ source })}
        />
      </div>

      <Field
        label="Domains"
        hint={
          form.source === "upload"
            ? "Optional: read from the certificate when left empty."
            : "One per line. The first one names the certificate."
        }
        error={errors.domains}
      >
        {(f) => (
          <Textarea
            {...f}
            {...typing}
            value={form.domains}
            onChange={(e) => set({ domains: e.target.value })}
            rows={Math.min(4, Math.max(2, names.length))}
            placeholder="app.example.com"
            className="font-mono"
          />
        )}
      </Field>

      {acme && (
        <>
          <Field
            label="Certificate authority"
            hint={custom ? undefined : ca?.note}
            error={errors.ca}
          >
            {(f) => (
              <Select
                items={[
                  ...list.map((c) => ({ value: c.id, label: c.label })),
                  { value: CUSTOM, label: "Another CA (ACME address)" },
                ]}
                value={form.ca}
                onValueChange={(v) => v && set({ ca: v })}
              >
                <SelectTrigger id={f.id} className="h-11 w-full md:h-10">
                  <SelectValue placeholder="Pick one" />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {list.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="truncate">{c.label}</span>
                      {c.test && (
                        <span className="ms-auto text-caption text-ash">
                          Test only
                        </span>
                      )}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM}>
                    Another CA (ACME address)
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </Field>
          {custom && (
            <Field
              label="ACME directory"
              hint="The CA's https:// directory address, from its documentation."
              error={errors.directory}
            >
              {(f) => (
                <Input
                  {...f}
                  {...typing}
                  type="url"
                  inputMode="url"
                  value={form.directory}
                  onChange={(e) => set({ directory: e.target.value })}
                  placeholder="https://acme.example.com/directory"
                  className="font-mono"
                />
              )}
            </Field>
          )}
          {showEab && (
            <>
              <Field
                label="EAB key ID"
                hint={
                  custom
                    ? "Only if the CA asks for External Account Binding."
                    : "External Account Binding, from the CA's dashboard."
                }
                error={errors.eab_kid}
              >
                {(f) => (
                  <Input
                    {...f}
                    {...typing}
                    value={form.eabKid}
                    onChange={(e) => set({ eabKid: e.target.value })}
                    className="font-mono"
                  />
                )}
              </Field>
              <Field label="EAB HMAC key" error={errors.eab_hmac}>
                {(f) => (
                  <SecretInput
                    {...f}
                    {...typing}
                    label="HMAC key"
                    value={form.eabHmac}
                    onChange={(e) => set({ eabHmac: e.target.value })}
                    autoComplete="off"
                  />
                )}
              </Field>
            </>
          )}
          <Field
            label="Email"
            hint="Optional. The CA writes here if renewing ever fails."
            error={errors.email}
          >
            {(f) => (
              <Input
                {...f}
                {...typing}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set({ email: e.target.value })}
                placeholder="ops@example.com"
              />
            )}
          </Field>
        </>
      )}

      {form.source !== "upload" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-body-sm font-medium">Key type</p>
            <p className="text-caption text-muted-foreground">
              ECDSA is smaller and faster; RSA for very old clients.
            </p>
          </div>
          <Segmented
            label="Key type"
            items={[
              { value: "ecdsa", label: "ECDSA" },
              { value: "rsa", label: "RSA" },
            ]}
            value={form.keyType}
            onChange={(keyType) => set({ keyType })}
          />
        </div>
      )}

      {form.source === "self-signed" && (
        <Field
          label="Valid for (days)"
          hint="Browsers warn on a self-signed certificate: for tests, internal names and addresses."
          error={errors.days}
        >
          {(f) => (
            <Input
              {...f}
              type="number"
              inputMode="numeric"
              min={1}
              max={3650}
              value={form.days}
              onChange={(e) => set({ days: e.target.value })}
            />
          )}
        </Field>
      )}

      {form.source === "upload" && (
        <>
          <Field
            label="Certificate"
            hint="PEM: the certificate first, then its intermediates."
            error={errors.certificate}
          >
            {(f) => (
              <Textarea
                {...f}
                {...typing}
                value={form.certificate}
                onChange={(e) => set({ certificate: e.target.value })}
                rows={5}
                placeholder="-----BEGIN CERTIFICATE-----"
                className="font-mono text-caption"
              />
            )}
          </Field>
          <Field
            label="Private key"
            hint="PEM, without a password. Written to the server only (mode 600)."
            error={errors.key}
          >
            {(f) => (
              <PrivateKeyInput
                {...f}
                value={form.key}
                onChange={(key) => set({ key })}
              />
            )}
          </Field>
        </>
      )}

      {acme && (
        <ToggleRow
          id="cert-force"
          label="Get a new one now"
          hint="Off: an existing certificate for these names is kept until it's due for renewal."
          checked={form.force}
          onChange={(force) => set({ force })}
        />
      )}

      {wildcard ? (
        <Callout icon={<TriangleAlert />} tone="warning">
          Wildcard names need a DNS check, which isn't available here yet. List
          the names instead, or use a self-signed or uploaded certificate.
        </Callout>
      ) : acme ? (
        <Callout icon={<Info />}>
          The CA checks each name over http, so they must point at{" "}
          <span className="font-mono">{p.server_host}</span> and port 80 must be
          open. The site doesn't need to be saved first. certbot is installed if
          missing and renews the certificate by itself.
        </Callout>
      ) : null}

      <FieldError text={errors.form} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-9"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-11 md:h-9"
          disabled={create.isPending || wildcard}
        >
          {create.isPending ? "Starting…" : action}
        </Button>
      </div>
    </form>
  )
}
