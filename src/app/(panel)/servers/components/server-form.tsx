"use client"

import { FileKey, Loader2, PlugZap } from "lucide-react"
import {
  type ClipboardEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { fieldErrors } from "@/lib/api"
import type {
  ConnectionTestOutputBody,
  Server,
  ServerBody,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useFacets, useFolders, useTestConnection } from "../api"
import { Field, FolderSelect, Segmented, TagInput } from "./fields"
import { buildTree } from "./folder-tree"
import { osLabel, StatusDot, statusMeta } from "./meta"

type AuthMethod = ServerBody["auth_method"]

type Values = {
  name: string
  host: string
  port: string
  username: string
  auth_method: AuthMethod
  password: string
  private_key: string
  passphrase: string
  folder_id: string | null
  tags: string[]
  description: string
}

export type ServerFormDefaults = Pick<Values, "folder_id" | "tags">

function initialValues(
  server?: Server,
  defaults?: Partial<ServerFormDefaults>,
): Values {
  return {
    name: server?.name ?? "",
    host: server?.host ?? "",
    port: String(server?.port ?? 22),
    username: server?.username ?? "root",
    auth_method: server?.auth_method ?? "password",
    password: "",
    private_key: "",
    passphrase: "",
    folder_id: server ? server.folder_id : (defaults?.folder_id ?? null),
    tags: server?.tags ?? defaults?.tags ?? [],
    description: server?.description ?? "",
  }
}

// What the API gets. Secrets left blank are omitted, so an edit keeps the
// stored ones.
export function toBody(v: Values, favorite?: boolean): ServerBody {
  const key = v.auth_method === "private_key"
  return {
    name: v.name.trim(),
    host: v.host.trim(),
    port: Number(v.port) || 22,
    username: v.username.trim(),
    auth_method: v.auth_method,
    password: !key && v.password ? v.password : undefined,
    private_key: key && v.private_key.trim() ? v.private_key : undefined,
    passphrase: key && v.passphrase ? v.passphrase : undefined,
    folder_id: v.folder_id,
    tags: v.tags,
    description: v.description.trim(),
    favorite,
  }
}

// Whether a save changes how we connect, so the server should be re-checked.
export function connectionChanged(server: Server, v: Values) {
  return (
    server.host !== v.host.trim() ||
    server.port !== (Number(v.port) || 22) ||
    server.username !== v.username.trim() ||
    server.auth_method !== v.auth_method ||
    Boolean(v.password || v.private_key.trim() || v.passphrase)
  )
}

// Reads what people paste into Host: `ssh -p 2222 ant@10.0.0.5`,
// `ant@10.0.0.5:2222`, `ssh://ant@[2001:db8::1]:2222`… null when it's just a
// host, so a plain paste stays a plain paste.
export function parseSshTarget(
  text: string,
): { host: string; username?: string; port?: string } | null {
  const tokens = text.trim().split(/\s+/)
  if (tokens[0] === "ssh") tokens.shift()
  // ssh flags that take a value; the rest are bare switches.
  const withValue = new Set(["-b", "-c", "-D", "-E", "-F", "-i", "-J", "-L"])
  for (const f of ["-m", "-o", "-Q", "-R", "-S", "-W", "-w"]) withValue.add(f)
  let target: string | undefined
  let username: string | undefined
  let port: string | undefined
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (t === "-p") port = tokens[++i]
    else if (t === "-l") username = tokens[++i]
    else if (withValue.has(t)) i++
    else if (t.startsWith("-")) continue
    else if (!target) target = t
  }
  if (!target) return null

  let rest = target.replace(/^ssh:\/\//, "")
  const at = rest.lastIndexOf("@")
  if (at > 0) {
    username = rest.slice(0, at)
    rest = rest.slice(at + 1)
  }
  let host = rest
  const v6 = rest.match(/^\[(.+)\](?::(\d+))?$/)
  if (v6) {
    host = v6[1]
    port = v6[2] ?? port
  } else if (rest.split(":").length === 2) {
    const [h, p] = rest.split(":")
    host = h
    if (/^\d+$/.test(p)) port = p
  }
  host = host.replace(/\/$/, "")
  if (!host || (!username && !port && host === text.trim())) return null
  return { host, username, port: port && /^\d+$/.test(port) ? port : undefined }
}

export type ServerFormSubmit = {
  values: Values
  body: ServerBody
  setErrors: (errors: Record<string, string>) => void
}

// The fields of the add/edit form, shared by the desktop sheet and the phone
// sheet. The container renders the submit button with form={formId}.
// The pieces a container arranges: the desktop sheet keeps the test in its
// footer, the phone sheet keeps it inline after Authentication.
export type ServerFormParts = {
  connection: ReactNode
  auth: ReactNode
  organize: ReactNode
  testButton: ReactNode
  /** The last test's outcome; null until there is one. */
  testResult: ReactNode
}

export function ServerForm({
  formId,
  server,
  defaults,
  focusName = false,
  onSubmit,
  className,
  children,
}: {
  formId: string
  server?: Server
  defaults?: Partial<ServerFormDefaults>
  /** Focus Name on mount (pointer devices only), e.g. after "Add another". */
  focusName?: boolean
  onSubmit: (submit: ServerFormSubmit) => void
  className?: string
  children: (parts: ServerFormParts) => ReactNode
}) {
  const [values, setValues] = useState(() => initialValues(server, defaults))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const folders = useFolders()
  const facets = useFacets()
  const { roots } = buildTree(folders.data ?? [])
  const test = useTestConnection()
  const [tested, setTested] = useState<ConnectionTestOutputBody | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: on mount only
  useEffect(() => {
    if (focusName && matchMedia("(pointer: fine)").matches) {
      nameRef.current?.focus()
    }
  }, [])

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors(({ [key]: _, ...rest }) => rest)
    if (key !== "name" && key !== "folder_id" && key !== "tags") setTested(null)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!values.name.trim()) e.name = "Give the server a name"
    if (!values.host.trim()) e.host = "Enter an IP address or hostname"
    const port = Number(values.port)
    if (!Number.isInteger(port) || port < 1 || port > 65535) e.port = "1–65535"
    if (!values.username.trim()) e.username = "Enter the SSH user"
    if (
      values.auth_method === "password" &&
      !values.password &&
      !server?.has_password
    )
      e.password = "Enter the password"
    if (
      values.auth_method === "private_key" &&
      !values.private_key.trim() &&
      !server?.has_private_key
    )
      e.private_key = "Paste the private key or load it from a file"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!validate()) return
    onSubmit({ values, body: toBody(values, server?.favorite), setErrors })
  }

  function runTest() {
    if (!validate()) return
    const b = toBody(values)
    setTested(null)
    test.mutate(
      {
        host: b.host,
        port: b.port,
        username: b.username,
        auth_method: b.auth_method,
        password: b.password,
        private_key: b.private_key,
        passphrase: b.passphrase,
        server_id: server?.id,
      },
      {
        onSuccess: setTested,
        onError: (error) => setErrors((e) => ({ ...e, ...fieldErrors(error) })),
      },
    )
  }

  function pasteHost(event: ClipboardEvent<HTMLInputElement>) {
    const parsed = parseSshTarget(event.clipboardData.getData("text"))
    if (!parsed) return
    event.preventDefault()
    setValues((v) => ({
      ...v,
      host: parsed.host,
      username: parsed.username ?? v.username,
      port: parsed.port ?? v.port,
    }))
    setErrors(({ host: _h, username: _u, port: _p, ...rest }) => rest)
    setTested(null)
  }

  async function loadKey(file: File | undefined) {
    if (!file) return
    set("private_key", await file.text())
  }

  const editingKey = server?.auth_method === "private_key"

  const connection = (
    <Section title="Connection">
      <Field label="Name" error={errors.name}>
        {(p) => (
          <Input
            {...p}
            ref={nameRef}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="web-1"
            autoComplete="off"
            maxLength={64}
            enterKeyHint="next"
          />
        )}
      </Field>
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
        <Field
          label="Host"
          error={errors.host}
          hint={
            <>
              Paste <code className="font-mono">ssh user@host -p 22</code> to
              fill user and port too.
            </>
          }
        >
          {(p) => (
            <Input
              {...p}
              value={values.host}
              onChange={(e) => set("host", e.target.value)}
              onPaste={pasteHost}
              placeholder="203.0.113.10 or web-1.example.com"
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
        <Field label="Port" error={errors.port}>
          {(p) => (
            <Input
              {...p}
              value={values.port}
              onChange={(e) => set("port", e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              maxLength={5}
              enterKeyHint="next"
              className="font-mono"
            />
          )}
        </Field>
      </div>
      <Field label="Username" error={errors.username}>
        {(p) => (
          <Input
            {...p}
            value={values.username}
            onChange={(e) => set("username", e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            enterKeyHint="next"
            className="font-mono"
          />
        )}
      </Field>
    </Section>
  )

  const auth = (
    <Section title="Authentication">
      <Segmented
        label="Authentication"
        value={values.auth_method}
        onChange={(v) => set("auth_method", v)}
        options={[
          { value: "password", label: "Password" },
          { value: "private_key", label: "Private key" },
        ]}
      />

      {values.auth_method === "password" ? (
        <Field
          label="Password"
          error={errors.password}
          hint={
            server?.has_password
              ? "Saved and encrypted. Leave blank to keep it."
              : "Stored encrypted on the server."
          }
        >
          {(p) => (
            <Input
              {...p}
              type="password"
              value={values.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder={server?.has_password ? "••••••••" : undefined}
              autoComplete="new-password"
            />
          )}
        </Field>
      ) : (
        <>
          <Field
            label="Private key"
            error={errors.private_key}
            hint={
              editingKey && server?.has_private_key
                ? "A key is saved. Paste a new one to replace it."
                : "OpenSSH or PEM format. Stored encrypted."
            }
          >
            {(p) => (
              <div className="flex flex-col gap-2">
                <Textarea
                  {...p}
                  value={values.private_key}
                  onChange={(e) => set("private_key", e.target.value)}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="field-sizing-fixed h-36 resize-none font-mono text-caption md:text-caption"
                />
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  onChange={(e) => loadKey(e.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="self-start max-md:h-11"
                  onClick={() => fileRef.current?.click()}
                >
                  <FileKey />
                  Load from file
                </Button>
              </div>
            )}
          </Field>
          <Field
            label="Passphrase"
            error={errors.passphrase}
            hint={
              server?.has_passphrase
                ? "Saved. Leave blank to keep it."
                : "Only if the key is encrypted."
            }
          >
            {(p) => (
              <Input
                {...p}
                type="password"
                value={values.passphrase}
                onChange={(e) => set("passphrase", e.target.value)}
                autoComplete="off"
              />
            )}
          </Field>
        </>
      )}
    </Section>
  )

  const organize = (
    <Section title="Organize">
      <Field label="Folder">
        {(p) => (
          <FolderSelect
            id={p.id}
            roots={roots}
            value={values.folder_id}
            onChange={(v) => set("folder_id", v)}
          />
        )}
      </Field>
      <Field label="Tags" error={errors.tags} hint="e.g. prod, web, eu-west">
        {(p) => (
          <TagInput
            id={p.id}
            value={values.tags}
            onChange={(tags) => set("tags", tags)}
            suggestions={facets.data?.tags.map((t) => t.value)}
            invalid={Boolean(errors.tags)}
          />
        )}
      </Field>
      <Field label="Notes" error={errors.description}>
        {(p) => (
          <Textarea
            {...p}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What runs here, who owns it…"
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
      {children({ connection, auth, organize, testButton, testResult })}
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

function TestResult({ result }: { result: ConnectionTestOutputBody }) {
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
      {online && result.os.id && (
        <span className="text-muted-foreground">
          {osLabel(result.os)}
          {result.os.arch && ` · ${result.os.arch}`}
          {result.hostname && ` · ${result.hostname}`}
        </span>
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
