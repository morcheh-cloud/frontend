"use client"

import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useState } from "react"

import { Field } from "@/app/(panel)/servers/components/fields"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { type ApiError, fieldErrors } from "@/lib/api"
import type { Job } from "@/lib/services"
import { nameError } from "./meta"
import { useSource } from "./source"

// The last part of a URL's path: what the server will call the file.
function urlName(raw: string) {
  try {
    const last = new URL(raw.trim()).pathname.split("/").pop() ?? ""
    return decodeURIComponent(last) || "download"
  } catch {
    return ""
  }
}

// Have the server download a URL into `dir`, as a background task: nothing
// goes through the browser, and it carries on if this page closes.
export function FetchDialog({
  open,
  setOpen,
  dir,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  dir: string
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      title="Download from a URL"
      description={`The server downloads the file straight into ${dir}.`}
    >
      <FetchForm key={String(open)} dir={dir} onClose={() => setOpen(false)} />
    </ResponsiveDialog>
  )
}

function FetchForm({ dir, onClose }: { dir: string; onClose: () => void }) {
  const source = useSource()
  const jobs = useJobActions()
  const [url, setUrl] = useState("")
  const [name, setName] = useState("")
  const [overwrite, setOverwrite] = useState(false)
  const [errors, setErrors] = useState<{ url?: string; name?: string }>({})

  const send = useMutation<Job, ApiError>({
    mutationFn: () => {
      if (!source.fetchUrl) throw new Error("This source can't download URLs")
      return source.fetchUrl({
        url: url.trim(),
        path: dir,
        name: name.trim() || undefined,
        overwrite,
      })
    },
    onSuccess: (job) => {
      onClose()
      jobs.track(job)
    },
    onError: (err) => {
      const fields = fieldErrors(err)
      setErrors({ url: fields.url, name: fields.name })
    },
  })

  const submit = () => {
    const link = url.trim()
    const custom = name.trim()
    const next = {
      url: /^https?:\/\/\S+$/i.test(link)
        ? undefined
        : "Enter a full http:// or https:// address.",
      name: (custom && nameError(custom)) || undefined,
    }
    setErrors(next)
    if (!next.url && !next.name) send.mutate()
  }

  const shownError =
    send.error &&
    !errors.url &&
    !errors.name &&
    (send.error.status === 409
      ? "A file with that name is already here. Tick “Replace existing file” or choose another name."
      : send.error.message)

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Field label="URL" error={errors.url}>
        {(p) => (
          <Input
            {...p}
            value={url}
            type="url"
            inputMode="url"
            placeholder="https://example.com/release.tar.gz"
            className="font-mono"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            onChange={(e) => {
              setUrl(e.target.value)
              send.reset()
            }}
          />
        )}
      </Field>
      <Field label="Save as" error={errors.name} hint="Optional.">
        {(p) => (
          <Input
            {...p}
            value={name}
            placeholder={urlName(url) || "Name from the URL"}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            onChange={(e) => {
              setName(e.target.value)
              send.reset()
            }}
          />
        )}
      </Field>
      {/* biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox renders the control inside */}
      <label className="flex items-start gap-2.5 text-body-sm">
        <Checkbox
          checked={overwrite}
          onCheckedChange={(on) => {
            setOverwrite(on)
            send.reset()
          }}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Replace existing file</span>
          <span className="block text-caption text-muted-foreground">
            Otherwise a name that's already here stops the download.
          </span>
        </span>
      </label>

      {shownError && (
        <p className="text-body-sm text-destructive">{shownError}</p>
      )}

      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button variant="outline" className="max-md:h-11" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="max-md:h-11" disabled={send.isPending}>
          {send.isPending && <Loader2 className="animate-spin" />}
          Download
        </Button>
      </div>
    </form>
  )
}
