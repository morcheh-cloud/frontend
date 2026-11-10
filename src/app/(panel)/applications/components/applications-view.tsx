"use client"

import { Plus, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

import {
  Failed,
  Placeholder,
} from "@/app/(panel)/scripts/components/scripts-view"
import {
  Empty,
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { useIsPhone } from "@/hooks/useIsPhone"
import { cn } from "@/lib/utils"
import { useCatalog, useInstalls } from "../api"
import { RunsPanel } from "./activity"
import { CatalogPanel } from "./catalog"
import {
  InstallRows,
  InstallsTable,
  NoInstalls,
  sortInstalls,
} from "./installed"
import {
  installProblem,
  matchInstall,
  runShowLabels,
  showLabels,
  type Tab,
  tabLabels,
  useApplicationsFilters,
} from "./meta"
import { useSoftwareCan } from "./permissions"
import { useSoftwareActions } from "./software-actions"
import { UpdatesPanel, updateCount } from "./updates"

export const NEW_RECIPE = "/applications/recipes/new"

export function ApplicationsView() {
  const phone = useIsPhone()
  if (phone === null) return null
  return <View phone={phone} />
}

function View({ phone }: { phone: boolean }) {
  const can = useSoftwareCan()
  const a = useSoftwareActions()
  const router = useRouter()
  const [{ tab, q, runs }] = useApplicationsFilters()
  const current: Tab = tab === "activity" && !can.runs ? "catalog" : tab
  const newRecipe = () => router.push(NEW_RECIPE)

  const scanButton = (label: boolean) => (
    <Button
      variant={label ? "outline" : "ghost"}
      size={label ? "default" : "icon-lg"}
      aria-label={label ? undefined : "Check servers"}
      disabled={a.scanning}
      onClick={() => a.scan()}
    >
      <RefreshCw
        className={cn(!label && "size-5", a.scanning && "animate-spin")}
      />
      {label && "Check servers"}
    </Button>
  )

  const header = phone ? (
    <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
      <h1 className="text-heading font-light">Applications</h1>
      <HelpButton
        href={guideHref("applications")}
        label="Applications guide"
        className="ms-auto"
      />
      {can.runs && scanButton(false)}
      {can.recipes && (
        <Button
          size="icon-lg"
          aria-label="New application"
          className="rounded-full"
          onClick={newRecipe}
        >
          <Plus className="size-5" />
        </Button>
      )}
    </header>
  ) : null

  return (
    <>
      {header}
      <div
        className={cn(
          "flex flex-col pb-24",
          phone ? "pt-4" : "gap-4 px-6 pt-5",
        )}
      >
        <Bar
          phone={phone}
          tab={current}
          action={
            (can.runs || can.recipes) && (
              <>
                {can.runs && scanButton(true)}
                {can.recipes && (
                  <Button onClick={newRecipe}>
                    <Plus />
                    New application
                  </Button>
                )}
              </>
            )
          }
        />
        {current === "catalog" && <CatalogPanel phone={phone} />}
        {current === "installed" && <InstalledPanel phone={phone} />}
        {current === "updates" && <UpdatesTab phone={phone} />}
        {current === "activity" && (
          <div className={phone ? undefined : "flex flex-col gap-2"}>
            <RunsPanel phone={phone} q={q} state={runs} />
          </div>
        )}
      </div>
    </>
  )
}

function Count({ n, tone }: { n: number; tone?: "brand" }) {
  if (!n) return null
  return (
    <span
      className={cn(
        "ms-1.5 text-caption",
        tone === "brand" ? "text-brand" : "text-ash",
      )}
    >
      {n}
    </span>
  )
}

function Bar({
  phone,
  tab,
  action,
}: {
  phone: boolean
  tab: Tab
  action?: ReactNode
}) {
  const can = useSoftwareCan()
  const { workspace } = useWorkspace()
  const installs = useInstalls(workspace?.id)
  const [{ q, show, runs }, setFilters] = useApplicationsFilters()
  const items = installs.data?.items ?? []
  const hosts = installs.data?.hosts ?? []
  const counts: Partial<Record<Tab, ReactNode>> = {
    installed: <Count n={items.length} />,
    updates: <Count n={updateCount(items, hosts)} tone="brand" />,
  }
  const shown = (["catalog", "installed", "updates", "activity"] as const)
    .filter((t) => t !== "activity" || can.runs)
    .map((t) => ({
      value: t,
      label: (
        <>
          {tabLabels[t]}
          {counts[t]}
        </>
      ),
    }))
  const tabSwitch = (
    <Segmented
      label="Show"
      items={shown}
      value={tab}
      onChange={(t) =>
        setFilters({
          tab: t === "catalog" ? null : t,
          show: null,
          runs: null,
          cat: null,
        })
      }
    />
  )
  const searchLabel = {
    catalog: "Search applications",
    installed: "Search installed",
    updates: "Search updates",
    activity: "Search activity",
  }[tab]
  const search = (
    <SearchBox
      value={q}
      onChange={(v) => setFilters({ q: v || null })}
      placeholder={searchLabel}
      label={searchLabel}
      className={phone ? "min-w-0 flex-1" : undefined}
    />
  )
  const filter =
    tab === "installed" ? (
      <Segmented
        label="Which"
        items={(["all", "updates", "problems"] as const).map((v) => ({
          value: v,
          label: showLabels[v],
        }))}
        value={show}
        onChange={(s) => setFilters({ show: s === "all" ? null : s })}
      />
    ) : tab === "activity" ? (
      <Segmented
        label="State"
        items={(["all", "running", "failed", "succeeded"] as const).map(
          (v) => ({ value: v, label: runShowLabels[v] }),
        )}
        value={runs}
        onChange={(s) => setFilters({ runs: s === "all" ? null : s })}
      />
    ) : null

  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pb-3">
        {search}
        <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
          {tabSwitch}
          {filter}
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabSwitch}
      <span className="mx-1 h-5 w-px bg-border" />
      {search}
      {filter}
      {action && <div className="ms-auto flex gap-2">{action}</div>}
    </div>
  )
}

function InstalledPanel({ phone }: { phone: boolean }) {
  const { workspace } = useWorkspace()
  const can = useSoftwareCan()
  const a = useSoftwareActions()
  const installs = useInstalls(workspace?.id)
  const catalog = useCatalog(workspace?.id)
  const [{ q, show }, setFilters] = useApplicationsFilters()

  if (installs.isPending) return <Placeholder phone={phone} />
  if (installs.isError && !installs.data)
    return <Failed error={installs.error} onRetry={() => installs.refetch()} />
  const all = installs.data.items
  if (all.length === 0)
    return <NoInstalls onScan={can.runs ? () => a.scan() : undefined} />
  const items = sortInstalls(
    all.filter(
      (i) =>
        matchInstall(i, q) &&
        (show === "all" ||
          (show === "updates" ? i.update_available : installProblem(i))),
    ),
  )
  if (items.length === 0) {
    return (
      <Empty
        icon={RefreshCw}
        title={
          show === "updates"
            ? "No update waiting"
            : show === "problems"
              ? "No problem"
              : "Nothing matches"
        }
        body="Try other words or show everything."
        action={
          <Button
            variant="outline"
            className="h-11 md:h-9"
            onClick={() => setFilters({ q: null, show: null })}
          >
            Show everything
          </Button>
        }
      />
    )
  }
  const recipes = catalog.data?.items ?? []
  return phone ? (
    <InstallRows items={items} recipes={recipes} />
  ) : (
    <InstallsTable items={items} recipes={recipes} />
  )
}

function UpdatesTab({ phone }: { phone: boolean }) {
  const { workspace } = useWorkspace()
  const installs = useInstalls(workspace?.id)
  const catalog = useCatalog(workspace?.id)
  const [{ q }] = useApplicationsFilters()

  if (installs.isPending) return <Placeholder phone={phone} />
  if (installs.isError && !installs.data)
    return <Failed error={installs.error} onRetry={() => installs.refetch()} />
  const words = q.trim().toLowerCase()
  return (
    <UpdatesPanel
      phone={phone}
      items={installs.data.items.filter((i) => matchInstall(i, q))}
      hosts={installs.data.hosts.filter(
        (h) => !words || h.server_name.toLowerCase().includes(words),
      )}
      recipes={catalog.data?.items ?? []}
    />
  )
}
