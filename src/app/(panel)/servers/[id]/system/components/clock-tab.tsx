"use client"

import { Clock, RefreshCcw, Server as ServerIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import type { ClockOverview } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useClock, useConfigWrite } from "../../components/config/api"
import { clean, isHostname, ListEdit } from "../../components/config/fields"
import { HistoryButton } from "../../components/config/history"
import { useServerPage } from "../../components/server-page"
import { ConfigBar } from "../../network/components/network-view"
import { NotYet, RefreshButton } from "../../network/components/refresh"
import { SystemTabs } from "./system-view"

const serviceText: Record<string, string> = {
  chrony: "chrony",
  timesyncd: "systemd-timesyncd",
  ntpd: "ntpd",
  none: "nothing",
}

const zones = (() => {
  try {
    return Intl.supportedValuesOf("timeZone")
  } catch {
    return [] as string[]
  }
})()

export function ClockTab() {
  const { server } = useServerPage()
  const q = useClock(server.id)
  const refresh = (
    <RefreshButton busy={q.isFetching} onClick={() => q.refetch()} />
  )
  if (!q.data)
    return (
      <>
        <ConfigBar tabs={<SystemTabs />} actions={refresh} />
        <NotYet error={q.error} what="the clock" retry={() => q.refetch()} />
      </>
    )
  const o = q.data
  return (
    <>
      <ConfigBar
        tabs={<SystemTabs />}
        status={<>Server time {o.local_time.replace("T", " ")}</>}
        actions={
          <>
            <HistoryButton area="clock" />
            {refresh}
          </>
        }
      />
      <div className="grid gap-4 max-md:px-4 max-md:pt-4 lg:grid-cols-3">
        <NameCard key={`n${o.hostname}`} o={o} />
        <ZoneCard key={`z${o.timezone}`} o={o} />
        <SyncCard key={`s${o.revision}`} o={o} />
      </div>
    </>
  )
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Clock
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border p-6 max-md:p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
          <Icon className="size-5" />
        </span>
        <h2 className="text-body font-medium">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function NameCard({ o }: { o: ClockOverview }) {
  const { server, can } = useServerPage()
  const write = useConfigWrite(server.id)
  const [name, setName] = useState(o.hostname)
  const [fix, setFix] = useState(true)
  const editable = can("engineer") && o.writable
  const bad = name.trim() !== "" && !isHostname(name.trim())
  return (
    <Card icon={ServerIcon} title="Hostname">
      <Field
        label="Name"
        error={bad ? "Letters, digits, hyphens and dots; no spaces" : undefined}
        hint="The server's own name. Morche's name for it stays as it is."
      >
        {(p) => (
          <Input
            {...p}
            value={name}
            disabled={!editable}
            onChange={(e) => setName(e.target.value)}
            className="font-mono"
            autoCapitalize="off"
          />
        )}
      </Field>
      {editable && (
        <>
          {/* biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox inside is the control */}
          <label className="flex items-start gap-2 text-body-sm">
            <Checkbox
              checked={fix}
              onCheckedChange={(v) => setFix(!!v)}
              className="mt-0.5"
            />
            Point 127.0.1.1 in /etc/hosts at the new name (recommended: sudo
            slows down otherwise)
          </label>
          <Button
            className="self-end"
            disabled={
              bad ||
              name.trim() === o.hostname ||
              !name.trim() ||
              write.isPending
            }
            onClick={() =>
              write.mutate(
                {
                  kind: "hostname",
                  body: { hostname: name.trim(), fix_hosts: fix },
                },
                {
                  onSuccess: () => toast.success(`Renamed to ${name.trim()}`),
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            Rename
          </Button>
        </>
      )}
    </Card>
  )
}

function ZoneCard({ o }: { o: ClockOverview }) {
  const { server, can } = useServerPage()
  const write = useConfigWrite(server.id)
  const [zone, setZone] = useState(o.timezone)
  const editable = can("engineer") && o.writable
  const known =
    zones.length === 0 ||
    zones.includes(zone) ||
    zone === "UTC" ||
    zone.startsWith("Etc/")
  return (
    <Card icon={Clock} title="Time zone">
      <Field
        label="Zone"
        hint={`Now ${o.timezone}. Logs and cron jobs follow it.`}
        error={known ? undefined : "Not a time zone name"}
      >
        {(p) => (
          <>
            <Input
              {...p}
              list="morche-zones"
              value={zone}
              disabled={!editable}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Asia/Tehran"
            />
            <datalist id="morche-zones">
              {zones.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          </>
        )}
      </Field>
      {editable && (
        <Button
          className="self-end"
          disabled={!known || !zone || zone === o.timezone || write.isPending}
          onClick={() =>
            write.mutate(
              { kind: "clock", body: { revision: o.revision, timezone: zone } },
              {
                onSuccess: () => toast.success(`Time zone set to ${zone}`),
                onError: (e) => e.status !== 409 && toast.error(e.message),
              },
            )
          }
        >
          Set time zone
        </Button>
      )}
    </Card>
  )
}

function SyncCard({ o }: { o: ClockOverview }) {
  const { server, can } = useServerPage()
  const write = useConfigWrite(server.id)
  const [servers, setServers] = useState(o.servers)
  const editable = can("engineer") && o.writable
  const s = clean(servers)
  const dirty = s.join() !== o.servers.join()
  const bad = s.some((x) => !isHostname(x) && !/^[\d.:a-f]+$/i.test(x))
  const off = o.offset_ms
  return (
    <Card icon={RefreshCcw} title="Time sync">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "text-body-sm font-medium",
            o.synced ? "text-success" : "text-warning",
          )}
        >
          {o.service === "none"
            ? "No time sync service"
            : o.synced
              ? "In step"
              : "Not in step"}
        </span>
        <span className="text-caption text-muted-foreground">
          {serviceText[o.service]}
          {off != null &&
            ` · ${Math.abs(off) < 1 ? `${off.toFixed(2)} ms` : `${Math.round(off)} ms`} off`}
        </span>
        {o.can_ntp && editable && (
          <Switch
            className="ms-auto"
            aria-label="Time sync"
            checked={o.ntp}
            onCheckedChange={(v) =>
              write.mutate(
                { kind: "clock", body: { revision: o.revision, ntp: v } },
                { onError: (e) => toast.error(e.message) },
              )
            }
          />
        )}
      </div>
      {o.can_set_servers && (
        <Field
          label="Time servers"
          hint="Asked in turn. Pool names (pool.ntp.org) work too."
        >
          {() => (
            <ListEdit
              values={servers}
              onChange={setServers}
              placeholder="time.cloudflare.com"
              addLabel="Add a server"
              disabled={!editable}
            />
          )}
        </Field>
      )}
      {editable && (
        <div className="flex justify-end gap-2">
          {o.service !== "none" && (
            <Button
              variant="outline"
              disabled={write.isPending}
              onClick={() =>
                write.mutate(
                  { kind: "sync-clock" },
                  {
                    onSuccess: () =>
                      toast.success("Asked the time servers again"),
                    onError: (e) => toast.error(e.message),
                  },
                )
              }
            >
              Sync now
            </Button>
          )}
          {o.can_set_servers && (
            <Button
              disabled={!dirty || bad || s.length === 0 || write.isPending}
              onClick={() =>
                write.mutate(
                  { kind: "clock", body: { revision: o.revision, servers: s } },
                  {
                    onSuccess: () => toast.success("Time servers saved"),
                    onError: (e) => e.status !== 409 && toast.error(e.message),
                  },
                )
              }
            >
              Save servers
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
