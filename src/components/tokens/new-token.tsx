"use client"

import { BookOpen, ShieldCheck, TriangleAlert } from "lucide-react"
import Link from "next/link"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { CodeTabs } from "@/components/code-block"
import { CredentialRow } from "@/components/credentials"
import { Field } from "@/components/field"
import { guideHref } from "@/components/help/guides"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { fieldErrors } from "@/lib/api"
import type { ApiTokenCreated } from "@/lib/services"
import { useCreateToken } from "./api"
import {
  cliExample,
  curlExample,
  type Expiry,
  envExample,
  expiryChoices,
} from "./meta"

// New token: a name, read only or not, how long it lasts. Once made, the
// same layer shows the token (only this once) with examples to copy. The
// token lives in this component's state and goes when the layer closes.
export function NewTokenDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [made, setMade] = useState<ApiTokenCreated | null>(null)
  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) setMade(null)
  }
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={close}
      title={made ? "Copy your new token" : "New API token"}
      description={
        made
          ? undefined
          : "A token acts as you: the same access, nothing more. Scripts, the morche CLI and other tools send it instead of a password."
      }
      className={made ? "sm:max-w-xl" : "sm:max-w-lg"}
      footer={
        made && (
          <Button
            className="max-md:h-11 max-md:w-full"
            onClick={() => close(false)}
          >
            I've copied it
          </Button>
        )
      }
    >
      {made ? (
        <Created made={made} />
      ) : (
        <TokenForm
          key={String(open)}
          onMade={setMade}
          onCancel={() => close(false)}
        />
      )}
    </ResponsiveDialog>
  )
}

function TokenForm({
  onMade,
  onCancel,
}: {
  onMade: (made: ApiTokenCreated) => void
  onCancel: () => void
}) {
  const create = useCreateToken()
  const [name, setName] = useState("")
  const [readOnly, setReadOnly] = useState(false)
  const [expiry, setExpiry] = useState<Expiry>("90")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrors({ name: "Give it a name, like where it's used" })
      return
    }
    setErrors({})
    create.mutate(
      {
        name: name.trim(),
        read_only: readOnly,
        expires_in_days: Number(expiry),
      },
      {
        onSuccess: onMade,
        onError: (err) => {
          const fields = fieldErrors(err)
          setErrors(fields)
          if (!Object.keys(fields).length) toast.error(err.message)
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Field
        label="Name"
        hint="Where it's used, so you know which one to revoke later."
        error={errors.name}
      >
        {(p) => (
          <Input
            {...p}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Deploy script on the CI server"
            maxLength={100}
            autoComplete="off"
            className="placeholder:text-ash"
          />
        )}
      </Field>
      <div className="flex min-h-11 items-start justify-between gap-4">
        <label htmlFor="token-read-only" className="min-w-0">
          <span className="block text-body-sm font-medium">Read only</span>
          <span className="block text-caption text-muted-foreground">
            It can look but never change anything: only GET requests. Good for
            dashboards and reports.
          </span>
        </label>
        <Switch
          id="token-read-only"
          checked={readOnly}
          onCheckedChange={setReadOnly}
          className="mt-1"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-body-sm font-medium">Expires after</span>
        <div className="no-scrollbar max-w-full overflow-x-auto">
          <Segmented
            label="Expires after"
            items={expiryChoices}
            value={expiry}
            onChange={setExpiry}
          />
        </div>
        <p className="text-caption text-muted-foreground">
          {expiry === "0"
            ? "It works until you revoke it. Prefer an end date for anything that leaves your laptop."
            : "After that it stops working; make a new one then."}
        </p>
      </div>
      <p className="flex gap-2 rounded-lg bg-subtle px-3 py-2.5 text-caption text-muted-foreground">
        <ShieldCheck className="mt-px size-4 shrink-0 text-ash" />
        <span>
          A token can't change your password, account, sessions or other tokens:
          those need you signed in.
        </span>
      </p>
      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button
          type="button"
          variant="ghost"
          className="max-md:h-11"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="max-md:h-11"
          disabled={create.isPending}
        >
          {create.isPending ? "Making…" : "Make token"}
        </Button>
      </div>
    </form>
  )
}

function Created({ made }: { made: ApiTokenCreated }) {
  const token = made.secret
  return (
    <div className="flex flex-col gap-5">
      <p className="flex gap-2.5 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2.5 text-body-sm">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
        <span>
          <span className="font-medium">Copy it now.</span>{" "}
          <span className="text-muted-foreground">
            It won't be shown again: Morche keeps only a fingerprint of it. Lost
            it? Revoke it and make a new one.
          </span>
        </span>
      </p>
      <CredentialRow
        label={made.token.name}
        hint={made.token.read_only ? "Read only" : "Read and write"}
        value={token}
        copyLabel="token"
        wrap
      />
      <div className="flex flex-col gap-2">
        <p className="text-body-sm font-medium">Try it</p>
        <CodeTabs
          label="example"
          samples={[
            { key: "curl", label: "curl", code: curlExample(token) },
            { key: "cli", label: "morche CLI", code: cliExample(token) },
            { key: "env", label: "Environment", code: envExample(token) },
          ]}
        />
      </div>
      <Link
        href={guideHref("api", "using")}
        className="inline-flex items-center gap-1.5 self-start text-body-sm font-medium text-brand underline-offset-4 hover:underline max-md:min-h-11"
      >
        <BookOpen className="size-4" />
        How to use the API
      </Link>
    </div>
  )
}
