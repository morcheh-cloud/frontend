"use client"

import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field } from "../../../components/fields"
import { useServerPage } from "../../components/server-page"
import { useBan } from "../api"
import { useF2bActions } from "./fail2ban-actions"
import { duration, effective, IP_RE } from "./meta"

export type BanPrefill = { ip?: string; jail?: string }

const FORM_ID = "f2b-ban-form"

// Ban an address by hand, in one running jail (its ban time applies).
export function BanDialog({
  open,
  onOpenChange,
  prefill,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefill: BanPrefill
}) {
  const { server, phone } = useServerPage()
  const a = useF2bActions()
  const o = a.overview
  const ban = useBan(server.id)
  const active = o.jails.filter((j) => j.active)
  const [ip, setIp] = useState(prefill.ip ?? "")
  const [jail, setJail] = useState(
    prefill.jail ??
      active.find((j) => j.name === "sshd")?.name ??
      active[0]?.name ??
      "",
  )
  const [error, setError] = useState<string>()
  const picked = active.find((j) => j.name === jail)

  function submit(e: FormEvent) {
    e.preventDefault()
    const v = ip.trim()
    if (!IP_RE.test(v)) {
      setError("An IPv4 or IPv6 address, or a network like 192.0.2.0/24")
      return
    }
    setError(undefined)
    ban.mutate(
      { ip: v, jail },
      {
        onSuccess: () => {
          toast.success(`${v} banned in ${jail}`)
          onOpenChange(false)
        },
        onError: (err) => setError(err.message),
      },
    )
  }

  const items = active.map((j) => ({ value: j.name, label: j.name }))

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ban an address"
      description="Blocked right away, for the jail's ban time. Addresses in Never ban can't be banned."
      footer={
        <div className="flex w-full gap-2 max-md:flex-col md:justify-end">
          <Button
            type="submit"
            form={FORM_ID}
            size={phone ? "lg" : "default"}
            disabled={ban.isPending || !jail}
          >
            Ban
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
      <form
        id={FORM_ID}
        onSubmit={submit}
        noValidate
        className="flex flex-col gap-4"
      >
        <Field label="Address" error={error}>
          {(p) => (
            <Input
              {...p}
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="192.0.2.1"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="go"
              className="font-mono"
            />
          )}
        </Field>
        <Field
          label="Jail"
          hint={
            picked
              ? `Banned for ${duration(effective(o, picked, "bantime")).toLowerCase()}`
              : "No jail is running: start fail2ban first."
          }
        >
          {(p) =>
            phone ? (
              <select
                {...p}
                value={jail}
                onChange={(e) => setJail(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {items.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </select>
            ) : (
              <Select
                items={items}
                value={jail}
                onValueChange={(v) => v !== null && setJail(v)}
              >
                <SelectTrigger id={p.id} className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {items.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }
        </Field>
      </form>
    </ResponsiveDialog>
  )
}
