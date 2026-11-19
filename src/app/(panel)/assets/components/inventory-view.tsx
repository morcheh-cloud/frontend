"use client"

import {
  ArrowDownUp,
  CircleAlert,
  Download,
  Ellipsis,
  LayoutGrid,
  ListFilter,
  NotebookPen,
  PackageSearch,
  Plus,
  Rows3,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useDeferredValue, useState } from "react"

import { Empty, SearchBox } from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { useStoredChoice } from "@/hooks/useStoredChoice"
import type { Asset } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAssetPeople, useAssets } from "../api"
import { useAssetActions } from "./asset-actions"
import { assetsCsv, downloadText } from "./csv"
import {
  AssetIcon,
  assetHref,
  criticalityLabel,
  dueDates,
  environments,
  envLabel,
  type IssueKey,
  issueMeta,
  issueOrder,
  issuesOf,
  kindGroups,
  kindOf,
  lifecycleLabel,
  lifecycles,
  manualKinds,
  newAssetHref,
  passes,
  StatusLabel,
  sorts,
  useAssetFilters,
} from "./meta"
import { CriticalityPips, IssuePills, NextDate, OwnerChip, Pill } from "./parts"
import { useAssetsCan } from "./permissions"
import { AssetsShell } from "./shell"

const sortLabels: Record<(typeof sorts)[number], string> = {
  name: "Name",
  kind: "Kind",
  owner: "Owner",
  due: "Next date",
  criticality: "Most critical",
  updated: "Recently changed",
}

function sortAssets(items: Asset[], sort: (typeof sorts)[number]) {
  const by = [...items]
  const name = (a: Asset, b: Asset) => a.name.localeCompare(b.name)
  switch (sort) {
    case "kind":
      return by.sort(
        (a, b) =>
          kindOf(a.kind).label.localeCompare(kindOf(b.kind).label) ||
          name(a, b),
      )
    case "owner":
      return by.sort(
        (a, b) =>
          (a.owner.user_name || a.owner.group_name || "~").localeCompare(
            b.owner.user_name || b.owner.group_name || "~",
          ) || name(a, b),
      )
    case "due":
      return by.sort(
        (a, b) =>
          (dueDates(a)[0]?.days ?? 1e6) - (dueDates(b)[0]?.days ?? 1e6) ||
          name(a, b),
      )
    case "criticality":
      return by.sort(
        (a, b) => (a.criticality || 9) - (b.criticality || 9) || name(a, b),
      )
    case "updated":
      return by.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }
  return by.sort(name)
}

export function InventoryView() {
  const phone = useIsPhone()
  if (phone === null) return null
  return <Inventory phone={phone} />
}

function Inventory({ phone }: { phone: boolean }) {
  const can = useAssetsCan()
  const a = useAssetActions()
  const query = useAssets()
  const [f, set] = useAssetFilters()
  const q = useDeferredValue(f.q)
  const [view, setView] = useStoredChoice("morche.assets.view", [
    "cards",
    "table",
  ] as const)
  const [selected, setSelected] = useState<string[]>([])
  const [addOpen, setAddOpen] = useOpen("asset-add-sheet")
  const [filterOpen, setFilterOpen] = useOpen("asset-filter-sheet")

  const all = query.data ?? []
  const shown = sortAssets(
    all.filter((x) => passes(x, { ...f, q }, can.me)),
    f.sort,
  )
  const filtered = !!(f.q || f.kind || f.owner || f.env || f.life || f.issue)

  const exportCsv = () =>
    downloadText(
      `assets-${new Date().toISOString().slice(0, 10)}.csv`,
      assetsCsv(shown),
    )

  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    )

  const addButton = can.edit && (
    <AddMenu phone={phone} onPhone={() => setAddOpen(true)} />
  )

  return (
    <AssetsShell
      phone={phone}
      title="Assets"
      actions={
        can.edit && (
          <Button
            size="icon-lg"
            aria-label="Add an asset"
            className="rounded-full"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-5" />
          </Button>
        )
      }
    >
      {/* Toolbar */}
      {phone ? (
        <div className="flex gap-2 px-4">
          <SearchBox
            value={f.q}
            onChange={(v) => set({ q: v || null })}
            placeholder="Search assets"
            label="Search assets"
            className="min-w-0 flex-1"
          />
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Filters"
            onClick={() => setFilterOpen(true)}
            className={cn(filtered && "border-brand text-brand")}
          >
            <SlidersHorizontal className="size-5" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox
            value={f.q}
            onChange={(v) => set({ q: v || null })}
            placeholder="Search name, serial, owner, tag…"
            label="Search assets"
          />
          <FilterMenus />
          {filtered && (
            <Button
              variant="ghost"
              className="h-9 text-muted-foreground"
              onClick={() =>
                set({
                  q: null,
                  kind: null,
                  owner: null,
                  env: null,
                  life: null,
                  issue: null,
                })
              }
            >
              <X />
              Clear
            </Button>
          )}
          <span className="text-caption text-ash">
            {shown.length === all.length
              ? `${all.length} assets`
              : `${shown.length} of ${all.length}`}
          </span>
          <div className="ms-auto flex items-center gap-2">
            <SortMenu />
            <div className="flex rounded-lg bg-muted p-0.5">
              {(
                [
                  ["cards", LayoutGrid, "Cards"],
                  ["table", Rows3, "Table"],
                ] as const
              ).map(([v, Icon, label]) => (
                <button
                  key={v}
                  type="button"
                  aria-label={label}
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm"
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="More"
                    className="size-9"
                  />
                }
              >
                <Ellipsis />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                {can.edit && (
                  <DropdownMenuItem onClick={() => a.importer()}>
                    <Upload />
                    Import from CSV…
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={exportCsv}>
                  <Download />
                  Export {filtered ? "these" : "all"} as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {addButton}
          </div>
        </div>
      )}

      <KindStrip items={all} phone={phone} />

      {query.isPending ? (
        <div
          className={cn(
            "grid gap-3",
            phone ? "px-4" : "grid-cols-[repeat(auto-fill,minmax(19rem,1fr))]",
          )}
        >
          {Array.from({ length: 6 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholders
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : query.isError ? (
        <Empty
          icon={PackageSearch}
          title="Couldn't load the inventory"
          body={query.error.message}
        />
      ) : all.length === 0 ? (
        <Empty
          icon={PackageSearch}
          title="Nothing in the inventory yet"
          body="Servers, databases, storages and the rest appear here by themselves once added to Morche. Add hardware, licences, domains and subscriptions by hand, or import them from a spreadsheet."
          action={addButton}
        />
      ) : shown.length === 0 ? (
        <Empty
          icon={ListFilter}
          title="No asset matches"
          body="Try fewer filters or another search."
          action={
            <Button
              variant="outline"
              onClick={() =>
                set({
                  q: null,
                  kind: null,
                  owner: null,
                  env: null,
                  life: null,
                  issue: null,
                })
              }
            >
              Clear filters
            </Button>
          }
        />
      ) : phone ? (
        <PhoneList items={shown} />
      ) : view === "table" ? (
        <AssetTable
          items={shown}
          selected={selected}
          toggle={toggle}
          setSelected={setSelected}
          edit={can.edit}
        />
      ) : (
        <AssetCards
          items={shown}
          selected={selected}
          toggle={toggle}
          edit={can.edit}
        />
      )}

      {selected.length > 0 && !phone && (
        <div className="sticky bottom-4 z-10 mx-auto flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-md">
          <span className="text-body-sm font-medium">
            {selected.length} selected
          </span>
          <Button
            size="sm"
            onClick={() => a.bulk(selected, () => setSelected([]))}
          >
            Change…
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadText(
                "assets-selected.csv",
                assetsCsv(all.filter((x) => selected.includes(x.id))),
              )
            }
          >
            Export
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear
          </Button>
        </div>
      )}

      <AddSheet open={addOpen} onOpenChange={setAddOpen} />
      {phone && (
        <FilterSheet
          open={filterOpen}
          onOpenChange={setFilterOpen}
          onExport={exportCsv}
        />
      )}
    </AssetsShell>
  )
}

// ---- Kind strip: the inventory at a glance, and a quick filter ----

function KindStrip({ items, phone }: { items: Asset[]; phone: boolean }) {
  const [f, set] = useAssetFilters()
  const groups = kindGroups
    .map((g) => {
      const mine = items.filter(
        (a) => g.kinds.includes(a.kind) && a.lifecycle !== "retired",
      )
      return {
        ...g,
        count: mine.length,
        issues: mine.filter((a) => issuesOf(a).length > 0).length,
      }
    })
    .filter((g) => g.count > 0 || g.key === "hardware" || g.key === "contracts")
  const total = items.filter((a) => a.lifecycle !== "retired").length
  const tile = (
    key: string,
    label: string,
    Icon: typeof PackageSearch,
    count: number,
    issues: number,
  ) => {
    const active = key === "" ? !f.kind : f.kind === key
    return (
      <button
        key={key || "all"}
        type="button"
        aria-pressed={active}
        onClick={() => set({ kind: active || key === "" ? null : key })}
        className={cn(
          "flex min-w-36 shrink-0 items-center gap-3 rounded-2xl border border-border px-3.5 py-3 text-start transition-colors hover:bg-subtle",
          active && "border-brand bg-brand-soft/60 hover:bg-brand-soft/60",
        )}
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground",
            active && "bg-brand text-primary-foreground",
          )}
        >
          <Icon className="size-[18px]" />
        </span>
        <span className="min-w-0">
          <span className="block text-subheading leading-none font-light tabular-nums">
            {count}
          </span>
          <span className="mt-1 flex items-center gap-1.5 truncate text-caption text-muted-foreground">
            {label}
            {issues > 0 && (
              <span
                className="inline-flex items-center gap-0.5 text-warning"
                title={`${issues} need a look`}
              >
                <CircleAlert className="size-3" />
                {issues}
              </span>
            )}
          </span>
        </span>
      </button>
    )
  }
  return (
    <div
      className={cn("no-scrollbar flex gap-2 overflow-x-auto", phone && "px-4")}
    >
      {tile(
        "",
        "All in use",
        PackageSearch,
        total,
        items.filter((a) => issuesOf(a).length > 0).length,
      )}
      {groups.map((g) =>
        tile(`g:${g.key}`, g.label, g.icon, g.count, g.issues),
      )}
    </div>
  )
}

// ---- Filters ----

function FilterMenus() {
  const [f, set] = useAssetFilters()
  const people = useAssetPeople()
  const chip = (label: string, value: string, active: boolean) => (
    <Button
      variant="outline"
      className={cn("h-9 gap-1.5", active && "border-brand text-brand")}
    >
      {label}
      {active && <span className="font-medium">: {value}</span>}
    </Button>
  )
  const ownerName = (() => {
    if (f.owner === "none") return "Nobody"
    if (f.owner === "me") return "Me"
    if (f.owner.startsWith("u:"))
      return (
        people.data?.users.find((u) => u.id === f.owner.slice(2))?.name ??
        "Someone"
      )
    if (f.owner.startsWith("g:"))
      return (
        people.data?.groups.find((g) => g.id === f.owner.slice(2))?.name ??
        "A group"
      )
    return ""
  })()
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={chip(
            "Kind",
            f.kind.startsWith("g:")
              ? (kindGroups.find((g) => `g:${g.key}` === f.kind)?.label ?? "")
              : kindOf(f.kind).label,
            !!f.kind,
          )}
        />
        <DropdownMenuContent className="max-h-96 min-w-56">
          <DropdownMenuRadioGroup
            value={f.kind}
            onValueChange={(v) => set({ kind: (v as string) || null })}
          >
            <DropdownMenuRadioItem value="">Every kind</DropdownMenuRadioItem>
            {kindGroups.map((g) => (
              <DropdownMenuGroup key={g.key}>
                <DropdownMenuSeparator />
                <DropdownMenuRadioItem value={`g:${g.key}`}>
                  <span className="font-medium">{g.label}</span>
                </DropdownMenuRadioItem>
                {g.kinds.length > 1 &&
                  g.kinds.map((k) => (
                    <DropdownMenuRadioItem key={k} value={k} className="ps-8">
                      {kindOf(k).plural}
                    </DropdownMenuRadioItem>
                  ))}
              </DropdownMenuGroup>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger render={chip("Owner", ownerName, !!f.owner)} />
        <DropdownMenuContent className="max-h-96 min-w-56">
          <DropdownMenuRadioGroup
            value={f.owner}
            onValueChange={(v) => set({ owner: (v as string) || null })}
          >
            <DropdownMenuRadioItem value="">Anyone</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="me">
              Mine (owner or deputy)
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="none">No owner</DropdownMenuRadioItem>
            {(people.data?.users.length ?? 0) > 0 && <DropdownMenuSeparator />}
            {people.data?.users
              .filter((u) => u.status === "active")
              .map((u) => (
                <DropdownMenuRadioItem key={u.id} value={`u:${u.id}`}>
                  {u.name}
                </DropdownMenuRadioItem>
              ))}
            {(people.data?.groups.length ?? 0) > 0 && <DropdownMenuSeparator />}
            {people.data?.groups.map((g) => (
              <DropdownMenuRadioItem key={g.id} value={`g:${g.id}`}>
                {g.name} (group)
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={chip(
            "Environment",
            f.env === "none" ? "Not set" : envLabel(f.env),
            !!f.env,
          )}
        />
        <DropdownMenuContent className="min-w-48">
          <DropdownMenuRadioGroup
            value={f.env}
            onValueChange={(v) => set({ env: (v as string) || null })}
          >
            <DropdownMenuRadioItem value="">Any</DropdownMenuRadioItem>
            {environments.map((e) => (
              <DropdownMenuRadioItem key={e.value} value={e.value}>
                {e.label}
              </DropdownMenuRadioItem>
            ))}
            <DropdownMenuRadioItem value="none">Not set</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={chip(
            "Lifecycle",
            f.life === "in-use" ? "In use" : lifecycleLabel(f.life),
            !!f.life,
          )}
        />
        <DropdownMenuContent className="min-w-48">
          <DropdownMenuRadioGroup
            value={f.life}
            onValueChange={(v) => set({ life: (v as string) || null })}
          >
            <DropdownMenuRadioItem value="">Any</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="in-use">
              Everything not retired
            </DropdownMenuRadioItem>
            <DropdownMenuSeparator />
            {lifecycles.map((l) => (
              <DropdownMenuRadioItem key={l.value} value={l.value}>
                {l.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={chip(
            "Needs a look",
            f.issue === "any"
              ? "Anything"
              : (issueMeta[f.issue as IssueKey]?.label ?? ""),
            !!f.issue,
          )}
        />
        <DropdownMenuContent className="min-w-52">
          <DropdownMenuRadioGroup
            value={f.issue}
            onValueChange={(v) => set({ issue: (v as string) || null })}
          >
            <DropdownMenuRadioItem value="">Don't filter</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="any">
              Anything that needs a look
            </DropdownMenuRadioItem>
            <DropdownMenuSeparator />
            {issueOrder.map((k) => (
              <DropdownMenuRadioItem key={k} value={k}>
                {issueMeta[k].label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

function SortMenu() {
  const [f, set] = useAssetFilters()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-9 gap-1.5 text-muted-foreground"
          />
        }
      >
        <ArrowDownUp />
        {sortLabels[f.sort]}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuRadioGroup
          value={f.sort}
          onValueChange={(v) =>
            set({ sort: v === "name" ? null : (v as (typeof sorts)[number]) })
          }
        >
          {sorts.map((s) => (
            <DropdownMenuRadioItem key={s} value={s}>
              {sortLabels[s]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilterSheet({
  open,
  onOpenChange,
  onExport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: () => void
}) {
  const [f, set] = useAssetFilters()
  const can = useAssetsCan()
  const a = useAssetActions()
  const row = (
    label: string,
    value: string,
    current: string,
    apply: () => void,
  ) => (
    <SheetAction
      key={label}
      label={label}
      trailing={
        value === current ? <span className="text-brand">✓</span> : undefined
      }
      onClick={apply}
    />
  )
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Filter and sort"
      full
    >
      <div className="flex flex-col gap-4 pb-6">
        <section>
          <h3 className="px-4 pb-1 text-caption text-ash">Owner</h3>
          {row("Anyone", "", f.owner, () => set({ owner: null }))}
          {row("Mine", "me", f.owner, () => set({ owner: "me" }))}
          {row("No owner", "none", f.owner, () => set({ owner: "none" }))}
        </section>
        <section>
          <h3 className="px-4 pb-1 text-caption text-ash">Needs a look</h3>
          {row("Don't filter", "", f.issue, () => set({ issue: null }))}
          {row("Anything", "any", f.issue, () => set({ issue: "any" }))}
          {issueOrder.map((k) =>
            row(issueMeta[k].label, k, f.issue, () => set({ issue: k })),
          )}
        </section>
        <section>
          <h3 className="px-4 pb-1 text-caption text-ash">Environment</h3>
          {row("Any", "", f.env, () => set({ env: null }))}
          {environments.map((e) =>
            row(e.label, e.value, f.env, () => set({ env: e.value })),
          )}
        </section>
        <section>
          <h3 className="px-4 pb-1 text-caption text-ash">Sort</h3>
          {sorts.map((s) =>
            row(sortLabels[s], s, f.sort, () =>
              set({ sort: s === "name" ? null : s }),
            ),
          )}
        </section>
        <section className="border-t border-border pt-2">
          <SheetAction
            icon={<Download />}
            label="Export as CSV"
            onClick={onExport}
          />
          {can.edit && (
            <SheetAction
              icon={<Upload />}
              label="Import from CSV"
              onClick={() => {
                onOpenChange(false)
                a.importer()
              }}
            />
          )}
        </section>
      </div>
    </BottomSheet>
  )
}

// ---- Add ----

function AddMenu({ phone, onPhone }: { phone: boolean; onPhone: () => void }) {
  const router = useRouter()
  if (phone)
    return (
      <Button onClick={onPhone}>
        <Plus />
        Add an asset
      </Button>
    )
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button className="h-9" />}>
        <Plus />
        Add asset
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="w-0 min-w-full text-caption font-normal whitespace-normal text-muted-foreground">
            Servers, databases, storages… appear by themselves once added in
            their own section.
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {manualKinds.map((k) => {
          const m = kindOf(k)
          return (
            <DropdownMenuItem
              key={k}
              onClick={() => router.push(newAssetHref(k))}
            >
              <m.icon />
              {m.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AddSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Add an asset">
      <p className="px-4 pb-2 text-caption text-muted-foreground">
        Servers, databases, storages… appear by themselves once added in their
        own section.
      </p>
      {manualKinds.map((k) => {
        const m = kindOf(k)
        return (
          <SheetAction
            key={k}
            icon={<m.icon />}
            label={m.label}
            description={m.short}
            onClick={() => {
              window.addEventListener(
                "popstate",
                () => router.push(newAssetHref(k)),
                { once: true },
              )
              onOpenChange(false)
            }}
          />
        )
      })}
    </BottomSheet>
  )
}

// ---- Lists ----

function AssetCards({
  items,
  selected,
  toggle,
  edit,
}: {
  items: Asset[]
  selected: string[]
  toggle: (id: string) => void
  edit: boolean
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-3">
      {items.map((a) => {
        const sel = selected.includes(a.id)
        return (
          <div
            key={a.id}
            className={cn(
              "group relative flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md",
              sel && "border-brand ring-2 ring-brand/20",
              a.lifecycle === "retired" && "opacity-70",
            )}
          >
            <div className="flex items-start gap-3">
              <AssetIcon asset={a} />
              <div className="min-w-0 flex-1">
                <Link
                  href={assetHref(a.id)}
                  className="block truncate text-body-sm font-medium after:absolute after:inset-0 after:rounded-2xl"
                >
                  {a.name}
                </Link>
                <p className="truncate text-caption text-muted-foreground">
                  {a.category || kindOf(a.kind).label}
                  {a.source_kind ? " · in Morche" : ""}
                </p>
              </div>
              {edit && (
                <Checkbox
                  checked={sel}
                  onCheckedChange={() => toggle(a.id)}
                  aria-label={`Select ${a.name}`}
                  className={cn(
                    "relative z-10 mt-0.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                    (sel || selected.length > 0) && "opacity-100",
                  )}
                />
              )}
            </div>
            <div className="flex min-w-0 items-center justify-between gap-2">
              <OwnerChip asset={a} compact />
              <StatusLabel asset={a} className="shrink-0" />
            </div>
            <div className="mt-auto flex min-w-0 flex-wrap items-center gap-1.5 border-t border-border pt-3">
              {a.environment && (
                <Pill
                  tone={a.environment === "production" ? "brand" : undefined}
                >
                  {envLabel(a.environment)}
                </Pill>
              )}
              <CriticalityPips value={a.criticality} />
              {a.lifecycle !== "active" && (
                <Pill>{lifecycleLabel(a.lifecycle)}</Pill>
              )}
              <IssuePills asset={a} skip={["no-owner"]} />
              <span className="ms-auto flex items-center gap-2">
                {a.note_count > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-caption text-ash"
                    title={`${a.note_count} ${a.note_count === 1 ? "note" : "notes"}`}
                  >
                    <NotebookPen className="size-3.5" />
                    {a.note_count}
                  </span>
                )}
                <NextDate asset={a} />
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AssetTable({
  items,
  selected,
  toggle,
  setSelected,
  edit,
}: {
  items: Asset[]
  selected: string[]
  toggle: (id: string) => void
  setSelected: (ids: string[]) => void
  edit: boolean
}) {
  const router = useRouter()
  const all = items.length > 0 && items.every((a) => selected.includes(a.id))
  return (
    <div className="@container overflow-hidden rounded-2xl border border-border [contain:inline-size]">
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead className="border-b border-border bg-subtle text-caption text-ash">
            <tr>
              {edit && (
                <th className="w-10 px-3 py-2.5">
                  <Checkbox
                    checked={all}
                    onCheckedChange={() =>
                      setSelected(all ? [] : items.map((a) => a.id))
                    }
                    aria-label="Select all"
                  />
                </th>
              )}
              <th className="px-3 py-2.5 text-start font-normal">Asset</th>
              <th className="px-3 py-2.5 text-start font-normal">Owner</th>
              <th className="hidden px-3 py-2.5 text-start font-normal @3xl:table-cell">
                Environment
              </th>
              <th className="hidden px-3 py-2.5 text-start font-normal @4xl:table-cell">
                Criticality
              </th>
              <th className="hidden px-3 py-2.5 text-start font-normal @5xl:table-cell">
                Status
              </th>
              <th className="px-3 py-2.5 text-start font-normal">Next date</th>
              <th className="hidden px-3 py-2.5 text-start font-normal @2xl:table-cell">
                Needs a look
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((a) => (
              <tr
                key={a.id}
                onClick={() => router.push(assetHref(a.id))}
                className={cn(
                  "cursor-pointer hover:bg-subtle",
                  selected.includes(a.id) && "bg-brand-soft/40",
                )}
              >
                {edit && (
                  <td
                    className="px-3 py-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selected.includes(a.id)}
                      onCheckedChange={() => toggle(a.id)}
                      aria-label={`Select ${a.name}`}
                    />
                  </td>
                )}
                <td className="max-w-80 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <AssetIcon asset={a} className="size-8" />
                    <div className="min-w-0">
                      <Link
                        href={assetHref(a.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="block truncate font-medium hover:underline"
                      >
                        {a.name}
                      </Link>
                      <span className="block truncate text-caption text-muted-foreground">
                        {a.category || kindOf(a.kind).label}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="max-w-56 px-3 py-2">
                  <OwnerChip asset={a} compact />
                </td>
                <td className="hidden px-3 py-2 whitespace-nowrap @3xl:table-cell">
                  {envLabel(a.environment) || (
                    <span className="text-ash">—</span>
                  )}
                </td>
                <td className="hidden px-3 py-2 whitespace-nowrap @4xl:table-cell">
                  {a.criticality ? (
                    <span className="inline-flex items-center gap-2">
                      <CriticalityPips value={a.criticality} />
                      {criticalityLabel(a.criticality)}
                    </span>
                  ) : (
                    <span className="text-ash">—</span>
                  )}
                </td>
                <td className="hidden px-3 py-2 @5xl:table-cell">
                  <StatusLabel asset={a} />
                </td>
                <td className="px-3 py-2">
                  <NextDate asset={a} />
                </td>
                <td className="hidden px-3 py-2 @2xl:table-cell">
                  <IssuePills asset={a} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PhoneList({ items }: { items: Asset[] }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((a) => {
        const issues = issuesOf(a)
        return (
          <li key={a.id}>
            <Link
              href={assetHref(a.id)}
              className="flex min-h-16 items-center gap-3 px-4 py-2.5 active:bg-muted"
            >
              <AssetIcon asset={a} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-medium">
                  {a.name}
                </span>
                <span className="block truncate text-caption text-muted-foreground">
                  {[
                    a.category || kindOf(a.kind).label,
                    a.owner.user_name || a.owner.group_name || "No owner",
                  ].join(" · ")}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <NextDate asset={a} />
                {issues[0] && (
                  <Pill
                    tone={
                      issueMeta[issues[0]].severity === 2 ? "danger" : "warning"
                    }
                  >
                    {issueMeta[issues[0]].label}
                  </Pill>
                )}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
