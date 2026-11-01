"use client"

import { Check, Copy, Download, Eye, EyeOff, LoaderCircle } from "lucide-react"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import type { Server, ServerCredentials } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCredentials } from "../api"
import { sshCommand } from "./meta"

// Everything needed to connect to a server by hand, secrets included. The
// secrets are fetched when the layer opens and dropped when it closes.
export function CredentialsLayer({
  open,
  onOpenChange,
  server,
  onEdit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: Server | null
  onEdit: () => void
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="SSH credentials"
      description={server ? server.name : undefined}
      className="sm:max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button variant="outline" className="max-md:h-11" onClick={onEdit}>
            Edit credentials
          </Button>
          <Button className="max-md:h-11" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      }
    >
      {server && <Details server={server} />}
    </ResponsiveDialog>
  )
}

function Details({ server }: { server: Server }) {
  const query = useCredentials(server.id)

  if (query.isPending) {
    return (
      <p className="flex items-center gap-2 py-6 text-body-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        Decrypting…
      </p>
    )
  }
  if (query.isError) {
    return (
      <div className="flex flex-col items-start gap-3 py-2">
        <p className="text-body-sm text-destructive">{query.error.message}</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  const c = query.data
  const key = c.auth_method === "private_key"
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
        <Row label="Host" value={c.host} />
        <Row label="Port" value={String(c.port)} />
      </div>
      <Row label="Username" value={c.username} />
      {key ? (
        <>
          <Row
            label="Private key"
            value={c.private_key}
            secret
            block
            download={`${server.name}.key`}
          />
          {c.passphrase ? (
            <Row label="Passphrase" value={c.passphrase} secret />
          ) : (
            <Note label="Passphrase">None, the key isn't encrypted</Note>
          )}
          {c.public_key && (
            <Row
              label="Public key"
              hint={c.public_key_fingerprint}
              value={c.public_key}
              wrap
            />
          )}
        </>
      ) : c.password ? (
        <Row label="Password" value={c.password} secret />
      ) : (
        <Note label="Password">No password is stored</Note>
      )}
      {c.host_key ? (
        <Row
          label="Host key"
          hint={c.host_key_fingerprint}
          value={knownHostsLine(c)}
          copyLabel="known_hosts line"
          wrap
        />
      ) : (
        <Note label="Host key">Trusted on the first successful check</Note>
      )}
      <Row label="SSH command" value={sshCommand(c)} />
    </div>
  )
}

// The trusted host key as a line for ~/.ssh/known_hosts.
function knownHostsLine(c: ServerCredentials) {
  const host = c.port === 22 ? c.host : `[${c.host}]:${c.port}`
  return `${host} ${c.host_key}`
}

function Row({
  label,
  hint,
  value,
  secret,
  block,
  wrap,
  download,
  copyLabel = label,
}: {
  label: string
  hint?: string
  value: string
  secret?: boolean
  // Multi-line value (a private key): shown as a scrolling block.
  block?: boolean
  wrap?: boolean
  download?: string
  copyLabel?: string
}) {
  const [shown, setShown] = useState(!secret)

  return (
    <div className="min-w-0">
      <Label label={label} hint={hint} />
      <div
        className={cn(
          "flex min-h-10 gap-1 rounded-lg bg-subtle ps-3 pe-1 max-md:min-h-11",
          block && shown ? "items-start py-1" : "items-center",
        )}
      >
        {block && shown ? (
          <pre className="max-h-48 min-w-0 flex-1 overflow-auto py-1.5 font-mono text-caption whitespace-pre">
            {value}
          </pre>
        ) : (
          <span
            className={cn(
              "min-w-0 flex-1 py-1.5 font-mono text-caption",
              wrap ? "break-all" : "truncate",
              !shown && "tracking-widest text-muted-foreground",
            )}
          >
            {shown ? value : "•".repeat(12)}
          </span>
        )}
        {secret && (
          <IconButton
            label={
              shown
                ? `Hide ${label.toLowerCase()}`
                : `Show ${label.toLowerCase()}`
            }
            onClick={() => setShown((s) => !s)}
          >
            {shown ? <EyeOff /> : <Eye />}
          </IconButton>
        )}
        {download && <DownloadButton name={download} text={value} />}
        <CopyButton label={copyLabel} text={value} />
      </div>
    </div>
  )
}

function Note({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label label={label} />
      <p className="text-body-sm text-ash">{children}</p>
    </div>
  )
}

function Label({ label, hint }: { label: string; hint?: string }) {
  return (
    <p className="mb-1.5 flex items-baseline justify-between gap-3 text-caption">
      <span className="shrink-0 font-medium text-muted-foreground">
        {label}
      </span>
      {hint && <span className="truncate font-mono text-ash">{hint}</span>}
    </p>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ash hover:bg-muted hover:text-foreground max-md:size-11 [&_svg]:size-4"
    >
      {children}
    </button>
  )
}

function CopyButton({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't access the clipboard")
    }
  }

  return (
    <IconButton label={`Copy ${label.toLowerCase()}`} onClick={copy}>
      {copied ? <Check className="text-success" /> : <Copy />}
    </IconButton>
  )
}

function DownloadButton({ name, text }: { name: string; text: string }) {
  function save() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }))
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <IconButton label="Download private key" onClick={save}>
      <Download />
    </IconButton>
  )
}
