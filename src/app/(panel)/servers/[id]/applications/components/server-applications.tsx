"use client"

import { LayoutGrid, Plus, RefreshCw } from "lucide-react"
import Link from "next/link"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { type ReactNode, useState } from "react"

import { useCatalog, useServerSoftware } from "@/app/(panel)/applications/api"
import { RunsPanel } from "@/app/(panel)/applications/components/activity"
import {
  InstallRows,
  InstallsTable,
  NoInstalls,
  sortInstalls,
} from "@/app/(panel)/applications/components/installed"
import {
  applicationsHref,
  kindLabels,
  matchInstall,
  matchRecipe,
  RecipeIcon,
} from "@/app/(panel)/applications/components/meta"
import { Layer, LayerBody } from "@/app/(panel)/applications/components/parts"
import { useSoftwareCan } from "@/app/(panel)/applications/components/permissions"
import {
  SoftwareActionsProvider,
  useSoftwareActions,
} from "@/app/(panel)/applications/components/software-actions"
import { UpdatesPanel } from "@/app/(panel)/applications/components/updates"
import {
  Failed,
  Placeholder,
} from "@/app/(panel)/scripts/components/scripts-view"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import type { Recipe, SoftwareHost } from "@/lib/services"
import { cn } from "@/lib/utils"
import { afterClose, Empty, SearchBox, Segmented } from "../../components/parts"
import { useServerPage } from "../../components/server-page"

const tabs = ["installed", "updates", "activity"] as const
type Tab = (typeof tabs)[number]

const filters = {
  tab: parseAsStringLiteral(tabs).withDefault("installed"),
  q: parseAsString.withDefault(""),
}

const useFilters = () => useQueryStates(filters, { history: "replace" })

// A server's Applications tab: what is installed here, its updates (the
// applications' and the system's) and what ran here. Same layers as
// /applications.
export function ServerApplicationsView() {
  return (
    <SoftwareActionsProvider>
      <Content />
    </SoftwareActionsProvider>
  )
}

function Content() {
  const { server, phone } = useServerPage()
  const can = useSoftwareCan(server.workspace_id)
  const a = useSoftwareActions()
  const ref = { server_id: server.id, workspace_id: server.workspace_id }
  const soft = useServerSoftware(server.id)
  const catalog = useCatalog(server.workspace_id)
  const [{ tab: wanted, q }, setFilters] = useFilters()
  const tab: Tab =
    wanted === "activity" && !can.operate(ref) ? "installed" : wanted
  const [pickOpen, setPickOpen] = useOpen("software-pick")

  const items = soft.data?.items ?? []
  const host = soft.data?.host ?? null
  const updates =
    items.filter((i) => i.update_available).length +
    (host && host.upgradable > 0 ? 1 : 0)
  const scanning = a.scanning || soft.isFetching

  const refresh = can.scan(ref) && (
    <Button
      variant="outline"
      size="icon"
      className="max-md:size-11 md:size-9"
      aria-label="Check this server"
      title="Check this server"
      disabled={scanning}
      onClick={() => a.scan(server.id)}
    >
      <RefreshCw className={cn(scanning && "animate-spin")} />
    </Button>
  )
  const install = can.installOn(ref) && (
    <Button
      size={phone ? "icon-lg" : "default"}
      className="md:h-9"
      aria-label="Install an application"
      onClick={() => setPickOpen(true)}
    >
      <Plus />
      {!phone && "Install"}
    </Button>
  )
  const tabSwitch = (
    <Segmented
      label="Show"
      items={tabs
        .filter((t) => t !== "activity" || can.operate(ref))
        .map((t) => ({
          value: t,
          label:
            t === "installed" ? (
              <>
                Installed
                {items.length > 0 && (
                  <span className="ms-1.5 text-caption text-ash">
                    {items.length}
                  </span>
                )}
              </>
            ) : t === "updates" ? (
              <>
                Updates
                {updates > 0 && (
                  <span className="ms-1.5 text-caption text-brand">
                    {updates}
                  </span>
                )}
              </>
            ) : (
              "Activity"
            ),
        }))}
      value={tab}
      onChange={(t) => setFilters({ tab: t === "installed" ? null : t })}
    />
  )
  const search = (
    <SearchBox
      value={q}
      onChange={(v) => setFilters({ q: v || null })}
      placeholder={
        tab === "activity" ? "Search activity" : "Search applications"
      }
      label={tab === "activity" ? "Search activity" : "Search applications"}
      className={phone ? "min-w-0 flex-1" : undefined}
    />
  )

  const bar = phone ? (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-3">
      <div className="flex items-center gap-2">
        {search}
        {refresh}
        {install}
      </div>
      <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
        {tabSwitch}
      </div>
      <HostText host={host} />
    </div>
  ) : (
    <div className="@container flex flex-wrap items-center gap-2">
      {tabSwitch}
      <span className="mx-1 h-5 w-px bg-border" />
      {search}
      <span className="ms-auto hidden @3xl:inline">
        <HostText host={host} />
      </span>
      {refresh}
      {install}
    </div>
  )

  const recipes = catalog.data?.items ?? []
  let body: ReactNode
  if (tab === "activity") {
    body = <RunsPanel phone={phone} q={q} serverId={server.id} />
  } else if (soft.isPending) {
    body = <Placeholder phone={phone} />
  } else if (soft.isError && !soft.data) {
    body = <Failed error={soft.error} onRetry={() => soft.refetch()} />
  } else if (tab === "updates") {
    body = (
      <UpdatesPanel
        phone={phone}
        items={items.filter((i) => matchInstall(i, q))}
        hosts={host ? [host] : []}
        recipes={recipes}
      />
    )
  } else if (items.length === 0) {
    body = (
      <NoInstalls
        onScan={can.scan(ref) ? () => a.scan(server.id) : undefined}
      />
    )
  } else {
    const shown = sortInstalls(items.filter((i) => matchInstall(i, q)))
    body =
      shown.length === 0 ? (
        <Empty
          icon={LayoutGrid}
          title="Nothing matches"
          body="Try other words."
          action={
            <Button
              variant="outline"
              className="h-11 md:h-9"
              onClick={() => setFilters({ q: null })}
            >
              Clear search
            </Button>
          }
        />
      ) : phone ? (
        <InstallRows items={shown} recipes={recipes} server />
      ) : (
        <InstallsTable items={shown} recipes={recipes} server />
      )
  }

  return (
    <div className={cn("flex flex-col", phone ? "pb-24" : "gap-4")}>
      {bar}
      {host?.error && (
        <p
          className={cn(
            "rounded-2xl border border-border bg-subtle px-4 py-3 text-body-sm",
            phone && "mx-4 mb-3",
          )}
        >
          <span className="font-medium text-destructive">
            The last check failed.
          </span>{" "}
          <span className="text-muted-foreground">{host.error}</span>
        </p>
      )}
      {body}
      <RecipePicker
        open={pickOpen}
        onOpenChange={setPickOpen}
        recipes={recipes}
        installed={new Set(items.map((i) => i.recipe_id))}
        onPick={(r) =>
          afterClose(setPickOpen, () =>
            a.install(r, { servers: [{ id: server.id, name: server.name }] }),
          )
        }
      />
    </div>
  )
}

// One quiet line: package manager, waiting updates, Docker, last check.
function HostText({ host }: { host: SoftwareHost | null }) {
  if (!host)
    return <span className="text-caption text-ash">Not checked yet</span>
  const parts = [
    host.pm,
    host.upgradable
      ? `${host.upgradable} ${host.upgradable === 1 ? "package update" : "package updates"}`
      : "packages up to date",
    host.docker ? `Docker ${host.docker}` : "",
    `checked ${timeAgo(host.checked_at)}`,
  ].filter(Boolean)
  return (
    <span className="text-caption text-ash">
      {parts.join(" · ")}
      {host.reboot_required && (
        <span className="text-warning"> · Reboot needed</span>
      )}
    </span>
  )
}

// Pick from the workspace's catalog; the install dialog then opens with this
// server already chosen.
function RecipePicker({
  open,
  onOpenChange,
  recipes,
  installed,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipes: Recipe[]
  installed: Set<string>
  onPick: (r: Recipe) => void
}) {
  const [q, setQ] = useState("")
  const list = recipes
    .filter((r) => matchRecipe(r, q))
    .sort((a, b) => a.name.localeCompare(b.name))
  return (
    <Layer
      open={open}
      onOpenChange={onOpenChange}
      title="Install an application"
      description="Pick one from the catalog."
    >
      <LayerBody className="gap-4">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Search applications"
          label="Search applications"
          className="md:w-full"
        />
        {list.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No application matches.{" "}
            <Link
              href={applicationsHref("/applications", {})}
              className="text-brand hover:underline"
            >
              Open the catalog
            </Link>
          </p>
        ) : (
          <ul className="-mx-4 divide-y divide-border border-y border-border md:mx-0 md:rounded-2xl md:border">
            {list.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onPick(r)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-start outline-none hover:bg-subtle focus-visible:bg-subtle active:bg-muted"
                >
                  <RecipeIcon recipe={r} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body-sm font-medium">
                      {r.name}
                    </span>
                    <span className="truncate text-caption text-ash">
                      {r.builtin
                        ? kindLabels[r.kind]
                        : `Custom · ${kindLabels[r.kind]}`}
                      {r.category ? ` · ${r.category}` : ""}
                    </span>
                  </span>
                  {installed.has(r.id) && (
                    <span className="shrink-0 text-caption text-success">
                      Installed
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </LayerBody>
    </Layer>
  )
}
