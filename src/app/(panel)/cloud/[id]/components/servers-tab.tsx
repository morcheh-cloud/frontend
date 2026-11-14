"use client"

import {
  ChevronRight,
  Copy,
  History,
  ServerCog,
  Server as ServerIcon,
  SquarePlus,
} from "lucide-react"
import Link from "next/link"

import {
  ItemMenu,
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { OsTile } from "@/app/(panel)/servers/components/meta"
import { Button } from "@/components/ui/button"
import type { CloudServer } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCloudActions, useServerMenu } from "../../components/cloud-actions"
import {
  formatMemory,
  mainAddress,
  ServerStateLabel,
  serverStateMeta,
} from "../../components/meta"
import {
  asShow,
  type Model,
  type ServerShow,
  serverMatches,
  serverShowCounts,
  serverShows,
  useAccountFilters,
} from "./model"
import {
  Blank,
  Count,
  Fact,
  GridSkeleton,
  osOf,
  PhoneChips,
  PhoneEmpty,
  PhoneGroup,
  PhoneSkeleton,
  Toolbar,
} from "./parts"

// Every server in the account, as cards (desktop) or rows (phone).

const showLabel: Record<ServerShow, string> = {
  all: "All",
  running: "Running",
  off: "Off",
  other: "Other",
  unlinked: "Not in Morche",
}

function useServerList(m: Model) {
  const f = useAccountFilters()
  const show = asShow(serverShows, f.show)
  const all = m.servers ?? []
  const counts = serverShowCounts(all)
  const items = serverShows
    // "Other" only when something is in it, besides the one picked.
    .filter((v) => v !== "other" || counts.other > 0 || show === "other")
    .map((v) => ({ value: v, label: showLabel[v], n: counts[v] }))
  const list = all.filter((s) => serverMatches(s, show, f.q))
  return { f, show, items, list, all }
}

export function ServersDesktop({ model: m }: { model: Model }) {
  const { f, show, items, list, all } = useServerList(m)
  return (
    <div className="flex flex-col gap-5">
      <Toolbar>
        <SearchBox
          value={f.q}
          onChange={f.setQ}
          placeholder="Search name, address, system…"
          label="Search servers"
        />
        <Segmented
          label="Show"
          value={show}
          onChange={f.setShow}
          items={items.map((i) => ({
            value: i.value,
            label: (
              <>
                {i.label}
                <Count n={i.n} />
              </>
            ),
          }))}
        />
        {m.servers && (f.q || show !== "all") && (
          <span className="ms-auto text-caption text-ash tabular-nums">
            {list.length} of {all.length}
          </span>
        )}
      </Toolbar>

      {!m.servers ? (
        <GridSkeleton n={3} h="h-48" />
      ) : all.length === 0 ? (
        <Blank
          icon={<ServerIcon />}
          title="No servers in this account"
          body={`Servers made in the ${m.account.provider_label} panel with this key show up here within a minute. Use Read again to look now.`}
        />
      ) : list.length === 0 ? (
        <Blank
          icon={<ServerIcon />}
          title="No server matches"
          body="Try other words, or show every server."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                f.setQ("")
                f.setShow("all")
              }}
            >
              Show all
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {list.map((s) => (
            <ServerCard key={`${s.region}-${s.id}`} server={s} />
          ))}
        </div>
      )}
    </div>
  )
}

function ServerCard({ server: s }: { server: CloudServer }) {
  const actions = useCloudActions()
  const menu = useServerMenu()
  const address = mainAddress(s)
  const linked = s.linked[0]
  const meta = serverStateMeta[s.state]

  return (
    <article className="group/card relative flex flex-col rounded-2xl border border-border bg-card shadow-sm transition-shadow focus-within:ring-3 focus-within:ring-ring/50 hover:shadow-md">
      <div className="flex items-start gap-3 p-4 pb-0">
        <OsTile os={osOf(s)} className="size-10" />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => actions.details(s)}
            className="block max-w-full truncate text-start text-body-sm font-medium outline-none group-hover/card:text-brand-strong after:absolute after:inset-0 after:rounded-2xl"
          >
            {s.name}
          </button>
          <ServerStateLabel
            server={s}
            className={cn("text-caption", s.task ? "text-brand" : meta.tone)}
          />
        </div>
        <div className="relative z-10 -me-1.5 -mt-1">
          <ItemMenu groups={menu(s)} label={`${s.name} actions`} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 pt-4 text-caption">
        <Fact label="Address" className="col-span-2">
          {address ? (
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate font-mono text-foreground">
                {address}
              </span>
              <button
                type="button"
                aria-label="Copy address"
                onClick={() => actions.copy(address, "Address")}
                className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-md text-ash outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Copy className="size-3.5" />
              </button>
            </span>
          ) : (
            <span className="text-ash">None</span>
          )}
        </Fact>
        <Fact label="Size" className="col-span-2">
          {sizeText(s) || "—"}
        </Fact>
        <Fact label="Where" className="col-span-2">
          {whereText(s)}
        </Fact>
      </dl>

      <footer className="mt-4 flex min-h-12 items-center gap-2 border-t border-border px-4 py-2 text-caption">
        {linked ? (
          <Link
            href={`/servers/${linked.id}`}
            className="relative z-10 inline-flex min-w-0 items-center gap-1.5 rounded-md text-brand-strong outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ServerCog className="size-3.5 shrink-0" />
            <span className="truncate">In Morche as {linked.name}</span>
          </Link>
        ) : actions.canAddToMorche && address ? (
          <Button
            variant="ghost"
            size="sm"
            className="relative z-10 -ms-2"
            onClick={() => actions.addToMorche(s)}
          >
            <SquarePlus />
            Add to Morche
          </Button>
        ) : (
          <span className="text-ash">Not in Morche</span>
        )}
        {s.backups && (
          <span className="ms-auto inline-flex items-center gap-1 text-muted-foreground">
            <History className="size-3.5" />
            Backups
          </span>
        )}
      </footer>
    </article>
  )
}

const sizeText = (s: CloudServer) =>
  [
    s.cpu && `${s.cpu} vCPU`,
    s.memory_mb && formatMemory(s.memory_mb),
    s.disk_gb && `${s.disk_gb} GB disk`,
  ]
    .filter(Boolean)
    .join(" · ")

const whereText = (s: CloudServer) =>
  [s.region_name || s.region, s.zone_name || s.zone]
    .filter(Boolean)
    .filter((x, i, all) => all.indexOf(x) === i)
    .join(" · ")

// ── Phone ────────────────────────────────────────────────────────────────

export function ServersPhone({ model: m }: { model: Model }) {
  const { f, show, items, list, all } = useServerList(m)
  const actions = useCloudActions()
  return (
    <>
      <div className="flex flex-col gap-3 pt-4">
        <SearchBox
          value={f.q}
          onChange={f.setQ}
          placeholder="Search servers"
          label="Search servers"
          className="px-4"
        />
        <PhoneChips
          label="Show"
          items={items}
          value={show}
          onChange={f.setShow}
        />
      </div>
      <PhoneGroup
        title={show === "all" && !f.q ? "Servers" : "Matching"}
        count={m.servers ? list.length : undefined}
        className="mt-5"
      >
        {!m.servers ? (
          <PhoneSkeleton />
        ) : all.length === 0 ? (
          <PhoneEmpty>
            No servers in this account. Servers made in the{" "}
            {m.account.provider_label} panel show up within a minute.
          </PhoneEmpty>
        ) : list.length === 0 ? (
          <PhoneEmpty>No server matches.</PhoneEmpty>
        ) : (
          list.map((s) => (
            <li key={`${s.region}-${s.id}`}>
              <button
                type="button"
                onClick={() => actions.details(s)}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start outline-none active:bg-muted"
              >
                <OsTile os={osOf(s)} className="size-10" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-body font-medium">
                    {s.name}
                  </span>
                  <span className="flex min-w-0 items-center gap-2 text-caption text-muted-foreground">
                    <ServerStateLabel
                      server={s}
                      className={cn(
                        "shrink-0",
                        s.task ? "text-brand" : serverStateMeta[s.state].tone,
                      )}
                    />
                    {mainAddress(s) && (
                      <span className="truncate font-mono">
                        · {mainAddress(s)}
                      </span>
                    )}
                  </span>
                </span>
                {s.linked[0] && (
                  <ServerCog
                    aria-label="In Morche"
                    className="size-4 shrink-0 text-brand"
                  />
                )}
                <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
              </button>
            </li>
          ))
        )}
      </PhoneGroup>
    </>
  )
}
