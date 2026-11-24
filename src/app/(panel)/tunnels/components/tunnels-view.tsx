"use client"

import {
  ArrowRight,
  Cable,
  CircleAlert,
  Ellipsis,
  Loader2,
  Plug,
  Plus,
  Server,
  Unplug,
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
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { LogoMark } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import type { Tunnel } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useServerPicks, useTunnels } from "../api"
import {
  type Choice,
  choiceOf,
  choices,
  groups,
  newTunnelHref,
  statusMeta,
  TunnelIcon,
  targetOf,
  toneDot,
  toneText,
  tunnelHref,
} from "./meta"
import { useCanAddTunnel, useTunnelCan } from "./permissions"
import { useTunnelActions, useTunnelMenu } from "./tunnel-actions"

const useFilters = () =>
  useQueryStates({ q: parseAsString.withDefault("") }, { history: "replace" })

function useData() {
  const list = useTunnels()
  const picks = useServerPicks()
  const [{ q }, setFilters] = useFilters()
  const all = list.data?.items ?? []
  const names = new Map((picks.data?.items ?? []).map((s) => [s.id, s.name]))
  const needle = q.trim().toLowerCase()
  const shown = all.filter(
    (t) =>
      !needle ||
      [t.name, t.description, t.kind_label, targetOf(t)].some((v) =>
        v.toLowerCase().includes(needle),
      ),
  )
  return {
    list,
    all,
    shown,
    q,
    setFilters,
    tools: list.data?.tools ?? {},
    nameOf: (id?: string) => (id ? names.get(id) : undefined),
  }
}

type Data = ReturnType<typeof useData>

export function TunnelsView() {
  const phone = useIsPhone()
  if (phone === null) return null
  return phone ? <TunnelsMobile /> : <TunnelsDesktop />
}

// What a tunnel says about itself in one line.
function stateLine(t: Tunnel) {
  switch (t.status) {
    case "connected":
      return [
        t.address && `Address ${t.address}`,
        `${t.conns} ${t.conns === 1 ? "connection" : "connections"} open`,
      ]
        .filter(Boolean)
        .join(" · ")
    case "connecting":
      return "Connecting…"
    case "failed":
      return t.status_message || "The last try failed"
    default:
      return t.last_connected_at
        ? `Opens when used · last connected ${timeAgo(t.last_connected_at)}`
        : "Opens when a server needs it"
  }
}

// "3 servers · 2 more", or "Not used yet".
export function usedText(t: Tunnel) {
  const n = t.server_count + t.other_count
  if (n === 0) return "Not used yet"
  if (t.other_count === 0) return `${n} ${n === 1 ? "server" : "servers"}`
  return `${n} in use`
}

const missingTool = (t: Tunnel, tools: Record<string, boolean>) => {
  const c = choiceOf(t)
  return c.tool && tools[t.kind] === false ? c.tool : null
}

function TunnelsDesktop() {
  const d = useData()
  const canAdd = useCanAddTunnel()
  return (
    <div className="flex flex-col gap-4 px-6 pt-5 pb-24">
      {d.list.isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(22rem,1fr))] gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : d.list.isError && !d.list.data ? (
        <Failed error={d.list.error} onRetry={() => d.list.refetch()} />
      ) : d.all.length === 0 ? (
        <Welcome canAdd={canAdd} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <SearchBox
              value={d.q}
              onChange={(q) => d.setFilters({ q: q || null })}
              placeholder="Search tunnels"
              label="Search tunnels"
            />
            <span className="flex-1" />
            <span className="text-caption text-ash">{summary(d.all)}</span>
            {canAdd && (
              <Button
                render={<Link href={newTunnelHref()} />}
                nativeButton={false}
              >
                <Plus />
                Add tunnel
              </Button>
            )}
          </div>
          {d.shown.length === 0 ? (
            <Empty
              icon={Cable}
              title="No tunnel matches"
              body="Try another name."
            />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(22rem,1fr))] gap-4">
              {d.shown.map((t) => (
                <TunnelCard key={t.id} t={t} d={d} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function summary(all: Tunnel[]) {
  const on = all.filter((t) => t.status === "connected").length
  const bad = all.filter((t) => t.status === "failed").length
  return [
    `${all.length} ${all.length === 1 ? "tunnel" : "tunnels"}`,
    on > 0 && `${on} connected`,
    bad > 0 && `${bad} failing`,
  ]
    .filter(Boolean)
    .join(" · ")
}

function StatusPill({ t }: { t: Tunnel }) {
  const m = statusMeta[t.status]
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-caption font-medium",
        toneText[m.tone],
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", toneDot[m.tone])}
      />
      {m.label}
    </span>
  )
}

// Morche → the tunnel → its servers, as a strip.
function Flow({ t, d }: { t: Tunnel; d: Data }) {
  const m = statusMeta[t.status]
  const line = cn(
    "h-px flex-1",
    t.status === "connected"
      ? "bg-success"
      : t.status === "failed"
        ? "bg-destructive/60"
        : "bg-border",
  )
  return (
    <div className="flex items-center gap-2 rounded-xl bg-subtle p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-brand-strong shadow-sm">
        <LogoMark className="h-2.5 w-5" />
      </span>
      <span className={line} />
      <span
        className={cn(
          "flex min-w-0 items-center gap-1.5 rounded-lg bg-card px-2 py-1 text-caption shadow-sm",
          toneText[m.tone],
        )}
        title={targetOf(t, d.nameOf(t.config.server_id))}
      >
        <TunnelIcon tunnel={t} className="size-3.5 shrink-0" />
        <span className="truncate text-foreground">
          {targetOf(t, d.nameOf(t.config.server_id)) || t.kind_label}
        </span>
      </span>
      <span className={line} />
      <span className="flex shrink-0 items-center gap-1 rounded-lg bg-card px-2 py-1 text-caption shadow-sm">
        <Server className="size-3.5 text-muted-foreground" />
        <span className="tabular-nums">{t.server_count + t.other_count}</span>
      </span>
    </div>
  )
}

function TunnelCard({ t, d }: { t: Tunnel; d: Data }) {
  const a = useTunnelActions()
  const menu = useTunnelMenu()
  const can = useTunnelCan()
  const tool = missingTool(t, d.tools)
  const open = t.status === "connected" || t.status === "connecting"
  const busy = a.busy.has(t.id) || t.status === "connecting"
  return (
    <article className="group relative flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
          <TunnelIcon tunnel={t} />
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={tunnelHref(t.id)}
            className="block truncate text-body font-medium outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            {t.name}
          </Link>
          <span className="block truncate text-caption text-muted-foreground">
            {t.kind_label}
          </span>
        </div>
        <StatusPill t={t} />
      </div>
      <Flow t={t} d={d} />
      <p
        className={cn(
          "line-clamp-2 min-h-8 text-caption",
          t.status === "failed" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {tool
          ? `${tool} isn't installed on the machine Morche runs on.`
          : stateLine(t)}
      </p>
      <div className="relative z-10 flex items-center gap-2">
        {can(t, "operator") &&
          (open ? (
            <Button
              variant="outline"
              className="h-8"
              disabled={a.busy.has(t.id)}
              onClick={() => a.disconnect(t)}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Unplug />}
              Disconnect
            </Button>
          ) : (
            <Button
              variant="outline"
              className="h-8"
              disabled={busy || !!tool}
              onClick={() => a.connect(t)}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Plug />}
              Connect
            </Button>
          ))}
        <span className="flex-1" />
        <ItemMenu
          groups={menu(t)}
          label={`${t.name} actions`}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={`${t.name} actions`}
            >
              <Ellipsis />
            </Button>
          }
        />
      </div>
    </article>
  )
}

// The empty page explains what tunnels are for, with every kind to start.
function Welcome({ canAdd }: { canAdd: boolean }) {
  return (
    <div className="flex flex-col gap-8 py-6">
      <div className="flex max-w-2xl flex-col gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
          <Cable className="size-6" />
        </span>
        <h2 className="text-subheading font-normal">
          Reach servers behind a VPN
        </h2>
        <p className="text-body-sm text-muted-foreground">
          Some servers are only reachable after connecting to a VPN, through a
          proxy or from another server. Set that up once here, then pick it in a
          server&apos;s connection settings: terminals, files, checks and
          Ansible all go through it. Nothing changes on the network of the
          machine Morche runs on.
        </p>
      </div>
      {canAdd ? (
        <ChoiceTiles />
      ) : (
        <p className="text-body-sm text-muted-foreground">
          No tunnels yet. A workspace Owner can set one up.
        </p>
      )}
    </div>
  )
}

export function ChoiceTiles({
  onPick,
  value,
}: {
  onPick?: (c: Choice) => void
  value?: string
}) {
  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.value} className="flex flex-col gap-2">
          <span className="font-label text-caption tracking-label text-ash uppercase">
            {g.label}
          </span>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
            {choices
              .filter((c) => c.group === g.value)
              .map((c) => {
                const body = (
                  <>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-brand-soft group-hover:text-brand-strong group-aria-pressed:bg-brand group-aria-pressed:text-primary-foreground">
                      <c.icon className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm font-medium group-aria-pressed:text-brand-strong">
                        {c.label}
                      </span>
                      <span className="block truncate text-caption text-muted-foreground">
                        {c.short}
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-ash opacity-0 transition-opacity group-hover:opacity-100" />
                  </>
                )
                const cls =
                  "group flex min-h-14 min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-start transition-colors outline-none hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft"
                return onPick ? (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={value === c.value}
                    className={cls}
                    onClick={() => onPick(c)}
                  >
                    {body}
                  </button>
                ) : (
                  <Link
                    key={c.value}
                    href={newTunnelHref(c.value)}
                    className={cls}
                  >
                    {body}
                  </Link>
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}

function Failed({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Empty
      icon={CircleAlert}
      title="Couldn't load tunnels"
      body={error.message || "The server didn't answer. Try again."}
      action={
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  )
}

// ── Phones ────────────────────────────────────────────────────────────────

function TunnelsMobile() {
  const d = useData()
  const canAdd = useCanAddTunnel()
  const menu = useTunnelMenu()
  const [sheetOpen, setSheetOpen] = useOpen("tunnel-row-sheet")
  const [sheetId, setSheetId] = useState<string | null>(null)
  const last = useRef<{ title: string; groups: Item[][] } | null>(null)
  let current = last.current
  const tapped = sheetId ? d.all.find((t) => t.id === sheetId) : undefined
  if (tapped) current = { title: tapped.name, groups: menu(tapped) }
  if (current) last.current = current

  return (
    <>
      <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
        <h1 className="text-heading font-light">Tunnels</h1>
        <HelpButton
          href={guideHref("tunnels")}
          label="VPN & tunnels guide"
          className="ms-auto"
        />
        {canAdd && (
          <Button
            size="icon-lg"
            aria-label="Add tunnel"
            className="rounded-full"
            render={<Link href={newTunnelHref()} />}
            nativeButton={false}
          >
            <Plus className="size-5" />
          </Button>
        )}
      </header>
      {d.list.isPending ? (
        <div className="flex flex-col gap-3 p-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : d.list.isError && !d.list.data ? (
        <Failed error={d.list.error} onRetry={() => d.list.refetch()} />
      ) : d.all.length === 0 ? (
        <div className="px-4">
          <Welcome canAdd={canAdd} />
        </div>
      ) : (
        <>
          <SearchBox
            value={d.q}
            onChange={(q) => d.setFilters({ q: q || null })}
            placeholder="Search tunnels"
            label="Search tunnels"
            className="mx-4 mt-4"
          />
          <div className="pt-3 pb-[calc(6rem+env(safe-area-inset-bottom))]">
            <ul className="divide-y divide-border border-y border-border">
              {d.shown.map((t) => {
                const m = statusMeta[t.status]
                return (
                  <li key={t.id} className="flex items-center gap-3 ps-4 pe-1">
                    <Link
                      href={tunnelHref(t.id)}
                      className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2.5"
                    >
                      <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
                        <TunnelIcon tunnel={t} />
                        <span
                          aria-hidden
                          className={cn(
                            "absolute -end-0.5 -bottom-0.5 size-3 rounded-full border-2 border-background",
                            toneDot[m.tone],
                          )}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-medium">
                          {t.name}
                        </span>
                        <span
                          className={cn(
                            "block truncate text-caption",
                            t.status === "failed"
                              ? "text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {m.label} · {t.kind_label} · {usedText(t)}
                        </span>
                      </span>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      aria-label={`${t.name} actions`}
                      onClick={() => {
                        setSheetId(t.id)
                        setSheetOpen(true)
                      }}
                    >
                      <Ellipsis className="size-5" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={current?.title ?? ""}
      >
        {current && (
          <SheetItems groups={current.groups} onOpenChange={setSheetOpen} />
        )}
      </BottomSheet>
    </>
  )
}
