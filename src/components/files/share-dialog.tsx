"use client"

import { useMutation } from "@tanstack/react-query"
import { Copy, Link, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Field, Segmented } from "@/app/(panel)/servers/components/fields"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ApiError } from "@/lib/api"
import { formatDate } from "./meta"
import { type FileEntry, useSource } from "./source"

const expiries = [
  { value: "3600", label: "1 hour" },
  { value: "86400", label: "1 day" },
  { value: "604800", label: "7 days" },
]

// A time-limited link anyone can open without signing in (S3 presigned URL).
export function ShareDialog({
  open,
  setOpen,
  entry,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  entry: FileEntry | null
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      title="Share link"
      description={
        entry
          ? `Anyone with the link can download ${entry.name} until it expires.`
          : undefined
      }
    >
      {entry && (
        <ShareForm
          key={`${entry.path}-${open}`}
          entry={entry}
          onClose={() => setOpen(false)}
        />
      )}
    </ResponsiveDialog>
  )
}

function ShareForm({
  entry,
  onClose,
}: {
  entry: FileEntry
  onClose: () => void
}) {
  const source = useSource()
  const [expiry, setExpiry] = useState("86400")
  const share = useMutation<{ url: string; expires_at: string }, ApiError>({
    mutationFn: () => {
      if (!source.share) throw new Error("This storage can't share links.")
      return source.share(entry.path, Number(expiry))
    },
  })
  const link = share.data

  const copy = () =>
    link &&
    navigator.clipboard
      .writeText(link.url)
      .then(() => toast.success("Link copied"))
      .catch(() => toast.error("Couldn't copy the link"))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className="text-body-sm font-medium">Expires after</p>
        <Segmented
          label="Expires after"
          value={expiry}
          options={expiries}
          onChange={(v) => {
            setExpiry(v)
            share.reset()
          }}
        />
      </div>
      {link ? (
        <Field
          label="Link"
          hint={`Works until ${formatDate(link.expires_at)}.`}
        >
          {(p) => (
            <div className="flex gap-2">
              <Input
                {...p}
                readOnly
                value={link.url}
                className="font-mono text-body-sm"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Copy link"
                className="max-md:size-11"
                onClick={copy}
              >
                <Copy />
              </Button>
            </div>
          )}
        </Field>
      ) : (
        share.error && (
          <p className="text-body-sm text-destructive">{share.error.message}</p>
        )
      )}
      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button variant="outline" className="max-md:h-11" onClick={onClose}>
          {link ? "Done" : "Cancel"}
        </Button>
        {link ? (
          <Button className="max-md:h-11" onClick={copy}>
            <Copy /> Copy link
          </Button>
        ) : (
          <Button
            className="max-md:h-11"
            disabled={share.isPending}
            onClick={() => share.mutate()}
          >
            {share.isPending ? <Loader2 className="animate-spin" /> : <Link />}
            Create link
          </Button>
        )}
      </div>
    </div>
  )
}
