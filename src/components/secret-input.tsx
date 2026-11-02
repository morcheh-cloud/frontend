"use client"

import { Copy, Eye, EyeOff, FileKey, LoaderCircle } from "lucide-react"
import { type ComponentProps, useRef, useState } from "react"
import { toast } from "sonner"

import { CredentialRow } from "@/components/credentials"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// Fetches a saved secret once, when asked. `load` is undefined when nothing
// is saved. The value lives only as long as the form does.
function useSavedSecret(load?: () => Promise<string>) {
  const [saved, setSaved] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // False when the fetch failed, so the field stays hidden.
  async function fetchSaved() {
    if (!load || saved !== null) return true
    setLoading(true)
    try {
      setSaved(await load())
      return true
    } catch (error) {
      toast.error((error as Error).message)
      return false
    } finally {
      setLoading(false)
    }
  }

  return { saved: load ? saved : null, loading, fetchSaved }
}

const copy = (text: string) =>
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success("Copied"))
    .catch(() => toast.error("Couldn't access the clipboard"))

const adornment =
  "flex size-11 items-center justify-center rounded-md text-ash hover:text-foreground md:size-8"

// A password field with an eye. With `load` (a secret is saved and the field
// is blank), the eye shows the saved one as the placeholder: the field stays
// blank, so saving still keeps what's stored.
export function SecretInput({
  value,
  label = "password",
  load,
  placeholder,
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "value" | "className"> & {
  value: string
  label?: string
  load?: () => Promise<string>
}) {
  const [shown, setShown] = useState(false)
  const { saved, loading, fetchSaved } = useSavedSecret(load)
  const revealed = shown && !value ? saved : null
  const copyable = value || revealed

  async function toggle() {
    if (!shown && !value && !(await fetchSaved())) return
    setShown((s) => !s)
  }

  return (
    <div className="relative">
      <Input
        {...props}
        type={shown ? "text" : "password"}
        value={value}
        placeholder={revealed || placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="pe-23 font-mono md:pe-18"
      />
      <div className="absolute end-0 top-1/2 flex -translate-y-1/2 md:end-1">
        {copyable && (
          <button
            type="button"
            aria-label={`Copy ${label}`}
            title={`Copy ${label}`}
            onClick={() => copy(copyable)}
            className={adornment}
          >
            <Copy className="size-4" />
          </button>
        )}
        <button
          type="button"
          aria-label={`${shown ? "Hide" : "Show"} ${label}`}
          title={`${shown ? "Hide" : "Show"} ${label}`}
          aria-pressed={shown}
          disabled={loading}
          onClick={toggle}
          className={adornment}
        >
          {loading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : shown ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </button>
      </div>
    </div>
  )
}

// A private key: pasted, loaded from a file, or, with `load`, the saved one
// shown under the field. Leaving the field blank keeps what's stored.
export function PrivateKeyInput({
  value,
  onChange,
  load,
  ...props
}: Omit<ComponentProps<typeof Textarea>, "value" | "onChange" | "className"> & {
  value: string
  onChange: (value: string) => void
  load?: () => Promise<string>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [shown, setShown] = useState(false)
  const { saved, loading, fetchSaved } = useSavedSecret(load)

  async function toggle() {
    if (!shown && !(await fetchSaved())) return
    setShown((s) => !s)
  }

  async function loadFile(file: File | undefined) {
    if (file) onChange(await file.text())
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
        onChange={(e) => loadFile(e.target.files?.[0])}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="max-md:h-11"
          onClick={() => fileRef.current?.click()}
        >
          <FileKey />
          Load from file
        </Button>
        {load && (
          <Button
            type="button"
            variant="outline"
            className="max-md:h-11"
            disabled={loading}
            aria-pressed={shown}
            onClick={toggle}
          >
            {loading ? (
              <LoaderCircle className="animate-spin" />
            ) : shown ? (
              <EyeOff />
            ) : (
              <Eye />
            )}
            {shown ? "Hide saved key" : "Show saved key"}
          </Button>
        )}
      </div>
      {shown && saved && (
        <CredentialRow label="Saved key" value={saved} block />
      )}
    </div>
  )
}
