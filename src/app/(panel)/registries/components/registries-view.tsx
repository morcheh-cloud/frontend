"use client"

import {
  ArrowRight,
  Ellipsis,
  HardDrive,
  Lock,
  LockOpen,
  Plus,
  Server,
  Warehouse,
} from "lucide-react"
import Link from "next/link"
import { parseAsString, useQueryStates } from "nuqs"
import { useRef, useState } from "react"

import {
  Empty,
  type Item,
  ItemMenu,
  SearchBox,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { CopyCode } from "@/components/code-block"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { JobBar, progressText } from "@/components/jobs/meta"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type { PackageRegistry } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useRegistries } from "../api"
import {
  kindMeta,
  kindNames,
  newRegistryHref,
  RegistryLogo,
  registryHref,
  StatusPill,
  statusOf,
  toneText,
} from "./meta"
import { useRegistryJob } from "./parts"
import { useCanAddRegistry } from "./permissions"
import { useRegistryMenu } from "./registry-actions"

const useFilters = () =>
  useQueryStates({ q: parseAsString.withDefault("") }, { history: "replace" })

function useData() {
  const list = useRegistries()
  const [{ q }, setFilters] = useFilters()
  const all = [...(list.data?.items ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  const needle = q.trim().toLowerCase()
  const shown = all.filter(
    (r) =>
      !needle ||
      [r.name, r.address, r.server_name, r.label, r.note].some((v) =>
        v.toLowerCase().includes(needle),
      ),
  )
  return { list, all, shown, q, setFilters }
}

export function RegistriesView() {
  const isPhone = useIsPhone()
  if (isPhone === null) return null
  return isPhone ? <RegistriesMobile /> : <RegistriesDesktop />
}

function RegistriesDesktop() {
  const d = useData()
  const canAdd = useCanAddRegistry()
  const items = d.all.reduce((n, r) => n + r.items, 0)
  const bytes = d.all.reduce((n, r) => n + r.usage_bytes, 0)
  return (
    <div className="flex flex-col gap-4 px-6 pt-5 pb-24">
      {d.list.isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(22rem,1fr))] gap-4">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : d.list.isError && !d.list.data ? (
        <Empty
          icon={Warehouse}
          title="Couldn't load the registries"
          body={d.list.error.message}
          action={
            <Button variant="outline" onClick={() => d.list.refetch()}>
              Try again
            </Button>
          }
        />
      ) : d.all.length === 0 ? (
        <Welcome canAdd={canAdd} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <SearchBox
              value={d.q}
              onChange={(q) => d.setFilters({ q: q || null })}
              placeholder="Search registries"
              label="Search registries"
            />
            <span className="flex-1" />
            <span className="text-caption text-ash">
              {d.all.length} {d.all.length === 1 ? "registry" : "registries"} ·{" "}
              {items} {items === 1 ? "item" : "items"} · {formatSize(bytes)}
            </span>
            {canAdd && (
              <Button
                render={<Link href={newRegistryHref()} />}
                nativeButton={false}
              >
                <Plus />
                New registry
              </Button>
            )}
          </div>
          {d.shown.length === 0 ? (
            <Empty
              icon={Warehouse}
              title="No registry matches"
              body="Try another name or address."
            />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(22rem,1fr))] gap-4">
              {d.shown.map((r) => (
                <RegistryCard key={r.id} r={r} />
              ))}
              {canAdd && !d.q && <AddCard />}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RegistryCard({ r }: { r: PackageRegistry }) {
  const menu = useRegistryMenu()
  const job = useRegistryJob(r)
  const meta = kindMeta[r.kind]
  const status = statusOf(r)
  const deploying = r.state === "deploying" || r.state === "removing"
  return (
    <article className="group relative flex min-w-0 flex-col rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link
        href={registryHref(r.id)}
        aria-label={`Open ${r.name}`}
        className="absolute inset-0 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <div className="flex items-start gap-3 p-5 pb-4">
        <RegistryLogo kind={r.kind} className="size-11" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-body font-medium">{r.name}</h2>
          <p className="truncate text-caption text-muted-foreground">
            {meta.label} {r.version && `${r.version} `}· {meta.holds}
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-1">
          <StatusPill r={r} />
          <ItemMenu
            groups={menu(r)}
            label={`${r.name} actions`}
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${r.name} actions`}
              >
                <Ellipsis />
              </Button>
            }
          />
        </div>
      </div>

      <div className="relative z-10 mx-5 flex h-9 min-w-0 items-center gap-2 rounded-lg bg-subtle ps-3 pe-0.5">
        {r.https ? (
          <Lock className="size-3.5 shrink-0 text-success" aria-label="HTTPS" />
        ) : (
          <LockOpen
            className="size-3.5 shrink-0 text-ash"
            aria-label="Plain http"
          />
        )}
        <span className="min-w-0 flex-1 truncate font-mono text-caption">
          {r.address}
        </span>
        <CopyCode text={r.address} label="address" className="size-8" />
      </div>

      <div className="mt-auto px-5 pt-4 pb-5">
        {deploying ? (
          <div className="grid gap-2">
            {job && <JobBar job={job} />}
            <p className="truncate text-caption text-muted-foreground">
              {job ? progressText(job) : status.label}
            </p>
          </div>
        ) : r.state === "failed" || r.problem ? (
          <p className={cn("line-clamp-2 text-caption", toneText[status.tone])}>
            {r.problem || "The deploy failed: open it to see why."}
          </p>
        ) : (
          <dl className="grid grid-cols-3 gap-3">
            <Stat label={meta.nouns} value={String(r.items)} />
            <Stat label="Stored" value={formatSize(r.usage_bytes)} />
            <Stat
              label="Mirror"
              value={
                r.settings.mirror
                  ? r.kind === "harbor"
                    ? "Docker Hub"
                    : "npmjs"
                  : "Off"
              }
            />
          </dl>
        )}
        <p className="mt-3 flex items-center gap-1.5 truncate text-caption text-ash">
          <Server className="size-3.5 shrink-0" />
          <span className="truncate">{r.server_name}</span>
        </p>
      </div>
    </article>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-caption text-ash capitalize">{label}</dt>
      <dd className="truncate text-body-sm font-medium">{value}</dd>
    </div>
  )
}

function AddCard() {
  return (
    <Link
      href={newRegistryHref()}
      className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-mist text-body-sm text-muted-foreground outline-none hover:border-ash hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Plus className="size-5" />
      New registry
    </Link>
  )
}

// Nothing yet: what each kind is for, and a way in.
function Welcome({ canAdd }: { canAdd: boolean }) {
  return (
    <section className="flex flex-col gap-6 rounded-3xl border border-border bg-subtle p-8 max-md:rounded-none max-md:border-x-0 max-md:p-5">
      <div className="max-w-2xl">
        <p className="font-label text-[11px] tracking-label text-ash uppercase">
          Package registries
        </p>
        <h2 className="mt-2 text-heading font-light max-md:text-subheading">
          Your own registry, set up in one go
        </h2>
        <p className="mt-2 text-body-sm text-muted-foreground">
          Morche deploys it on one of your servers as a compose project, makes
          its admin, puts it behind your reverse proxy with HTTPS and turns on a
          mirror, so Docker Hub and npmjs pulls come from your own network. Then
          you browse and clean up what it holds from here.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {kindNames.map((k) => {
          const m = kindMeta[k]
          return (
            <div
              key={k}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
            >
              <div className="flex items-center gap-3">
                <RegistryLogo kind={k} className="size-12" />
                <div className="min-w-0">
                  <h3 className="text-body font-medium">{m.label}</h3>
                  <p className="text-caption text-muted-foreground">
                    {m.holds}
                  </p>
                </div>
                <span className="ms-auto rounded-full border border-border px-2 py-0.5 text-caption text-ash">
                  {m.license}
                </span>
              </div>
              <p className="text-body-sm text-muted-foreground">{m.blurb}</p>
              <ul className="grid gap-1.5 text-body-sm">
                {m.points.map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <span className="size-1.5 shrink-0 rounded-full bg-brand" />
                    {p}
                  </li>
                ))}
              </ul>
              {canAdd && (
                <Button
                  className="mt-auto self-start max-md:h-11 max-md:self-stretch"
                  render={<Link href={newRegistryHref(k)} />}
                  nativeButton={false}
                >
                  Deploy {m.label}
                  <ArrowRight />
                </Button>
              )}
            </div>
          )
        })}
      </div>
      {!canAdd && (
        <p className="text-body-sm text-muted-foreground">
          Deploying one takes Engineer access on a server. Ask a workspace
          owner.
        </p>
      )}
    </section>
  )
}

// ── Phones ────────────────────────────────────────────────────────────────

function RegistriesMobile() {
  const d = useData()
  const canAdd = useCanAddRegistry()
  const menu = useRegistryMenu()
  const [sheetOpen, setSheetOpen] = useOpen("registry-row-sheet")
  const [sheetId, setSheetId] = useState<string | null>(null)
  const last = useRef<{ title: string; groups: Item[][] } | null>(null)
  let current = last.current
  const tapped = sheetId ? d.all.find((r) => r.id === sheetId) : undefined
  if (tapped) current = { title: tapped.name, groups: menu(tapped) }
  if (current) last.current = current

  return (
    <>
      <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
        <h1 className="text-heading font-light">Registries</h1>
        <HelpButton
          href={guideHref("package-registries")}
          label="Package registries guide"
          className="ms-auto"
        />
        {canAdd && d.all.length > 0 && (
          <Button
            size="icon-lg"
            aria-label="New registry"
            className="rounded-full"
            render={<Link href={newRegistryHref()} />}
            nativeButton={false}
          >
            <Plus className="size-5" />
          </Button>
        )}
      </header>
      {d.list.isPending ? (
        <div className="mt-4 flex flex-col gap-3 px-4">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      ) : d.all.length === 0 ? (
        <div className="mt-4">
          <Welcome canAdd={canAdd} />
        </div>
      ) : (
        <>
          <SearchBox
            value={d.q}
            onChange={(q) => d.setFilters({ q: q || null })}
            placeholder="Search registries"
            label="Search registries"
            className="mx-4 mt-4"
          />
          <ul className="mt-3 divide-y divide-border border-y border-border pb-[env(safe-area-inset-bottom)]">
            {d.shown.map((r) => (
              <PhoneRow
                key={r.id}
                r={r}
                onMore={() => {
                  setSheetId(r.id)
                  setSheetOpen(true)
                }}
              />
            ))}
          </ul>
        </>
      )}
      {current && (
        <BottomSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={current.title}
        >
          <SheetItems groups={current.groups} onOpenChange={setSheetOpen} />
        </BottomSheet>
      )}
    </>
  )
}

function PhoneRow({ r, onMore }: { r: PackageRegistry; onMore: () => void }) {
  const status = statusOf(r)
  return (
    <li className="flex items-center gap-3 ps-4 pe-1">
      <Link
        href={registryHref(r.id)}
        className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 py-3"
      >
        <RegistryLogo kind={r.kind} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium">{r.name}</p>
          <p className="truncate font-mono text-caption text-muted-foreground">
            {r.address}
          </p>
          <p className="flex items-center gap-2 text-caption">
            <span className={toneText[status.tone]}>{status.label}</span>
            {r.state === "ready" && (
              <span className="flex items-center gap-1 text-ash">
                <HardDrive className="size-3" />
                {formatSize(r.usage_bytes)} · {r.items}{" "}
                {r.items === 1 ? kindMeta[r.kind].noun : kindMeta[r.kind].nouns}
              </span>
            )}
          </p>
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={`${r.name} actions`}
        onClick={onMore}
      >
        <Ellipsis className="size-5" />
      </Button>
    </li>
  )
}
