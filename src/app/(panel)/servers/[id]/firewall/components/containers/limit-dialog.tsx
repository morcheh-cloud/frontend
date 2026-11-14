"use client"

import { Plus, TriangleAlert, X } from "lucide-react"
import {
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useState,
} from "react"

import { ResponsiveDialog } from "@/components/responsive-dialog"
import { checkEntry, rangeSize } from "@/components/sessions/ip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fieldErrors } from "@/lib/api"
import type {
  ContainerAccess,
  ContainerLimit,
  ContainerLimitBody,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { Field } from "../../../../components/fields"
import { Segmented } from "../../../components/parts"
import { useServerPage } from "../../../components/server-page"
import {
  isWebPort,
  lets,
  limitBody,
  overlaps,
  PRIVATE_NETWORKS,
  type Protocol,
  parsePorts,
  publishersOf,
} from "./meta"

const FORM_ID = "fw-container-limit"

export type LimitTarget = {
  limit?: ContainerLimit
  port?: string
  protocol?: Protocol
}

const plainInput = {
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const

// Who may reach one published port. The whole list goes to the server, this
// limit in its old place (or last), so a refused field can be found again.
export function LimitDialog({
  open,
  onOpenChange,
  access,
  target,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  access: ContainerAccess
  target: LimitTarget
  onSave: (list: ContainerLimitBody[], done: string) => Promise<void>
}) {
  const { phone } = useServerPage()
  const editing = target.limit
  const [port, setPort] = useState(editing?.port ?? target.port ?? "")
  const [protocol, setProtocol] = useState<Protocol>(
    editing?.protocol ?? target.protocol ?? "tcp",
  )
  const [mode, setMode] = useState<"only" | "nobody">(
    editing && editing.allow.length === 0 ? "nobody" : "only",
  )
  const [allow, setAllow] = useState<string[]>(editing?.allow ?? [])
  const [comment, setComment] = useState(editing?.comment ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [problem, setProblem] = useState<string>()
  const [saving, setSaving] = useState(false)

  const others = access.limits.filter((l) => l.id !== editing?.id)
  const range = parsePorts(port)
  const publishers = range ? publishersOf(access, protocol, port) : []
  const clash = range && others.find((l) => overlaps(l, { port, protocol }))
  const list = mode === "nobody" ? [] : allow
  const you = access.your_ip
  const locksYouOut =
    !!you && mode === "only" && list.length > 0 && !lets({ allow: list }, you)

  async function submit(e: FormEvent, pending: string[] = []) {
    e.preventDefault()
    setProblem(undefined)
    const allowed = mode === "nobody" ? [] : [...allow, ...pending]
    const wanted: Record<string, string> = {}
    if (!range) wanted.port = "Enter a port like 3030 or a range like 8000-8010"
    else if (clash) {
      wanted.port = `The limit on ${clash.port}/${clash.protocol} covers that already`
    }
    if (mode === "only" && allowed.length === 0) {
      wanted.allow = "Add at least one address, or choose Nobody from outside"
    }
    setErrors(wanted)
    if (Object.keys(wanted).length > 0) return

    const body: ContainerLimitBody = {
      protocol,
      port: port.trim(),
      allow: allowed,
      comment: comment.trim() || undefined,
    }
    const at = editing
      ? access.limits.findIndex((l) => l.id === editing.id)
      : others.length
    const next = others.map(limitBody)
    next.splice(at < 0 ? next.length : at, 0, body)
    setSaving(true)
    try {
      await onSave(
        next,
        editing
          ? `Limit on ${body.port}/${protocol} saved`
          : `Port ${body.port}/${protocol} limited`,
      )
      onOpenChange(false)
    } catch (err) {
      const prefix = `limits[${at}].`
      const own: Record<string, string> = {}
      let other: string | undefined
      for (const [k, v] of Object.entries(fieldErrors(err))) {
        if (k.startsWith(prefix)) own[k.slice(prefix.length)] = v
        else other ??= v
      }
      setErrors(own)
      if (Object.keys(own).length === 0) {
        setProblem(other ?? (err as Error).message)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Edit limit" : "Limit who can reach a port"}
      description="Docker publishes ports past ufw and firewalld. This limit is checked before Docker's own rules, so it holds."
      footer={
        <div className="flex w-full gap-2 max-md:flex-col md:justify-end">
          <Button
            type="submit"
            form={FORM_ID}
            size={phone ? "lg" : "default"}
            disabled={saving}
          >
            {saving ? "Applying…" : editing ? "Save" : "Limit it"}
          </Button>
          <Button
            type="button"
            size={phone ? "lg" : "default"}
            variant={phone ? "ghost" : "outline"}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <AddressForm
        port={port}
        setPort={setPort}
        protocol={protocol}
        setProtocol={setProtocol}
        publishers={publishers.map((p) =>
          p.target_port && p.target_port !== p.port
            ? `${p.container} (port ${p.target_port} inside)`
            : p.container,
        )}
        mode={mode}
        setMode={setMode}
        allow={allow}
        setAllow={setAllow}
        comment={comment}
        setComment={setComment}
        errors={errors}
        clearError={(k) =>
          setErrors((e) => {
            const { [k]: _, ...rest } = e
            return rest
          })
        }
        access={access}
        locksYouOut={locksYouOut}
        onSubmit={submit}
      />
      {problem && (
        <p className="mt-4 text-body-sm break-words text-destructive">
          {problem}
        </p>
      )}
    </ResponsiveDialog>
  )
}

function AddressForm({
  port,
  setPort,
  protocol,
  setProtocol,
  publishers,
  mode,
  setMode,
  allow,
  setAllow,
  comment,
  setComment,
  errors,
  clearError,
  access,
  locksYouOut,
  onSubmit,
}: {
  port: string
  setPort: (v: string) => void
  protocol: Protocol
  setProtocol: (v: Protocol) => void
  publishers: string[]
  mode: "only" | "nobody"
  setMode: (v: "only" | "nobody") => void
  allow: string[]
  setAllow: (v: string[]) => void
  comment: string
  setComment: (v: string) => void
  errors: Record<string, string>
  clearError: (key: string) => void
  access: ContainerAccess
  locksYouOut: boolean
  onSubmit: (e: FormEvent, pending?: string[]) => void
}) {
  const [text, setText] = useState("")
  const [entryError, setEntryError] = useState<string>()

  // Splits what was typed or pasted; keeps what can't be read in the box.
  function take(raw: string) {
    const parts = raw.split(/[\s,;]+/).filter(Boolean)
    const good: string[] = []
    const bad: string[] = []
    for (const p of parts) {
      if (checkEntry(p)) bad.push(p)
      else if (!allow.includes(p) && !good.includes(p)) good.push(p)
    }
    if (good.length > 0) {
      setAllow([...allow, ...good])
      clearError("allow")
    }
    setText(bad.join(" "))
    setEntryError(bad.length > 0 ? checkEntry(bad[0]) : undefined)
    return { good, bad }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      if (text.trim()) take(text)
    } else if (e.key === "Backspace" && !text && allow.length > 0) {
      setAllow(allow.slice(0, -1))
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text")
    if (!/[\s,;]/.test(pasted.trim())) return
    e.preventDefault()
    take(`${text} ${pasted}`)
  }

  const add = (values: string[]) => {
    setAllow([...allow, ...values.filter((v) => !allow.includes(v))])
    clearError("allow")
  }
  const you = access.your_ip
  const morche = access.morcheh_ip
  const quick = [
    you &&
      !allow.includes(you) && { label: `Your address · ${you}`, values: [you] },
    morche &&
      morche !== you &&
      !allow.includes(morche) && {
        label: `Morche · ${morche}`,
        values: [morche],
      },
    PRIVATE_NETWORKS.some((n) => !allow.includes(n)) && {
      label: "Private networks",
      values: PRIVATE_NETWORKS,
    },
  ].filter(Boolean) as { label: string; values: string[] }[]

  return (
    <form
      id={FORM_ID}
      noValidate
      onSubmit={(e) => {
        // A typed address not yet turned into a tag counts too.
        if (mode === "only" && text.trim()) {
          const { good, bad } = take(text)
          if (bad.length > 0) {
            e.preventDefault()
            return
          }
          onSubmit(e, good)
          return
        }
        onSubmit(e)
      }}
      className="flex min-w-0 flex-col gap-4"
    >
      <Field
        label="Port on the server"
        error={errors.port}
        hint={
          errors.port
            ? undefined
            : publishers.length > 0
              ? `Published by ${publishers.join(", ")}`
              : parsePorts(port)
                ? "No running container publishes it now. The limit applies once one does."
                : "One port, or a range like 8000-8010"
        }
      >
        {(p) => (
          <div className="flex items-center gap-2">
            <Input
              {...p}
              {...plainInput}
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="3030"
              inputMode="numeric"
              autoComplete="off"
            />
            <Segmented
              label="Protocol"
              items={[
                { value: "tcp", label: "TCP" },
                { value: "udp", label: "UDP" },
              ]}
              value={protocol}
              onChange={setProtocol}
            />
          </div>
        )}
      </Field>

      {isWebPort(port) && (
        <Callout>
          Visitors reach websites on this port. Limit it only for a site that
          isn't public.
        </Callout>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-body-sm font-medium">Who can reach it</span>
        <div className="flex">
          <Segmented
            label="Who can reach it"
            items={[
              { value: "only", label: "Only these addresses" },
              { value: "nobody", label: "Nobody from outside" },
            ]}
            value={mode}
            onChange={setMode}
          />
        </div>
        {mode === "nobody" && (
          <p className="text-caption text-muted-foreground">
            Only this server and its containers can connect. Other machines
            can't, not even on the local network.
          </p>
        )}
      </div>

      {mode === "only" && (
        <Field
          label="Addresses let in"
          error={errors.allow ?? entryError}
          hint={
            errors.allow || entryError
              ? undefined
              : "Press Enter after each one, or paste a list. A network like 203.0.113.0/24 lets in all of it."
          }
        >
          {(p) => (
            <div className="flex flex-col gap-2">
              {/* biome-ignore lint/a11y/noStaticElementInteractions: a click on the frame focuses its input */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: the input inside takes the keys */}
              <div
                className={cn(
                  "flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 md:min-h-9",
                  (errors.allow || entryError) && "border-destructive",
                )}
                onClick={(e) =>
                  (
                    e.currentTarget.querySelector("input") as HTMLInputElement
                  )?.focus()
                }
              >
                {allow.map((a) => (
                  <span
                    key={a}
                    title={rangeSize(a)}
                    className="inline-flex h-7 items-center gap-1 rounded-full bg-muted ps-2.5 pe-1 font-mono text-caption"
                  >
                    {a}
                    {a === access.your_ip && (
                      <span className="font-sans text-ash">you</span>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${a}`}
                      className="grid size-5 place-items-center rounded-full text-ash outline-none hover:bg-mist hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 max-md:size-7"
                      onClick={() => setAllow(allow.filter((x) => x !== a))}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  {...p}
                  {...plainInput}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value)
                    setEntryError(undefined)
                  }}
                  onKeyDown={onKey}
                  onPaste={onPaste}
                  onBlur={() => text.trim() && take(text)}
                  placeholder={
                    allow.length === 0 ? "203.0.113.7" : "Add another"
                  }
                  inputMode="url"
                  autoComplete="off"
                  className="h-7 min-w-32 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-ash md:text-body-sm"
                />
              </div>
              {quick.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {quick.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => add(q.values)}
                      className="inline-flex h-10 items-center gap-1 rounded-full border border-border px-3 text-caption text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:h-7"
                    >
                      <Plus className="size-3" />
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Field>
      )}

      {locksYouOut && (
        <Callout>
          You ({access.your_ip}) won't reach it from this browser. Add your
          address if you need to.
        </Callout>
      )}

      <Field label="Note" error={errors.comment} hint="Optional: who these are">
        {(p) => (
          <Input
            {...p}
            value={comment}
            maxLength={120}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Office and VPN"
          />
        )}
      </Field>
    </form>
  )
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg bg-warning/5 p-3 text-body-sm text-muted-foreground">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
      <p>{children}</p>
    </div>
  )
}
