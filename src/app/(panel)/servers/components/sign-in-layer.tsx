"use client"

import { HardDrive, Loader2, LogIn, RefreshCw } from "lucide-react"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { useAccess } from "@/components/auth/auth"
import { CodeBlock } from "@/components/code-block"
import { useWorkspace } from "@/components/panel/workspace"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { PrivateKeyInput, SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { fieldErrors } from "@/lib/api"
import type { Server, ServerSignInBody } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useAddMorcheHost,
  useCheckServer,
  useMorcheHost,
  useSignInServer,
} from "../api"
import { Field, Segmented } from "./fields"

type Mode = "sign-in" | "command"

// The one-liner that puts Morche's key on `user` (run as root or with sudo),
// the same steps the backend runs after a sign-in.
export function keyCommand(user: string, key: string) {
  const home = user === "root" ? "~root" : `~${user}`
  const own = user === "root" ? "" : ` && chown -R ${user}: .ssh`
  return (
    `sudo sh -c 'cd ${home} && umask 077 && mkdir -p .ssh && ` +
    `{ grep -qxF "${key}" .ssh/authorized_keys 2>/dev/null || ` +
    `echo "${key}" >> .ssh/authorized_keys; }${own}'`
  )
}

// Signs in to a server once: Morche puts its own key on it and forgets what
// was typed (unless Keep this login), or the key is put there by hand.
export function SignInLayer({
  open,
  onOpenChange,
  server,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: Server | null
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={server ? `Sign in to ${server.name}` : "Sign in"}
      description={
        server?.morche_host
          ? "This is the machine Morche runs on. Sign in once and Morche manages it like any other server."
          : "Sign in once to finish adding this server."
      }
      className="sm:max-w-lg"
    >
      {server && (
        <SignInBody server={server} onDone={() => onOpenChange(false)} />
      )}
    </ResponsiveDialog>
  )
}

function SignInBody({
  server,
  onDone,
}: {
  server: Server
  onDone: () => void
}) {
  const ownKey = server.setup_public_key !== ""
  const [mode, setMode] = useState<Mode>("sign-in")

  return (
    <div className="flex flex-col gap-4">
      {ownKey && (
        <Segmented
          label="How to sign in"
          value={mode}
          onChange={setMode}
          options={[
            { value: "sign-in", label: "With a password or key" },
            { value: "command", label: "Run a command instead" },
          ]}
        />
      )}
      {mode === "sign-in" ? (
        <SignInForm server={server} ownKey={ownKey} onDone={onDone} />
      ) : (
        <CommandPanel server={server} onDone={onDone} />
      )}
    </div>
  )
}

function SignInForm({
  server,
  ownKey,
  onDone,
}: {
  server: Server
  ownKey: boolean
  onDone: () => void
}) {
  const [username, setUsername] = useState(
    server.username === "root" ? "" : server.username,
  )
  const [method, setMethod] =
    useState<ServerSignInBody["auth_method"]>("password")
  const [password, setPassword] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const [passphrase, setPassphrase] = useState("")
  const [asRoot, setAsRoot] = useState(true)
  const [keep, setKeep] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const signIn = useSignInServer()

  const user = username.trim()
  const rootUser = user === "root"
  const showRoot = ownKey && !keep && !rootUser

  function submit(event: FormEvent) {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!user) next.username = "Enter the username"
    if (method === "password" && !password) next.password = "Enter the password"
    if (method === "private_key" && !privateKey.trim())
      next.private_key = "Paste the private key"
    setErrors(next)
    if (Object.keys(next).length) return
    signIn.mutate(
      {
        id: server.id,
        body: {
          username: user,
          auth_method: method,
          ...(method === "password"
            ? { password }
            : { private_key: privateKey, passphrase }),
          keep_login: keep || !ownKey,
          as_root: showRoot && asRoot,
        },
      },
      {
        onSuccess: (s) => {
          onDone()
          toast.success(`Signed in to ${s.name}`, {
            description:
              s.status === "online"
                ? `Morche works as ${s.username} from now on.`
                : s.status_message,
          })
        },
        onError: (error) => {
          const fields = fieldErrors(error)
          if (Object.keys(fields).length) setErrors(fields)
          else setErrors({ form: error.message })
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field
        label="Username"
        error={errors.username}
        hint={
          rootUser && method === "password"
            ? "Most servers don't let root sign in with a password: use your own user, one that can use sudo."
            : "A user on that machine, for example the one you use with SSH."
        }
      >
        {(p) => (
          <Input
            {...p}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ubuntu"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            className="font-mono"
          />
        )}
      </Field>

      <Segmented
        label="Sign in with"
        value={method}
        onChange={setMethod}
        options={[
          { value: "password", label: "Password" },
          { value: "private_key", label: "Private key" },
        ]}
      />

      {method === "password" ? (
        <Field label="Password" error={errors.password}>
          {(p) => (
            <SecretInput
              {...p}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              enterKeyHint="go"
            />
          )}
        </Field>
      ) : (
        <>
          <Field
            label="Private key"
            error={errors.private_key}
            hint="OpenSSH or PEM format."
          >
            {(p) => (
              <PrivateKeyInput
                {...p}
                value={privateKey}
                onChange={setPrivateKey}
              />
            )}
          </Field>
          <Field
            label="Passphrase"
            error={errors.passphrase}
            hint="Only if the key is encrypted."
          >
            {(p) => (
              <SecretInput
                {...p}
                label="passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                autoComplete="off"
              />
            )}
          </Field>
        </>
      )}

      {ownKey && (
        <div className="flex flex-col gap-3 rounded-xl border p-3">
          {showRoot && (
            <Option
              checked={asRoot}
              onChange={setAsRoot}
              title="Work as root (recommended)"
              hint={`Morche's key goes on root through sudo, so every section works. Needs ${user || "this user"} to be able to use sudo.`}
              error={errors.as_root}
            />
          )}
          <Option
            checked={keep}
            onChange={setKeep}
            title="Keep this login instead of Morche's key"
            hint={
              keep
                ? "What you typed is stored encrypted and used from now on."
                : "Off: Morche puts its own key on the server, checks it works, and forgets what you typed."
            }
          />
        </div>
      )}

      {errors.form && (
        <p role="alert" className="text-body-sm text-destructive">
          {errors.form}
        </p>
      )}

      <div className="flex justify-end gap-2 max-md:flex-col-reverse">
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          className="max-md:h-11"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={signIn.isPending}
          className="max-md:h-11"
        >
          {signIn.isPending ? <Loader2 className="animate-spin" /> : <LogIn />}
          {signIn.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </div>
    </form>
  )
}

function Option({
  checked,
  onChange,
  title,
  hint,
  error,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  title: string
  hint: string
  error?: string
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox is the control
    <label className="flex cursor-pointer items-start gap-3">
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        className="mt-0.5"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-medium">{title}</span>
        <span className="block text-caption text-muted-foreground">{hint}</span>
        {error && (
          <span className="mt-1 block text-caption text-destructive">
            {error}
          </span>
        )}
      </span>
    </label>
  )
}

function CommandPanel({
  server,
  onDone,
}: {
  server: Server
  onDone: () => void
}) {
  const check = useCheckServer()
  const command = keyCommand(server.username, server.setup_public_key)

  function checkNow() {
    check.mutate(
      { id: server.id },
      {
        onSuccess: (s) => {
          if (s.status === "online") {
            onDone()
            toast.success(`${s.name} is online`, {
              description: `Morche works as ${s.username} with its own key.`,
            })
          } else if (s.status === "needs_login") {
            toast.error("The key isn't there yet", {
              description: "Run the command on the server, then check again.",
            })
          } else {
            toast.error(s.status_message || "Couldn't reach it")
          }
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-muted-foreground">
        Run this once in a terminal on the server. It puts Morche's key in{" "}
        <span className="font-mono text-foreground">{server.username}</span>'s{" "}
        <span className="font-mono">authorized_keys</span>. Morche also checks
        by itself every 3 minutes.
      </p>
      <CodeBlock code={command} label="command" wrap />
      <p className="text-caption text-muted-foreground">
        To work as another user, sign in with its password instead, or change
        the username under Edit.
      </p>
      <div className="flex justify-end gap-2 max-md:flex-col-reverse">
        <Button variant="outline" onClick={onDone} className="max-md:h-11">
          Close
        </Button>
        <Button
          onClick={checkNow}
          disabled={check.isPending}
          className="max-md:h-11"
        >
          {check.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <RefreshCw />
          )}
          Check now
        </Button>
      </div>
    </div>
  )
}

// Offered on top of Add server while the machine Morche runs on isn't a
// server (system admins only): one click adds it, then Sign in opens.
export function MorcheHostOffer({
  onAdded,
  className,
}: {
  onAdded: (server: Server) => void
  className?: string
}) {
  const { admin } = useAccess()
  const { workspace } = useWorkspace()
  const host = useMorcheHost(admin)
  const add = useAddMorcheHost()
  if (!admin || !workspace || !host.data || host.data.server_id) return null
  // Outside Docker and without MANAGE_HOST the default address leads nowhere.
  if (!host.data.enabled && !host.data.in_container) return null
  const { address, port } = host.data

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-brand/25 bg-brand-soft p-3",
        className,
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-brand">
        <HardDrive className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-medium">The machine Morche runs on</p>
        <p className="text-caption text-muted-foreground">
          Add it and sign in once. Morche reaches it at{" "}
          <span className="font-mono">
            {address}:{port}
          </span>
          .
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 max-md:h-9"
        disabled={add.isPending}
        onClick={() =>
          add.mutate(workspace.id, {
            onSuccess: (s) => {
              toast.success(`Added ${s.name}`, {
                description: "Sign in once to finish.",
              })
              onAdded(s)
            },
            onError: (e) => toast.error(e.message),
          })
        }
      >
        {add.isPending && <Loader2 className="animate-spin" />}
        Add it
      </Button>
    </div>
  )
}
