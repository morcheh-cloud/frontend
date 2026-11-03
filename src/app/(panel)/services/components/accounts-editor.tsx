"use client"

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"

import { Field } from "@/components/field"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AppAccount, AppAccountInput } from "@/lib/services"
import { revealPassword } from "../api"

export type AccountDraft = {
  key: string
  id?: string
  label: string
  username: string
  password: string
  hasPassword: boolean
  removePassword: boolean
}

let next = 0
const newKey = () => `new-${++next}`

export const accountDrafts = (accounts: AppAccount[]): AccountDraft[] =>
  accounts.map((a) => ({
    key: a.id,
    id: a.id,
    label: a.label,
    username: a.username,
    password: "",
    hasPassword: a.has_password,
    removePassword: false,
  }))

// The whole list, in order. A blank password keeps the saved one.
export const accountsBody = (drafts: AccountDraft[]): AppAccountInput[] =>
  drafts.map((d) => ({
    id: d.id,
    label: d.label.trim(),
    username: d.username.trim(),
    password: d.password || undefined,
    remove_password: !d.password && d.removePassword ? true : undefined,
  }))

// Logins for one service. The first is the one Copy uses by default.
export function AccountsEditor({
  appId,
  value,
  onChange,
  errors,
}: {
  appId?: string
  value: AccountDraft[]
  onChange: (next: AccountDraft[]) => void
  errors: Record<string, string>
}) {
  const set = (i: number, patch: Partial<AccountDraft>) =>
    onChange(value.map((d, j) => (j === i ? { ...d, ...patch } : d)))
  const move = (i: number, by: -1 | 1) => {
    const out = [...value]
    const [d] = out.splice(i, 1)
    out.splice(i + by, 0, d)
    onChange(out)
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1.5 text-body-sm font-medium">Accounts</legend>
      {value.length === 0 && (
        <p className="text-caption text-muted-foreground">
          No logins saved. Add one so your team can copy it from here.
        </p>
      )}
      <ol className="flex flex-col gap-3">
        {value.map((d, i) => {
          const err = (f: string) => errors[`accounts[${i}].${f}`]
          const saved = d.hasPassword && !!d.id && !!appId
          const name = d.label || d.username || `Account ${i + 1}`
          return (
            <li
              key={d.key}
              className="flex flex-col gap-3 rounded-2xl border border-border p-4"
            >
              <div className="flex items-center gap-2">
                <span className="truncate text-body-sm font-medium">
                  {name}
                </span>
                {i === 0 && (
                  <span className="rounded-full bg-brand-soft px-2 text-caption text-brand-strong">
                    Default
                  </span>
                )}
                <span className="ms-auto flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${name} up`}
                    title="Move up"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${name} down`}
                    title="Move down"
                    disabled={i === value.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${name}`}
                    title="Remove account"
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                  >
                    <Trash2 />
                  </Button>
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Label" error={err("label")}>
                  {(p) => (
                    <Input
                      {...p}
                      value={d.label}
                      placeholder="Admin"
                      onChange={(e) => set(i, { label: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Username" error={err("username")}>
                  {(p) => (
                    <Input
                      {...p}
                      value={d.username}
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(e) => set(i, { username: e.target.value })}
                    />
                  )}
                </Field>
              </div>
              <Field
                label="Password"
                error={err("password")}
                hint={
                  d.removePassword ? (
                    <>
                      The saved password will be removed.{" "}
                      <button
                        type="button"
                        className="text-brand-strong underline-offset-2 hover:underline"
                        onClick={() => set(i, { removePassword: false })}
                      >
                        Keep it
                      </button>
                    </>
                  ) : saved && !d.password ? (
                    <>
                      Leave blank to keep the saved one.{" "}
                      <button
                        type="button"
                        className="text-brand-strong underline-offset-2 hover:underline"
                        onClick={() => set(i, { removePassword: true })}
                      >
                        Remove it
                      </button>
                    </>
                  ) : undefined
                }
              >
                {(p) => (
                  <SecretInput
                    {...p}
                    value={d.password}
                    autoComplete="new-password"
                    placeholder={saved && !d.removePassword ? "••••••••" : ""}
                    load={
                      saved && appId && d.id && !d.removePassword
                        ? () => revealPassword(appId, d.id as string)
                        : undefined
                    }
                    onChange={(e) =>
                      set(i, {
                        password: e.target.value,
                        removePassword: false,
                      })
                    }
                  />
                )}
              </Field>
            </li>
          )
        })}
      </ol>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() =>
          onChange([
            ...value,
            {
              key: newKey(),
              label: "",
              username: "",
              password: "",
              hasPassword: false,
              removePassword: false,
            },
          ])
        }
      >
        <Plus />
        Add account
      </Button>
    </fieldset>
  )
}
