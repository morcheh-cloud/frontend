"use client"

import {
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
  UserRound,
  Users,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import type { Asset, AssetOwnerRule } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAssets, useOwnerRules, useSaveOwnerRules } from "../api"
import {
  assetsHref,
  environments,
  issuesOf,
  kindOf,
  linkedKinds,
  manualKinds,
  ruleMatches,
} from "./meta"
import { Avatar, joinOwner, PersonPicker, splitOwner } from "./parts"
import { useAssetsCan } from "./permissions"
import { AssetsShell } from "./shell"

export function OwnersView() {
  const phone = useIsPhone()
  const assets = useAssets()
  const rules = useOwnerRules()
  if (phone === null) return null
  return (
    <AssetsShell phone={phone} title="Owners" section="owners">
      {assets.isPending || rules.isPending ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <div
          className={cn(
            "grid gap-6",
            phone && "px-4",
            !phone && "2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]",
          )}
        >
          <People items={assets.data ?? []} />
          <Rules
            key={JSON.stringify(rules.data)}
            saved={rules.data ?? []}
            items={assets.data ?? []}
          />
        </div>
      )}
    </AssetsShell>
  )
}

// ---- Who owns what ----

function People({ items }: { items: Asset[] }) {
  const live = items.filter((a) => a.lifecycle !== "retired")
  const map = new Map<
    string,
    {
      name: string
      group: boolean
      left: boolean
      list: Asset[]
      filter: string
    }
  >()
  for (const a of live) {
    const o = a.owner
    if (o.from === "none") continue
    const key = o.user_id ? `u:${o.user_id}` : `g:${o.group_id}`
    const e = map.get(key) ?? {
      name: o.user_name || o.group_name || "Someone",
      group: !o.user_id,
      left: o.user_status === "blocked",
      list: [],
      filter: key,
    }
    e.list.push(a)
    map.set(key, e)
  }
  const owners = [...map.values()].sort((a, b) => b.list.length - a.list.length)
  const none = live.filter((a) => a.owner.from === "none").length
  const max = Math.max(1, ...owners.map((o) => o.list.length))
  return (
    <section className="min-w-0">
      <h2 className="text-body font-medium">Who owns what</h2>
      <p className="text-caption text-muted-foreground">
        Assets in use, by owner (set on the asset or given by a rule).
      </p>
      <ul className="mt-3 grid gap-2">
        {none > 0 && (
          <li>
            <Link
              href={assetsHref("/assets", { owner: "none" })}
              className="flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/5 px-4 py-3 hover:bg-warning/10"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-warning/15 text-warning">
                <UserRound className="size-4" />
              </span>
              <span className="min-w-0 flex-1 text-body-sm font-medium">
                Nobody
              </span>
              <span className="text-subheading font-light text-warning tabular-nums">
                {none}
              </span>
            </Link>
          </li>
        )}
        {owners.map((o) => {
          const issues = o.list.filter((a) => issuesOf(a).length > 0).length
          return (
            <li key={o.filter}>
              <Link
                href={assetsHref("/assets", { owner: o.filter })}
                className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 hover:bg-subtle"
              >
                <Avatar name={o.name} group={o.group} className="size-9" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-body-sm font-medium">
                    <span className="truncate">{o.name}</span>
                    {o.left && (
                      <span className="rounded-full bg-destructive/10 px-1.5 text-[11px] text-destructive">
                        Left
                      </span>
                    )}
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${(o.list.length / max) * 100}%` }}
                    />
                  </span>
                  {issues > 0 && (
                    <span className="mt-1 block text-caption text-warning">
                      {issues} need a look
                    </span>
                  )}
                </span>
                <span className="text-subheading font-light tabular-nums">
                  {o.list.length}
                </span>
              </Link>
            </li>
          )
        })}
        {owners.length === 0 && none === 0 && (
          <li>
            <Empty
              icon={Users}
              title="No assets yet"
              body="Owners show here once the inventory has assets."
            />
          </li>
        )}
      </ul>
    </section>
  )
}

// ---- Owner rules ----

type Row = AssetOwnerRule & { key: string; owner: string; deputy: string }
let n = 0
const rowOf = (r: AssetOwnerRule): Row => ({
  ...r,
  key: `r${++n}`,
  owner: joinOwner(r.owner_user_id, r.owner_group_id),
  deputy: r.deputy_user_id ? `u:${r.deputy_user_id}` : "",
})
const blank = (): Row =>
  rowOf({ name: "", kinds: [], tags: [], environments: [], name_pattern: "" })

const serial = (rows: Row[]) =>
  JSON.stringify(
    rows.map(({ key, owner_name, group_name, deputy_name, ...r }) => r),
  )

function Rules({ saved, items }: { saved: AssetOwnerRule[]; items: Asset[] }) {
  const can = useAssetsCan()
  const save = useSaveOwnerRules()
  const [rows, setRows] = useState<Row[]>(() => saved.map(rowOf))
  const [initial] = useState(() => serial(saved.map(rowOf)))
  const dirty = serial(rows) !== initial
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const set = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const move = (i: number, d: number) =>
    setRows((rs) => {
      const next = [...rs]
      const [x] = next.splice(i, 1)
      next.splice(i + d, 0, x)
      return next
    })

  // Which unowned assets each rule takes, first match wins.
  const unowned = items.filter(
    (a) => !a.owner_user_id && !a.owner_group_id && a.lifecycle !== "retired",
  )
  const taken = new Map<string, number>()
  const left = unowned.filter((a) => {
    const r = rows.find((x) => x.owner && ruleMatches(x, a))
    if (r) taken.set(r.key, (taken.get(r.key) ?? 0) + 1)
    return !r
  }).length

  const submit = () => {
    const body: AssetOwnerRule[] = rows.map((r) => {
      const o = splitOwner(r.owner)
      return {
        name: r.name,
        kinds: r.kinds,
        tags: r.tags,
        environments: r.environments,
        name_pattern: r.name_pattern,
        owner_user_id: o.user || undefined,
        owner_group_id: o.group || undefined,
        deputy_user_id: splitOwner(r.deputy).user || undefined,
      }
    })
    const missing = rows.findIndex((r) => !r.owner)
    if (missing >= 0) {
      setErrors({ [rows[missing].key]: "Pick an owner" })
      toast.error("Every rule needs an owner")
      return
    }
    save.mutate(body, {
      onSuccess: () => toast.success("Owner rules saved"),
      onError: (e) => toast.error(e.message),
    })
  }

  const allKinds = [...linkedKinds, ...manualKinds]

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-body font-medium">Owner rules</h2>
          <p className="text-caption text-muted-foreground">
            An asset with no owner of its own takes the first rule that matches.{" "}
            {unowned.length} assets have no owner set;{" "}
            {left === 0
              ? "the rules cover them all."
              : `${left} still end up with nobody.`}
          </p>
        </div>
        {can.own && (
          <Button
            variant="outline"
            className="h-9"
            onClick={() => setRows((r) => [...r, blank()])}
          >
            <Plus />
            Add a rule
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <Empty
          className="mt-3"
          icon={Users}
          title="No rules yet"
          body="Rules spare you setting owners one by one: e.g. every database goes to the DBA group, everything tagged payments to the payments team."
          action={
            can.own && (
              <Button onClick={() => setRows([blank()])}>
                Add the first rule
              </Button>
            )
          }
        />
      ) : (
        <ol className="mt-3 grid gap-3">
          {rows.map((r, i) => (
            <li key={r.key} className="rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-caption tabular-nums">
                  {i + 1}
                </span>
                <Input
                  aria-label="Rule name"
                  placeholder="Name (optional), e.g. Databases to DBAs"
                  value={r.name}
                  maxLength={100}
                  disabled={!can.own}
                  onChange={(e) => set(r.key, { name: e.target.value })}
                  className="h-9 min-w-0 flex-1"
                />
                <span className="hidden text-caption whitespace-nowrap text-ash sm:inline">
                  takes {taken.get(r.key) ?? 0}
                </span>
                {can.own && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Move up"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Move down"
                      disabled={i === rows.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove rule"
                      onClick={() =>
                        setRows((rs) => rs.filter((x) => x.key !== r.key))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </>
                )}
              </div>
              <fieldset
                disabled={!can.own}
                className="mt-3 grid gap-3 lg:grid-cols-2"
              >
                <div className="lg:col-span-2">
                  <span className="text-caption text-ash">
                    Kinds (none = any)
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {allKinds.map((k) => {
                      const on = r.kinds.includes(k)
                      return (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            set(r.key, {
                              kinds: on
                                ? r.kinds.filter((x) => x !== k)
                                : [...r.kinds, k],
                            })
                          }
                          className="h-7 rounded-full border border-border px-2.5 text-caption hover:bg-subtle aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong"
                        >
                          {kindOf(k).plural}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <Field
                  label="Tags (any of)"
                  hint="Comma-separated; a server's own tags count"
                >
                  {(p) => (
                    <Input
                      {...p}
                      value={r.tags.join(", ")}
                      onChange={(e) =>
                        set(r.key, {
                          tags: e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  )}
                </Field>
                <Field label="Name contains" hint="* and ? work, e.g. db-*">
                  {(p) => (
                    <Input
                      {...p}
                      value={r.name_pattern}
                      onChange={(e) =>
                        set(r.key, { name_pattern: e.target.value })
                      }
                    />
                  )}
                </Field>
                <div className="lg:col-span-2">
                  <span className="text-caption text-ash">
                    Environments (none = any)
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {environments.map((e) => {
                      const on = r.environments.includes(e.value)
                      return (
                        <button
                          key={e.value}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            set(r.key, {
                              environments: on
                                ? r.environments.filter((x) => x !== e.value)
                                : [...r.environments, e.value],
                            })
                          }
                          className="h-7 rounded-full border border-border px-2.5 text-caption hover:bg-subtle aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong"
                        >
                          {e.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <Field label="Owner" error={errors[r.key]}>
                  {(p) => (
                    <PersonPicker
                      id={p.id}
                      value={r.owner}
                      onChange={(owner) => set(r.key, { owner })}
                      groups
                      placeholder="Pick a person or group"
                    />
                  )}
                </Field>
                <Field label="Deputy">
                  {(p) => (
                    <PersonPicker
                      id={p.id}
                      value={r.deputy}
                      onChange={(deputy) => set(r.key, { deputy })}
                    />
                  )}
                </Field>
              </fieldset>
            </li>
          ))}
        </ol>
      )}

      {can.own && (dirty || rows.length > 0) && (
        <div className="sticky bottom-4 z-10 mt-4 flex items-center justify-end gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-md">
          <span className="me-auto text-caption text-muted-foreground">
            {dirty ? "Unsaved changes" : "Saved"}
          </span>
          <Button
            variant="ghost"
            disabled={!dirty}
            onClick={() => setRows(saved.map(rowOf))}
          >
            Undo
          </Button>
          <Button disabled={!dirty || save.isPending} onClick={submit}>
            {save.isPending ? "Saving…" : "Save rules"}
          </Button>
        </div>
      )}
    </section>
  )
}
