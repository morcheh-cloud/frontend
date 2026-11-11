"use client"

import { MonitorPlay, RefreshCw, Settings2 } from "lucide-react"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { type ReactNode, useDeferredValue, useState } from "react"

import {
  Failed,
  Placeholder,
} from "@/app/(panel)/scripts/components/scripts-view"
import {
  Empty,
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  useRecordingSettings,
  useRecordings,
  useServerRecordings,
} from "../api"
import { RecordingRows, RecordingTable } from "./recording-list"
import { useRecordingsActions, useRecordingsCan } from "./recordings-actions"

const filters = {
  q: parseAsString.withDefault(""),
  who: parseAsStringLiteral(["everyone", "mine"] as const).withDefault(
    "everyone",
  ),
}

export const useRecordingFilters = () =>
  useQueryStates(filters, { history: "replace" })

const PAGE = 50

// The recordings of a workspace (/recordings) or of one server (its tab):
// one toolbar row, then the list.
export function RecordingsBrowser({
  workspace,
  serverId,
  phone,
  leading,
  trailing,
}: {
  workspace: { id: string; name: string }
  // Only this server's.
  serverId?: string
  phone: boolean
  // The tabs, at the start of the bar.
  leading?: ReactNode
  // Extra buttons at the end of the bar.
  trailing?: ReactNode
}) {
  const a = useRecordingsActions()
  const can = useRecordingsCan(workspace.id)
  const [{ q, who }, setFilters] = useRecordingFilters()
  const [pages, setPages] = useState(1)
  const query = {
    q: useDeferredValue(q.trim()) || undefined,
    mine: who === "mine" || undefined,
    limit: PAGE * pages,
  }
  const ws = useRecordings(serverId ? undefined : workspace.id, query)
  const server = useServerRecordings(serverId ?? "", query, !!serverId)
  const list = serverId ? server : ws
  const settings = useRecordingSettings(workspace.id).data
  const everyone = list.data?.everyone

  const status = settings && (
    <span className="text-caption text-ash">
      {settings.enabled
        ? `Recording on · kept ${settings.keep_days} days`
        : "Recording is off"}
    </span>
  )
  const search = (
    <SearchBox
      value={q}
      onChange={(v) => setFilters({ q: v || null })}
      placeholder="Search recordings"
      label="Search recordings"
      className={phone ? "min-w-0 flex-1" : undefined}
    />
  )
  const whoSwitch = everyone && (
    <Segmented
      label="Whose"
      items={[
        { value: "everyone" as const, label: "Everyone" },
        { value: "mine" as const, label: "Mine" },
      ]}
      value={who}
      onChange={(v) => setFilters({ who: v === "everyone" ? null : v })}
    />
  )
  const refresh = (
    <Button
      variant="outline"
      size="icon"
      className="max-md:size-11 md:size-9"
      aria-label="Refresh"
      title="Refresh"
      disabled={list.isFetching}
      onClick={() => list.refetch()}
    >
      <RefreshCw className={cn(list.isFetching && "animate-spin")} />
    </Button>
  )
  const settingsButton = can.manage && (
    <Button
      variant="outline"
      size={phone ? "icon-lg" : "default"}
      className="md:h-9"
      aria-label="Recording settings"
      onClick={() => a.settings(workspace)}
    >
      <Settings2 />
      {!phone && "Settings"}
    </Button>
  )

  const bar = phone ? (
    <div className="flex flex-col gap-3 px-4 pb-3">
      {leading}
      <div className="flex items-center gap-2">
        {search}
        {refresh}
        {settingsButton}
        {trailing}
      </div>
      {(whoSwitch || status) && (
        <div className="-mx-4 flex [scrollbar-width:none] items-center gap-3 overflow-x-auto px-4">
          {whoSwitch}
          {status}
        </div>
      )}
    </div>
  ) : (
    <div className="@container flex flex-wrap items-center gap-2">
      {leading}
      {leading && <span className="mx-1 h-5 w-px bg-border" />}
      {whoSwitch}
      {whoSwitch && <span className="mx-1 h-5 w-px bg-border" />}
      {search}
      <span className="ms-auto hidden @2xl:inline">{status}</span>
      {refresh}
      {settingsButton}
      {trailing}
    </div>
  )

  let body: ReactNode
  const items = list.data?.items ?? []
  if (list.isPending) body = <Placeholder phone={phone} />
  else if (list.isError && !list.data)
    body = <Failed error={list.error} onRetry={() => list.refetch()} />
  else if (items.length === 0 && (q || who === "mine"))
    body = (
      <Empty
        icon={MonitorPlay}
        title="No matching recordings"
        body="Try another search."
        action={
          <Button
            variant="outline"
            className="h-11 md:h-9"
            onClick={() => setFilters({ q: null, who: null })}
          >
            Clear filters
          </Button>
        }
      />
    )
  else if (items.length === 0)
    body = (
      <Empty
        icon={MonitorPlay}
        title={
          settings && !settings.enabled
            ? "Terminal recording is off"
            : "No recordings yet"
        }
        body={
          settings && !settings.enabled
            ? can.manage
              ? "Turn it on and every terminal opened on this workspace's servers is saved, to replay later: what each shell printed, never what was typed."
              : "An Owner of this workspace can turn it on. Then every terminal opened on its servers is saved, to replay later."
            : everyone
              ? "Each terminal opened from now on shows up here once it starts."
              : "Terminals you open from now on show up here. Owners of the workspace see everyone's."
        }
        action={
          can.manage &&
          settings &&
          !settings.enabled && (
            <Button
              className="h-11 w-full md:h-9 md:w-auto"
              onClick={() => a.settings(workspace)}
            >
              <Settings2 />
              Turn on recording
            </Button>
          )
        }
      />
    )
  else {
    const more = (list.data?.total ?? 0) > items.length && (
      <div className={cn("flex justify-center", phone ? "py-4" : "pt-2")}>
        <Button
          variant="outline"
          className="h-11 md:h-9"
          disabled={list.isFetching}
          onClick={() => setPages((n) => n + 1)}
        >
          {list.isFetching ? "Loading…" : "Show more"}
        </Button>
      </div>
    )
    body = (
      <>
        {phone ? (
          <RecordingRows items={items} showServer={!serverId} />
        ) : (
          <RecordingTable items={items} showServer={!serverId} />
        )}
        {more}
      </>
    )
  }

  return (
    <>
      {bar}
      {body}
    </>
  )
}
