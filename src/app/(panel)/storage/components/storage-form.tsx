"use client"

import { Loader2, PlugZap, TriangleAlert } from "lucide-react"
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"

import { Field, Segmented } from "@/app/(panel)/servers/components/fields"
import { StatusDot, statusMeta } from "@/app/(panel)/servers/components/meta"
import { PrivateKeyInput, SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { fieldErrors } from "@/lib/api"
import type {
  Storage,
  StorageBody,
  StorageTestBody,
  StorageTestOutputBody,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useRevealStorageCredentials, useTestStorage } from "../api"
import {
  defaultPort,
  type Protocol,
  presetFor,
  presets,
  protocols,
} from "./meta"

type Values = {
  name: string
  protocol: Protocol
  provider: string
  host: string
  port: string
  username: string
  auth_method: NonNullable<StorageBody["auth_method"]>
  secret: string
  clear_secret: boolean
  private_key: string
  passphrase: string
  bucket: string
  region: string
  path_style: boolean
  tls: NonNullable<StorageBody["tls"]>
  insecure_tls: boolean
  root_path: string
  read_only: boolean
  description: string
}

function initialValues(s?: Storage): Values {
  const preset = presetFor("s3", "minio")
  return {
    name: s?.name ?? "",
    protocol: s?.protocol ?? preset.protocol,
    provider: s?.provider || (s ? presetFor(s.protocol, "").id : preset.id),
    host: s?.host ?? preset.host ?? "",
    port: s?.port ? String(s.port) : "",
    username: s?.username ?? "",
    auth_method: s?.auth_method ?? "password",
    secret: "",
    clear_secret: false,
    private_key: "",
    passphrase: "",
    bucket: s?.bucket ?? "",
    region: s?.region ?? preset.region ?? "",
    path_style: s?.path_style ?? preset.pathStyle ?? false,
    tls: s?.tls ?? "none",
    insecure_tls: s?.insecure_tls ?? false,
    root_path: s?.root_path ?? "",
    read_only: s?.read_only ?? false,
    description: s?.description ?? "",
  }
}

// The connection fields both the save and the test send. Only what the
// protocol uses goes out; blank secrets are left out, so an edit keeps the
// stored ones.
function connection(v: Values): StorageTestBody {
  const s3 = v.protocol === "s3"
  const sftp = v.protocol === "sftp"
  const key = sftp && v.auth_method === "private_key"
  return {
    protocol: v.protocol,
    provider: v.provider,
    host: v.host.trim(),
    port: s3 || v.protocol === "webdav" ? 0 : Number(v.port) || 0,
    username: v.username.trim(),
    auth_method: sftp ? v.auth_method : "password",
    secret: !key && v.secret ? v.secret : undefined,
    clear_secret: !key && !v.secret && v.clear_secret ? true : undefined,
    private_key: key && v.private_key.trim() ? v.private_key : undefined,
    passphrase: key && v.passphrase ? v.passphrase : undefined,
    bucket: s3 ? v.bucket.trim() : "",
    region: s3 ? v.region.trim() : "",
    path_style: s3 ? v.path_style : false,
    tls: v.protocol === "ftp" ? v.tls : "none",
    insecure_tls: usesTls(v) ? v.insecure_tls : false,
    root_path: v.root_path.trim(),
  }
}

function toBody(v: Values, favorite?: boolean): StorageBody {
  return {
    ...connection(v),
    name: v.name.trim(),
    read_only: v.read_only,
    description: v.description.trim(),
    favorite,
  }
}

const usesTls = (v: Values) =>
  v.protocol === "s3" ||
  v.protocol === "webdav" ||
  (v.protocol === "ftp" && v.tls !== "none")

// Whether a save changes how we connect, so the storage should be re-checked.
export function connectionChanged(s: Storage, v: Values) {
  const c = connection(v)
  return (
    s.protocol !== c.protocol ||
    s.host !== c.host ||
    s.port !== c.port ||
    s.username !== c.username ||
    s.bucket !== c.bucket ||
    s.region !== c.region ||
    s.path_style !== c.path_style ||
    s.tls !== c.tls ||
    s.insecure_tls !== c.insecure_tls ||
    s.root_path !== c.root_path ||
    s.auth_method !== c.auth_method ||
    Boolean(c.secret || c.clear_secret || c.private_key || c.passphrase)
  )
}

export type StorageFormSubmit = {
  values: Values
  body: StorageBody
  setErrors: (errors: Record<string, string>) => void
}

// Desktop lays the parts out with the test in the sheet's footer; the phone
// sheet keeps it inline after the credentials.
export type StorageFormParts = {
  kind: ReactNode
  connection: ReactNode
  auth: ReactNode
  options: ReactNode
  testButton: ReactNode
  testResult: ReactNode
}

export function StorageForm({
  formId,
  storage,
  onSubmit,
  className,
  children,
}: {
  formId: string
  storage?: Storage
  onSubmit: (submit: StorageFormSubmit) => void
  className?: string
  children: (parts: StorageFormParts) => ReactNode
}) {
  const [values, setValues] = useState(() => initialValues(storage))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tested, setTested] = useState<StorageTestOutputBody | null>(null)
  const test = useTestStorage()
  const reveal = useRevealStorageCredentials(storage?.id)
  const nameRef = useRef<HTMLInputElement>(null)
  const preset = presetFor(values.protocol, values.provider)
  // Secrets saved for this storage only count while the protocol (and so the
  // meaning of the secret) stays the same.
  const saved = storage?.protocol === values.protocol ? storage : undefined

  // biome-ignore lint/correctness/useExhaustiveDependencies: on mount only
  useEffect(() => {
    if (!storage && matchMedia("(pointer: fine)").matches) {
      nameRef.current?.focus()
    }
  }, [])

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors(({ [key]: _, ...rest }) => rest)
    if (key !== "name" && key !== "description" && key !== "read_only") {
      setTested(null)
    }
  }

  // A preset fills what it knows; a field the user already typed into keeps
  // its value unless it still holds the previous preset's default.
  function pick(protocol: Protocol, id: string) {
    const next = presetFor(protocol, id)
    setValues((v) => {
      const prev = presetFor(v.protocol, v.provider)
      const untouched = !v.host.trim() || v.host === prev.host
      return {
        ...v,
        protocol,
        provider: next.id,
        host: untouched ? (next.host ?? "") : v.host,
        region:
          next.region !== undefined && (!v.region || v.region === prev.region)
            ? next.region
            : v.region,
        path_style: next.pathStyle ?? v.path_style,
        port: protocol === v.protocol ? v.port : "",
      }
    })
    setErrors({})
    setTested(null)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!values.name.trim()) e.name = "Give the storage a name"
    if (!values.host.trim()) {
      e.host =
        values.protocol === "s3"
          ? "Enter the endpoint"
          : values.protocol === "webdav"
            ? "Enter the folder's URL"
            : "Enter an IP address or hostname"
    }
    if (values.port) {
      const port = Number(values.port)
      if (!Number.isInteger(port) || port < 1 || port > 65535)
        e.port = "1–65535"
    }
    if (values.protocol === "sftp" && !values.username.trim()) {
      e.username = "Enter the SSH user"
    }
    if (
      values.protocol === "sftp" &&
      values.auth_method === "private_key" &&
      !values.private_key.trim() &&
      !(saved?.auth_method === "private_key" && saved.has_private_key)
    ) {
      e.private_key = "Paste the private key or load it from a file"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!validate()) return
    onSubmit({ values, body: toBody(values, storage?.favorite), setErrors })
  }

  function runTest() {
    if (!validate()) return
    setTested(null)
    test.mutate(
      { ...connection(values), storage_id: storage?.id },
      {
        onSuccess: setTested,
        onError: (error) => setErrors((e) => ({ ...e, ...fieldErrors(error) })),
      },
    )
  }

  const p = values.protocol
  const hostLabel = p === "s3" ? "Endpoint" : p === "webdav" ? "URL" : "Host"
  const userLabel = p === "s3" ? "Access key" : "Username"
  const secretLabel = p === "s3" ? "Secret key" : "Password"

  const kind = (
    <Section title="Type">
      <Segmented
        label="Protocol"
        value={p}
        onChange={(v) => pick(v, "")}
        options={protocols.map((x) => ({ value: x.value, label: x.label }))}
      />
      <p className="-mt-2 text-caption text-muted-foreground">
        {protocols.find((x) => x.value === p)?.text}
      </p>
      {presets.filter((x) => x.protocol === p).length > 1 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-body-sm font-medium">Provider</span>
          <div
            role="radiogroup"
            aria-label="Provider"
            className="flex flex-wrap gap-1.5"
          >
            {presets
              .filter((x) => x.protocol === p)
              .map((x) => (
                // biome-ignore lint/a11y/useSemanticElements: pill options; radio inputs can't be styled as pills
                <button
                  key={x.id}
                  type="button"
                  role="radio"
                  aria-checked={x.id === preset.id}
                  onClick={() => pick(p, x.id)}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full border px-3.5 text-body-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:px-3",
                    x.id === preset.id
                      ? "border-brand/30 bg-brand-soft font-medium text-brand-strong"
                      : "border-mist hover:bg-muted",
                  )}
                >
                  {x.label}
                </button>
              ))}
          </div>
        </div>
      )}
    </Section>
  )

  const connectionPart = (
    <Section title="Connection">
      <Field label="Name" error={errors.name}>
        {(f) => (
          <Input
            {...f}
            ref={nameRef}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={p === "s3" ? "Backups" : "Shared files"}
            autoComplete="off"
            maxLength={64}
            enterKeyHint="next"
          />
        )}
      </Field>
      <div
        className={cn(
          "grid gap-3",
          (p === "ftp" || p === "sftp") && "grid-cols-[minmax(0,1fr)_6rem]",
        )}
      >
        <Field label={hostLabel} error={errors.host} hint={preset.hint}>
          {(f) => (
            <Input
              {...f}
              value={values.host}
              onChange={(e) => set("host", e.target.value)}
              placeholder={preset.placeholder}
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              enterKeyHint="next"
              className="font-mono"
            />
          )}
        </Field>
        {(p === "ftp" || p === "sftp") && (
          <Field label="Port" error={errors.port}>
            {(f) => (
              <Input
                {...f}
                value={values.port}
                onChange={(e) => set("port", e.target.value.replace(/\D/g, ""))}
                placeholder={String(defaultPort(values))}
                inputMode="numeric"
                maxLength={5}
                enterKeyHint="next"
                className="font-mono"
              />
            )}
          </Field>
        )}
      </div>
      {p === "s3" && (
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Bucket"
            error={errors.bucket}
            hint="Empty shows every bucket."
          >
            {(f) => (
              <Input
                {...f}
                value={values.bucket}
                onChange={(e) => set("bucket", e.target.value.trim())}
                placeholder="All buckets"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
                enterKeyHint="next"
                className="font-mono"
              />
            )}
          </Field>
          <Field label="Region" error={errors.region}>
            {(f) => (
              <Input
                {...f}
                value={values.region}
                onChange={(e) => set("region", e.target.value.trim())}
                placeholder="us-east-1"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
                enterKeyHint="next"
                className="font-mono"
              />
            )}
          </Field>
        </div>
      )}
      {p === "ftp" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-body-sm font-medium">Encryption</span>
          <Segmented
            label="Encryption"
            value={values.tls}
            onChange={(v) => set("tls", v)}
            options={[
              { value: "none", label: "None" },
              { value: "explicit", label: "Explicit TLS" },
              { value: "implicit", label: "Implicit (990)" },
            ]}
          />
          {values.tls === "none" && (
            <p className="text-caption text-muted-foreground">
              Plain FTP sends the password unencrypted. Use TLS when the server
              supports it.
            </p>
          )}
        </div>
      )}
      {p === "s3" && (
        <CheckRow
          checked={values.path_style}
          onChange={(on) => set("path_style", on)}
          label="Path-style URLs"
          text="endpoint/bucket/key instead of bucket.endpoint/key. MinIO and most self-hosted servers need it."
        />
      )}
      {usesTls(values) && (
        <CheckRow
          checked={values.insecure_tls}
          onChange={(on) => set("insecure_tls", on)}
          label="Accept any certificate"
          text="For self-signed certificates only."
          warning={
            values.insecure_tls
              ? "Anyone on the network path could read and change the traffic."
              : undefined
          }
        />
      )}
    </Section>
  )

  const key = p === "sftp" && values.auth_method === "private_key"
  const auth = (
    <Section title="Credentials">
      {p === "sftp" && (
        <Segmented
          label="Authentication"
          value={values.auth_method}
          onChange={(v) => set("auth_method", v)}
          options={[
            { value: "password", label: "Password" },
            { value: "private_key", label: "Private key" },
          ]}
        />
      )}
      <Field
        label={userLabel}
        error={errors.username}
        hint={p === "ftp" ? "Leave empty to log in anonymously." : undefined}
      >
        {(f) => (
          <Input
            {...f}
            value={values.username}
            onChange={(e) => set("username", e.target.value)}
            placeholder={p === "ftp" ? "anonymous" : undefined}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            enterKeyHint="next"
            className="font-mono"
          />
        )}
      </Field>
      {key ? (
        <>
          <Field
            label="Private key"
            error={errors.private_key}
            hint={
              saved?.auth_method === "private_key" && saved.has_private_key
                ? "A key is saved. Paste a new one to replace it."
                : "OpenSSH or PEM format. Stored encrypted."
            }
          >
            {(f) => (
              <PrivateKeyInput
                {...f}
                value={values.private_key}
                onChange={(v) => set("private_key", v)}
                load={
                  saved?.auth_method === "private_key" && saved.has_private_key
                    ? () => reveal.mutateAsync().then((c) => c.private_key)
                    : undefined
                }
              />
            )}
          </Field>
          <Field
            label="Passphrase"
            error={errors.passphrase}
            hint={
              saved?.has_passphrase
                ? "Saved. Leave blank to keep it."
                : "Only if the key is encrypted."
            }
          >
            {(f) => (
              <SecretInput
                {...f}
                label="passphrase"
                value={values.passphrase}
                onChange={(e) => set("passphrase", e.target.value)}
                placeholder={saved?.has_passphrase ? "••••••••" : undefined}
                autoComplete="off"
                load={
                  saved?.has_passphrase
                    ? () => reveal.mutateAsync().then((c) => c.passphrase)
                    : undefined
                }
              />
            )}
          </Field>
        </>
      ) : (
        <>
          <Field
            label={secretLabel}
            error={errors.secret}
            hint={
              saved?.has_secret && !values.clear_secret
                ? "Saved and encrypted. Leave blank to keep it."
                : "Stored encrypted."
            }
          >
            {(f) => (
              <SecretInput
                {...f}
                label={secretLabel.toLowerCase()}
                value={values.secret}
                onChange={(e) => {
                  set("secret", e.target.value)
                  if (e.target.value) set("clear_secret", false)
                }}
                placeholder={
                  saved?.has_secret && !values.clear_secret
                    ? "••••••••"
                    : undefined
                }
                autoComplete="new-password"
                load={
                  saved?.has_secret && !values.clear_secret
                    ? () => reveal.mutateAsync().then((c) => c.secret)
                    : undefined
                }
              />
            )}
          </Field>
          {saved?.has_secret && !values.secret && (
            <CheckRow
              checked={values.clear_secret}
              onChange={(on) => set("clear_secret", on)}
              label={`Forget the saved ${secretLabel.toLowerCase()}`}
            />
          )}
        </>
      )}
    </Section>
  )

  const options = (
    <Section title="Options">
      <Field
        label="Start folder"
        error={errors.root_path}
        hint={
          p === "s3"
            ? "Show only this bucket/prefix, e.g. /backups/db."
            : "Show only this folder and what's inside. Empty = the login folder."
        }
      >
        {(f) => (
          <Input
            {...f}
            value={values.root_path}
            onChange={(e) => set("root_path", e.target.value)}
            placeholder="/"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            enterKeyHint="next"
            className="font-mono"
          />
        )}
      </Field>
      <CheckRow
        checked={values.read_only}
        onChange={(on) => set("read_only", on)}
        label="Read-only"
        text="Browse and download only. Morcheh refuses every change, transfers into it too."
      />
      <Field label="Notes" error={errors.description}>
        {(f) => (
          <Textarea
            {...f}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What's kept here, who pays for it…"
            maxLength={500}
            className="min-h-20"
          />
        )}
      </Field>
    </Section>
  )

  const testButton = (
    <Button
      type="button"
      variant="outline"
      className="max-md:h-11"
      onClick={runTest}
      disabled={test.isPending}
    >
      {test.isPending ? <Loader2 className="animate-spin" /> : <PlugZap />}
      {test.isPending ? "Connecting…" : "Test connection"}
    </Button>
  )

  const testError =
    test.isError && !Object.keys(fieldErrors(test.error)).length
      ? test.error.message
      : null
  const testResult = tested ? (
    <TestResult result={tested} />
  ) : testError ? (
    <p role="alert" className="text-caption text-destructive">
      {testError}
    </p>
  ) : null

  return (
    <form id={formId} onSubmit={submit} noValidate className={className}>
      {children({
        kind,
        connection: connectionPart,
        auth,
        options,
        testButton,
        testResult,
      })}
    </form>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="font-label text-caption tracking-label text-ash uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function CheckRow({
  checked,
  onChange,
  label,
  text,
  warning,
}: {
  checked: boolean
  onChange: (on: boolean) => void
  label: string
  text?: string
  warning?: string
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
        {text && (
          <span className="block text-caption text-muted-foreground">
            {text}
          </span>
        )}
        {warning && (
          <span className="mt-1 flex items-center gap-1.5 text-caption text-warning">
            <TriangleAlert className="size-3.5 shrink-0" />
            {warning}
          </span>
        )}
      </span>
    </label>
  )
}

function TestResult({ result }: { result: StorageTestOutputBody }) {
  const online = result.status === "online"
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-body-sm",
        online
          ? "border-border bg-subtle"
          : "border-destructive/30 bg-destructive/5",
      )}
    >
      <span className="flex items-center gap-2 font-medium">
        <StatusDot status={result.status} />
        {online
          ? `Connected in ${result.latency_ms} ms`
          : statusMeta[result.status].label}
      </span>
      {online && result.detail && (
        <span className="text-muted-foreground">{result.detail}</span>
      )}
      {result.message && (
        <span className="text-muted-foreground">{result.message}</span>
      )}
      {result.host_key_fingerprint && (
        <span className="truncate font-mono text-caption text-ash">
          {result.host_key_fingerprint}
        </span>
      )}
    </div>
  )
}
