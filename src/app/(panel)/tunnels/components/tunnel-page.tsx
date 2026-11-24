"use client"

import {
  BellRing,
  Cable,
  ChevronLeft,
  CircleAlert,
  Database,
  Ellipsis,
  HardDrive,
  HeartPulse,
  Loader2,
  MonitorCog,
  Pencil,
  Plug,
  Server,
  ShieldCheck,
  Unplug,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useAlertRules } from "@/app/(panel)/alerts/api"
import { newRuleHref } from "@/app/(panel)/alerts/components/rule-links"
import { tunnelPresets } from "@/app/(panel)/alerts/components/rules-meta"
import {
  Empty,
  type Item,
  ItemMenu,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { vmsHref } from "@/app/(panel)/vms/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useFollowWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBackOr } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import type { Tunnel } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useServerPicks, useTunnel, useTunnelLog, useTunnelUsers } from "../api"
import {
  choiceOf,
  editTunnelHref,
  isVpn,
  pinIn,
  statusMeta,
  TunnelIcon,
  targetOf,
  toneDot,
  toneText,
  tunnelHref,
} from "./meta"
import { useTunnelCan } from "./permissions"
import { useTunnelActions, useTunnelMenu } from "./tunnel-actions"

export function TunnelPageFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <TunnelPage id={id} />
}

function TunnelPage({ id }: { id: string }) {
  const phone = useIsPhone()
  const q = useTunnel(id)
  useFollowWorkspace(q.tunnel?.workspace_id)
  usePageCrumbs(
    q.tunnel ? [{ href: tunnelHref(id), label: q.tunnel.name }] : [],
  )
  if (phone === null) return null
  if (q.pending)
    return (
      <div className="flex flex-col gap-4 p-4 md:px-6 md:pt-5">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-60 w-full rounded-2xl" />
      </div>
    )
  if (!q.tunnel)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={Cable}
          title="This tunnel isn't here"
          body={
            q.error?.message ??
            "It was removed, or you don't have access to it."
          }
          action={
            <Button
              variant="outline"
              render={<Link href="/tunnels" />}
              nativeButton={false}
            >
              Back to tunnels
            </Button>
          }
        />
      </div>
    )
  return <Page t={q.tunnel} tools={q.tools} phone={phone} />
}

function Page({
  t,
  tools,
  phone,
}: {
  t: Tunnel
  tools?: Record<string, boolean>
  phone: boolean
}) {
  const a = useTunnelActions()
  const can = useTunnelCan()
  const menu = useTunnelMenu()
  const router = useRouter()
  const leave = useBackOr("/tunnels")
  const picks = useServerPicks()
  const jumpName = picks.data?.items.find(
    (s) => s.id === t.config.server_id,
  )?.name
  const m = statusMeta[t.status]
  const open = t.status === "connected" || t.status === "connecting"
  const busy = a.busy.has(t.id) || t.status === "connecting"
  const ch = choiceOf(t)
  const tool = ch.tool && tools?.[t.kind] === false ? ch.tool : null
  const pin = t.kind === "openconnect" ? pinIn(t.status_message) : undefined
  const [sheet, setSheet] = useOpen("tunnel-page-sheet")

  const toggle = can(t, "operator") ? (
    open ? (
      <Button
        variant="outline"
        className={phone ? "h-11 flex-1" : "h-9"}
        disabled={a.busy.has(t.id)}
        onClick={() => a.disconnect(t)}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Unplug />}
        Disconnect
      </Button>
    ) : (
      <Button
        className={phone ? "h-11 flex-1" : "h-9"}
        disabled={busy || !!tool}
        onClick={() => a.connect(t)}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Plug />}
        Connect now
      </Button>
    )
  ) : null

  const hero = (
    <section
      className={cn(
        "relative flex flex-col gap-5 overflow-hidden border-border bg-card",
        phone ? "border-b px-4 py-5" : "rounded-3xl border p-8",
      )}
    >
      <div className="flex min-w-0 items-start gap-4">
        <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
          <TunnelIcon tunnel={t} className="size-6" />
          <span
            aria-hidden
            className={cn(
              "absolute -end-1 -bottom-1 size-4 rounded-full border-[3px] border-card",
              toneDot[m.tone],
            )}
          />
        </span>
        <div className="min-w-0 flex-1">
          <h1
            className={cn(
              "truncate font-light",
              phone ? "text-subheading" : "text-heading",
            )}
          >
            {t.name}
          </h1>
          <p className="truncate text-body-sm text-muted-foreground">
            {t.kind_label}
            {targetOf(t, jumpName) && ` · ${targetOf(t, jumpName)}`}
          </p>
        </div>
        {!phone && (
          <div className="flex shrink-0 items-center gap-2">
            {toggle}
            {can(t, "owner") && (
              <Button
                variant="outline"
                className="h-9"
                render={<Link href={editTunnelHref(t.id)} />}
                nativeButton={false}
              >
                <Pencil />
                Edit
              </Button>
            )}
            <ItemMenu
              groups={menu(t, { onPage: true })}
              label="More"
              trigger={
                <Button variant="ghost" size="icon" aria-label="More">
                  <Ellipsis />
                </Button>
              }
            />
          </div>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="State">
          <span
            className={cn("inline-flex items-center gap-1.5", toneText[m.tone])}
          >
            <span
              aria-hidden
              className={cn("size-2 rounded-full", toneDot[m.tone])}
            />
            {m.label}
          </span>
          <span className="block text-caption text-ash">
            {t.status_at ? `since ${timeAgo(t.status_at)}` : "never opened"}
          </span>
        </Tile>
        <Tile label={isVpn(t.kind) ? "Morche's address" : "Open connections"}>
          {isVpn(t.kind) ? (
            <span className="font-mono">
              {(t.status === "connected" && t.address) || "—"}
            </span>
          ) : (
            <span className="tabular-nums">{t.conns}</span>
          )}
          {isVpn(t.kind) && (
            <span className="block text-caption text-ash">
              {t.conns} {t.conns === 1 ? "connection" : "connections"} open
            </span>
          )}
        </Tile>
        <Tile label="Goes through it">
          <span className="tabular-nums">{t.server_count + t.other_count}</span>
          <span className="block text-caption text-ash">
            {t.server_count} {t.server_count === 1 ? "server" : "servers"}
            {t.other_count > 0 && ` · ${t.other_count} more`}
          </span>
        </Tile>
        <Tile label="Last connected">
          {t.last_connected_at ? timeAgo(t.last_connected_at) : "Never"}
        </Tile>
      </dl>

      {(t.status === "failed" || tool) && (
        <div className="flex gap-2.5 rounded-xl bg-destructive/5 px-3 py-2.5 text-body-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="break-words text-foreground">
              {tool
                ? `${tool} isn't installed on the machine Morche runs on.`
                : t.status_message}
            </p>
            {pin && can(t, "owner") && (
              <p className="mt-1 text-caption text-muted-foreground">
                If that fingerprint is your VPN&apos;s, open Edit › More options
                and Test: it offers to trust it.
              </p>
            )}
          </div>
        </div>
      )}

      {phone && (
        <div className="flex gap-2">
          {toggle}
          {can(t, "owner") && (
            <Button
              variant="outline"
              className="h-11 flex-1"
              onClick={() => router.push(editTunnelHref(t.id))}
            >
              <Pencil />
              Edit
            </Button>
          )}
        </div>
      )}
    </section>
  )

  return (
    <>
      {phone && (
        <header className="sticky top-0 z-10 flex h-14 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={leave}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <span className="min-w-0 flex-1 truncate text-body font-medium">
            {t.name}
          </span>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="More"
            onClick={() => setSheet(true)}
          >
            <Ellipsis className="size-5" />
          </Button>
        </header>
      )}
      <div
        className={cn(
          "flex flex-col",
          phone
            ? "pb-[calc(6rem+env(safe-area-inset-bottom))]"
            : "gap-6 px-6 pt-5 pb-24",
        )}
      >
        {hero}
        <div
          className={cn(
            "grid",
            !phone && "gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
          )}
        >
          <UsersCard t={t} phone={phone} />
          <SettingsCard t={t} jumpName={jumpName} phone={phone} />
        </div>
        <AlertCard t={t} phone={phone} />
        {can(t, "operator") && <LogCard t={t} phone={phone} />}
      </div>
      {phone && (
        <BottomSheet open={sheet} onOpenChange={setSheet} title={t.name}>
          <SheetItems
            groups={menu(t, { onPage: true }) as Item[][]}
            onOpenChange={setSheet}
          />
        </BottomSheet>
      )}
    </>
  )
}

function Tile({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-subtle p-4">
      <dt className="text-caption text-ash">{label}</dt>
      <dd className="mt-1 truncate text-body font-medium">{children}</dd>
    </div>
  )
}

function Card({
  title,
  id,
  phone,
  action,
  children,
}: {
  title: string
  id?: string
  phone: boolean
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className={cn(
        "flex min-w-0 flex-col gap-3 [contain:inline-size]",
        phone
          ? "border-b border-border px-4 py-5"
          : "rounded-2xl border border-border p-6",
      )}
    >
      <div className="flex items-center gap-2">
        <h2 className="text-body font-medium">{title}</h2>
        <span className="flex-1" />
        {action}
      </div>
      {children}
    </section>
  )
}

const userKinds = {
  server: {
    icon: Server,
    label: "Server",
    href: (id: string) => `/servers/${id}`,
  },
  database: {
    icon: Database,
    label: "Database",
    href: (id: string) => `/databases/${id}`,
  },
  cluster: {
    icon: MonitorCog,
    label: "Proxmox cluster",
    href: (id: string) => vmsHref("machines", { cluster: id }),
  },
  monitor: {
    icon: HeartPulse,
    label: "Monitor",
    href: (id: string) => `/monitoring/${id}`,
  },
  storage: {
    icon: HardDrive,
    label: "Storage",
    href: (id: string) => `/storage/${id}`,
  },
} as const

const goodStatus = ["online", "up", "connected"]
const quietStatus = ["unknown", "pending", ""]

function UsersCard({ t, phone }: { t: Tunnel; phone: boolean }) {
  const q = useTunnelUsers(t.id)
  const items = q.data?.items ?? []
  return (
    <Card
      title="What goes through it"
      phone={phone}
      action={
        items.length > 0 && (
          <span className="text-caption text-ash">{items.length}</span>
        )
      }
    >
      {q.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : items.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          Nothing yet. Pick{" "}
          <span className="font-medium text-foreground">{t.name}</span> under
          “Reach it through” when you add or edit a server, a database (by
          address), a Proxmox cluster, a storage, or a monitor checked from
          Morche.
        </p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {items.map((u) => {
            const k = userKinds[u.kind]
            return (
              <li key={`${u.kind}:${u.id}`}>
                <Link
                  href={k.href(u.id)}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-subtle"
                >
                  <k.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
                    {u.name}
                  </span>
                  <span className="truncate text-caption text-muted-foreground">
                    {k.label}
                  </span>
                  <span
                    role="img"
                    aria-label={u.status}
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      goodStatus.includes(u.status)
                        ? "bg-success"
                        : quietStatus.includes(u.status)
                          ? "bg-mist"
                          : "bg-destructive",
                    )}
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

// Whether a "Tunnel down" rule watches this workspace's tunnels, and the
// way to add one.
function AlertCard({ t, phone }: { t: Tunnel; phone: boolean }) {
  const rules = useAlertRules()
  const can = useTunnelCan()
  const watching = (rules.data ?? []).filter(
    (r) => r.metric === "tunnel_down" && r.enabled,
  )
  const state = watching
    .flatMap((r) => r.states)
    .find((s) => s.target_id === t.id)
  return (
    <Card title="Alerts" phone={phone}>
      {watching.length > 0 ? (
        <div className="flex items-start gap-3">
          <BellRing
            className={cn(
              "mt-0.5 size-4 shrink-0",
              state?.state === "firing" ? "text-destructive" : "text-success",
            )}
          />
          <p className="min-w-0 flex-1 text-body-sm text-muted-foreground">
            {state?.state === "firing"
              ? "Firing: it can't connect, and the rule's channels were told."
              : `Watched by ${watching.map((r) => r.name).join(", ")}: you're told when it can't connect${
                  t.server_count + t.other_count === 0
                    ? " (once something goes through it)"
                    : ""
                }.`}
          </p>
          <Button
            variant="ghost"
            className={phone ? "h-11" : "h-8"}
            render={<Link href={`/alerts?rule=${watching[0].id}`} />}
            nativeButton={false}
          >
            Open
          </Button>
        </div>
      ) : (
        <div className={cn("flex gap-3", phone ? "flex-col" : "items-center")}>
          <p className="min-w-0 flex-1 text-body-sm text-muted-foreground">
            Get told on Telegram, email or any channel when a tunnel something
            goes through can&apos;t connect.
          </p>
          {can(t, "engineer") && (
            <Button
              variant="outline"
              className={phone ? "h-11" : "h-9"}
              render={<Link href={newRuleHref({ preset: tunnelPresets[0] })} />}
              nativeButton={false}
            >
              <BellRing />
              Alert me when it fails
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

function SettingsCard({
  t,
  jumpName,
  phone,
}: {
  t: Tunnel
  jumpName?: string
  phone: boolean
}) {
  const c = t.config
  const rows: [string, string][] = []
  const push = (label: string, v?: string | number | boolean | null) => {
    if (v === undefined || v === null || v === "" || v === false) return
    rows.push([label, v === true ? "Yes" : String(v)])
  }
  switch (t.kind) {
    case "jump":
      push("Hops through", jumpName ?? c.server_id)
      break
    case "wireguard":
      push("Endpoint", c.endpoint)
      push("Address", c.addresses?.join(", "))
      push(
        "Allowed IPs",
        c.allowed_ips?.length ? c.allowed_ips.join(", ") : "Everything",
      )
      push("Server's key", c.peer_public_key)
      push("Preshared key", t.has_preshared_key && "Set")
      push("Keepalive", c.keepalive ? `${c.keepalive} s` : "25 s")
      break
    case "openvpn":
      push("Servers", t.remotes.join(", "))
      push("Username", c.username)
      break
    default:
      push("Address", c.host && `${c.host}${c.port ? `:${c.port}` : ""}`)
      push("Username", c.username)
      push("Login group", c.group)
      push("Over TLS", c.tls)
      push("Trusted certificate", c.server_cert)
      push("Untrusted certificate", c.ignore_cert && "Accepted")
  }
  if (isVpn(t.kind))
    push("DNS", (c.dns?.length ? c.dns : t.dns).join(", ") || "None")
  push("Note", t.description)
  return (
    <Card title="Settings" phone={phone}>
      <dl className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-4 gap-y-2 text-body-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-mono text-caption leading-5 break-all">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="flex items-center gap-1.5 text-caption text-ash">
        <ShieldCheck className="size-3.5" />
        Passwords and keys are kept encrypted and never shown.
      </p>
    </Card>
  )
}

function LogCard({ t, phone }: { t: Tunnel; phone: boolean }) {
  const q = useTunnelLog(t.id, true, t.status === "connecting")
  const lines = q.data?.lines ?? []
  const box = useRef<HTMLPreElement>(null)
  const [follow, setFollow] = useState(true)
  useEffect(() => {
    if (follow && box.current) box.current.scrollTop = box.current.scrollHeight
  })
  return (
    <Card
      id="log"
      title="Log"
      phone={phone}
      action={
        <span className="text-caption text-ash">
          {lines.length ? `${lines.length} lines since Morche started` : ""}
        </span>
      }
    >
      {lines.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          Nothing yet. It fills in when the tunnel opens.
        </p>
      ) : (
        <pre
          ref={box}
          onScroll={(e) => {
            const el = e.currentTarget
            setFollow(el.scrollHeight - el.scrollTop - el.clientHeight < 24)
          }}
          className="max-h-96 overflow-auto rounded-xl bg-subtle p-3 font-mono text-caption leading-5 whitespace-pre-wrap"
        >
          {lines.map((l, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: lines only grow at the end
            <span key={i} className="block">
              <span className="text-ash select-none">
                {new Date(l.at).toLocaleTimeString()}
                {"  "}
              </span>
              {l.text}
            </span>
          ))}
        </pre>
      )}
    </Card>
  )
}
