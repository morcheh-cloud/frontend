"use client"

import { CircleAlert, CircleCheck, FileUp, Search, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { createContext, type ReactNode, use, useRef, useState } from "react"
import { toast } from "sonner"

import { Field } from "@/components/field"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useIntent } from "@/hooks/useIntent"
import { useOpen } from "@/hooks/useOpen"
import type { Asset, AssetBulkBody } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useAddRelation,
  useAssetPeople,
  useAssets,
  useBulkAssets,
  useDeleteAsset,
  useImportAssets,
  useReviewAsset,
} from "../api"
import {
  type ImportRow,
  importColumns,
  importExample,
  kindName,
  parseCsv,
  rowsToBodies,
} from "./csv"
import {
  AssetIcon,
  criticalities,
  environments,
  kindOf,
  lifecycles,
  newAssetHref,
  relationKinds,
} from "./meta"
import { Choose, PersonPicker, splitOwner } from "./parts"

type Actions = {
  remove: (a: Asset, onDone?: () => void) => void
  bulk: (ids: string[], onDone?: () => void) => void
  importer: () => void
  relate: (a: Asset) => void
  review: (a: Asset) => void
}

const Ctx = createContext<Actions | null>(null)

export function useAssetActions() {
  const ctx = use(Ctx)
  if (!ctx) throw new Error("useAssetActions outside AssetActionsProvider")
  return ctx
}

export function AssetActionsProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const del = useDeleteAsset()
  const reviewAsset = useReviewAsset()
  const [removing, setRemoving] = useState<{ a: Asset; done?: () => void }>()
  const [removeOpen, setRemoveOpen] = useOpen("asset-remove")
  const [bulkIds, setBulkIds] = useState<{ ids: string[]; done?: () => void }>()
  const [bulkOpen, setBulkOpen] = useOpen("asset-bulk")
  const [importOpen, setImportOpen] = useOpen("asset-import")
  const [relating, setRelating] = useState<Asset>()
  const [relateOpen, setRelateOpen] = useOpen("asset-relate")
  const [nonce, setNonce] = useState(0)

  useIntent("add-asset", () => router.push(newAssetHref()))

  const actions: Actions = {
    remove: (a, done) => {
      setRemoving({ a, done })
      setRemoveOpen(true)
    },
    bulk: (ids, done) => {
      setBulkIds({ ids, done })
      setNonce((n) => n + 1)
      setBulkOpen(true)
    },
    importer: () => {
      setNonce((n) => n + 1)
      setImportOpen(true)
    },
    relate: (a) => {
      setRelating(a)
      setNonce((n) => n + 1)
      setRelateOpen(true)
    },
    review: (a) =>
      reviewAsset.mutate(a.id, {
        onSuccess: () => toast.success(`${a.name} confirmed`),
        onError: (e) => toast.error(e.message),
      }),
  }

  return (
    <Ctx value={actions}>
      {children}
      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={`Delete ${removing?.a.name ?? "asset"}?`}
        description={
          removing?.a.source_kind
            ? "Morche no longer manages it. Its history goes too; to keep the record, mark it retired instead."
            : "Its details, relations and history are deleted. To keep the record, mark it retired instead."
        }
        confirmLabel="Delete"
        destructive
        pending={del.isPending}
        onConfirm={() => {
          if (!removing) return
          del.mutate(removing.a.id, {
            onSuccess: () => {
              toast.success(`${removing.a.name} deleted`)
              setRemoveOpen(false)
              removing.done?.()
            },
            onError: (e) => toast.error(e.message),
          })
        }}
      />
      <BulkDialog
        key={`bulk-${nonce}`}
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        ids={bulkIds?.ids ?? []}
        onDone={() => bulkIds?.done?.()}
      />
      <ImportDialog
        key={`import-${nonce}`}
        open={importOpen}
        onOpenChange={setImportOpen}
      />
      {relating && (
        <RelateDialog
          key={`relate-${nonce}`}
          open={relateOpen}
          onOpenChange={setRelateOpen}
          asset={relating}
        />
      )}
    </Ctx>
  )
}

// ---- Bulk change ----

const KEEP = "__keep"

function BulkDialog({
  open,
  onOpenChange,
  ids,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ids: string[]
  onDone: () => void
}) {
  const bulk = useBulkAssets()
  const [owner, setOwner] = useState(KEEP)
  const [deputy, setDeputy] = useState(KEEP)
  const [env, setEnv] = useState(KEEP)
  const [crit, setCrit] = useState(KEEP)
  const [life, setLife] = useState(KEEP)
  const [review, setReview] = useState(KEEP)
  const [addTags, setAddTags] = useState("")
  const [removeTags, setRemoveTags] = useState("")
  const tags = (s: string) =>
    s
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean)

  const keep = { value: KEEP, label: "Keep as is" }
  const changed =
    owner !== KEEP ||
    deputy !== KEEP ||
    env !== KEEP ||
    crit !== KEEP ||
    life !== KEEP ||
    review !== KEEP ||
    !!addTags.trim() ||
    !!removeTags.trim()

  const submit = () => {
    const body: AssetBulkBody = { ids }
    if (owner !== KEEP) {
      const o = splitOwner(owner)
      body.owner_user_id = o.user
      body.owner_group_id = o.group
    }
    if (deputy !== KEEP) body.deputy_user_id = splitOwner(deputy).user
    if (env !== KEEP) body.environment = env as AssetBulkBody["environment"]
    if (crit !== KEEP) body.criticality = Number(crit)
    if (life !== KEEP) body.lifecycle = life as AssetBulkBody["lifecycle"]
    if (review !== KEEP) body.review_days = Number(review)
    if (addTags.trim()) body.add_tags = tags(addTags)
    if (removeTags.trim()) body.remove_tags = tags(removeTags)
    bulk.mutate(body, {
      onSuccess: (r) => {
        toast.success(
          `${r.changed} ${r.changed === 1 ? "asset" : "assets"} changed`,
        )
        onOpenChange(false)
        onDone()
      },
      onError: (e) => toast.error(e.message),
    })
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Change ${ids.length} ${ids.length === 1 ? "asset" : "assets"}`}
      description="Only what you pick changes; the rest stays as it is on each asset."
      className="sm:max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!changed || bulk.isPending} onClick={submit}>
            {bulk.isPending ? "Saving…" : "Apply"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Owner" className="sm:col-span-2">
          {(p) => (
            <OwnerOrKeep id={p.id} value={owner} onChange={setOwner} groups />
          )}
        </Field>
        <Field label="Deputy">
          {(p) => <OwnerOrKeep id={p.id} value={deputy} onChange={setDeputy} />}
        </Field>
        <Field label="Environment">
          {(p) => (
            <Choose
              id={p.id}
              value={env}
              onChange={setEnv}
              allowNone={false}
              options={[keep, { value: "", label: "Not set" }, ...environments]}
            />
          )}
        </Field>
        <Field label="Criticality">
          {(p) => (
            <Choose
              id={p.id}
              value={crit}
              onChange={setCrit}
              allowNone={false}
              options={[
                keep,
                { value: "0", label: "Not set" },
                ...criticalities.map((c) => ({
                  value: String(c.value),
                  label: c.label,
                })),
              ]}
            />
          )}
        </Field>
        <Field label="Lifecycle">
          {(p) => (
            <Choose
              id={p.id}
              value={life}
              onChange={setLife}
              allowNone={false}
              options={[keep, ...lifecycles]}
            />
          )}
        </Field>
        <Field label="Review" className="sm:col-span-2">
          {(p) => (
            <Choose
              id={p.id}
              value={review}
              onChange={setReview}
              allowNone={false}
              options={[
                keep,
                { value: "0", label: "Never ask" },
                { value: "30", label: "Every month" },
                { value: "90", label: "Every 3 months" },
                { value: "180", label: "Every 6 months" },
                { value: "365", label: "Every year" },
              ]}
            />
          )}
        </Field>
        <Field label="Add tags" hint="Comma-separated">
          {(p) => (
            <Input
              {...p}
              value={addTags}
              onChange={(e) => setAddTags(e.target.value)}
            />
          )}
        </Field>
        <Field label="Remove tags" hint="Comma-separated">
          {(p) => (
            <Input
              {...p}
              value={removeTags}
              onChange={(e) => setRemoveTags(e.target.value)}
            />
          )}
        </Field>
      </div>
    </ResponsiveDialog>
  )
}

function OwnerOrKeep({
  id,
  value,
  onChange,
  groups,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  groups?: boolean
}) {
  if (value === KEEP) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex h-11 flex-1 items-center rounded-lg border border-input bg-subtle px-3 text-body-sm text-muted-foreground md:h-10">
          Keep as is
        </span>
        <Button id={id} variant="outline" onClick={() => onChange("")}>
          Change
        </Button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <PersonPicker
          id={id}
          value={value}
          onChange={onChange}
          groups={groups}
          placeholder="Nobody (clear it)"
        />
      </div>
      <Button variant="ghost" onClick={() => onChange(KEEP)}>
        Keep
      </Button>
    </div>
  )
}

// ---- Import ----

function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const people = useAssetPeople()
  const run = useImportAssets()
  const file = useRef<HTMLInputElement>(null)
  const [text, setText] = useState("")
  const [skipBad, setSkipBad] = useState(true)
  const [result, setResult] = useState<{
    created: number
    errors: { row: number; message: string }[]
  }>()

  const rows: ImportRow[] = text.trim()
    ? rowsToBodies(
        parseCsv(text),
        people.data?.users ?? [],
        people.data?.groups ?? [],
      )
    : []
  const bad = rows.filter((r) => r.problems.length > 0)
  const sending = skipBad ? rows.filter((r) => r.problems.length === 0) : rows

  const pick = (f: File | undefined) => {
    if (!f) return
    f.text().then(setText)
  }

  const submit = () => {
    run.mutate(
      sending.map((r) => r.body),
      {
        onSuccess: (r) => {
          setResult(r)
          if (r.errors.length === 0) {
            toast.success(
              `${r.created} ${r.created === 1 ? "asset" : "assets"} added`,
            )
            onOpenChange(false)
          }
        },
        onError: (e) => toast.error(e.message),
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Import assets"
      description="From a spreadsheet: save it as CSV, then drop or paste it here. The first row names the columns."
      className="sm:max-w-3xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          {rows.length > 0 && (
            <span className="me-auto text-caption text-muted-foreground">
              {sending.length} of {rows.length} rows will be added
            </span>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {result ? "Close" : "Cancel"}
          </Button>
          <Button
            disabled={sending.length === 0 || run.isPending || !!result}
            onClick={submit}
          >
            <Upload />
            {run.isPending ? "Adding…" : `Add ${sending.length || ""}`.trim()}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => file.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            pick(e.dataTransfer.files[0])
          }}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-mist p-4 text-start text-body-sm hover:bg-subtle"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
            <FileUp className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-medium">Choose a CSV file</span>
            <span className="block text-caption text-muted-foreground">
              or drop it here, or paste the rows below
            </span>
          </span>
          <input
            ref={file}
            type="file"
            accept=".csv,.tsv,.txt,text/csv"
            hidden
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </button>
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setResult(undefined)
          }}
          placeholder={importExample}
          rows={6}
          className="font-mono text-caption"
          aria-label="CSV rows"
        />
        <p className="text-caption text-muted-foreground">
          Columns it understands: {importColumns}. Owner = a username, a
          person's name or a group name. Dates as 2027-03-31. Tags separated by
          “;”. Things Morche manages (servers, databases…) appear by themselves:
          don't import them.
        </p>
        {rows.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border [contain:inline-size]">
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-body-sm">
                <thead className="sticky top-0 bg-subtle text-start text-caption text-ash">
                  <tr>
                    <th className="px-3 py-2 text-start font-normal">Row</th>
                    <th className="px-3 py-2 text-start font-normal">Name</th>
                    <th className="px-3 py-2 text-start font-normal">Kind</th>
                    <th className="px-3 py-2 text-start font-normal">Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.slice(0, 200).map((r) => {
                    const err = result?.errors.find(
                      (e) => sending[e.row]?.line === r.line,
                    )
                    return (
                      <tr key={r.line}>
                        <td className="px-3 py-2 text-ash tabular-nums">
                          {r.line}
                        </td>
                        <td className="max-w-60 truncate px-3 py-2">
                          {r.body.name || "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {kindName(r.body.kind)}
                        </td>
                        <td className="px-3 py-2">
                          {r.problems.length > 0 || err ? (
                            <span className="inline-flex items-center gap-1.5 text-destructive">
                              <CircleAlert className="size-3.5 shrink-0" />
                              {err?.message ?? r.problems.join(" · ")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-success">
                              <CircleCheck className="size-3.5" />
                              {result ? "Added" : "Looks good"}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {bad.length > 0 && (
          <label className="flex items-center gap-2 text-body-sm">
            <input
              type="checkbox"
              checked={skipBad}
              onChange={(e) => setSkipBad(e.target.checked)}
              className="size-4 accent-[var(--color-brand)]"
            />
            Leave out the {bad.length} {bad.length === 1 ? "row" : "rows"} with
            problems
          </label>
        )}
        {result && result.errors.length > 0 && (
          <p className="text-body-sm text-destructive">
            {result.created} added, {result.errors.length} refused: see the rows
            above.
          </p>
        )}
      </div>
    </ResponsiveDialog>
  )
}

// ---- Relate ----

function RelateDialog({
  open,
  onOpenChange,
  asset,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset: Asset
}) {
  const assets = useAssets(asset.workspace_id)
  const add = useAddRelation()
  const [kind, setKind] = useState("depends_on")
  const [to, setTo] = useState("")
  const [q, setQ] = useState("")
  const [note, setNote] = useState("")
  const list = (assets.data ?? [])
    .filter((a) => a.id !== asset.id)
    .filter(
      (a) =>
        !q ||
        `${a.name} ${kindOf(a.kind).label}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .slice(0, 100)
  const target = assets.data?.find((a) => a.id === to)

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a relation"
      description={`How ${asset.name} depends on, uses or sits on another asset. Impact on the map and the asset page follows these.`}
      className="sm:max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!to || add.isPending}
            onClick={() =>
              add.mutate(
                { from: asset.id, to, kind, note },
                {
                  onSuccess: () => {
                    toast.success("Relation added")
                    onOpenChange(false)
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            Add relation
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={`${asset.name}…`}>
          {(p) => (
            <Choose
              id={p.id}
              value={kind}
              onChange={setKind}
              allowNone={false}
              options={relationKinds.map((r) => ({
                value: r.value,
                label: r.label,
              }))}
            />
          )}
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-medium">
            {target ? `…${target.name}` : "…which asset?"}
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ash" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search assets"
              className="ps-9"
              aria-label="Search assets"
            />
          </div>
          <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {list.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setTo(a.id)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 px-3 py-2 text-start hover:bg-subtle",
                    to === a.id && "bg-brand-soft",
                  )}
                >
                  <AssetIcon asset={a} className="size-7" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm font-medium">
                      {a.name}
                    </span>
                    <span className="block truncate text-caption text-muted-foreground">
                      {kindOf(a.kind).label}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {list.length === 0 && (
              <li className="px-3 py-6 text-center text-body-sm text-muted-foreground">
                No asset matches.
              </li>
            )}
          </ul>
        </div>
        <Field label="Note" hint="Optional: why, which port, which account…">
          {(p) => (
            <Input
              {...p}
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Field>
      </div>
    </ResponsiveDialog>
  )
}
