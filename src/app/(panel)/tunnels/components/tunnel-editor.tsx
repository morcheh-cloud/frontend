"use client"

import {
  Cable,
  ChevronLeft,
  CircleAlert,
  CircleCheck,
  FileUp,
  FlaskConical,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
  Callout,
  Section,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Pick } from "@/app/(panel)/monitoring/components/monitor-fields"
import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import {
  AsideCard,
  EditorLoading,
  EditorPage,
  SummaryList,
} from "@/components/editor-page"
import { Field } from "@/components/field"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useFollowWorkspace, useWorkspace } from "@/components/panel/workspace"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useBackOr } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { ApiError, fieldErrors } from "@/lib/api"
import type {
  TestResult,
  Tunnel,
  TunnelBody,
  TunnelConfig,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useSaveTunnel, useServerPicks, useTestTunnel, useTunnel } from "../api"
import {
  type Choice,
  choiceOf,
  choices,
  editTunnelHref,
  isVpn,
  TunnelIcon,
  tunnelHref,
} from "./meta"
import { useTunnelCan } from "./permissions"
import { ChoiceTiles } from "./tunnels-view"
import {
  ovpnEncryptedKey,
  ovpnNeedsLogin,
  ovpnRemotes,
  parseWireGuard,
} from "./wireguard-conf"

// The tunnel editor: /tunnels/new (?kind= picks one) and /tunnels/[id]/edit.
// A full page on desktop (EditorPage), a native screen on phones. Owner on
// the workspace.

type Draft = {
  choice: string
  name: string
  description: string
  host: string
  port: string
  username: string
  password: string
  tls: boolean
  serverId: string
  addresses: string
  peerPublicKey: string
  endpoint: string
  allowedIPs: string
  keepalive: string
  mtu: string
  privateKey: string
  presharedKey: string
  configFile: string
  passphrase: string
  group: string
  serverCert: string
  ignoreCert: boolean
  dns: string
}

type Errors = Record<string, string>

const list = (v: string) =>
  v
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean)

function draftOf(t?: Tunnel, choice?: string): Draft {
  const c = t?.config ?? {}
  return {
    choice: t ? choiceOf(t).value : (choice ?? "wireguard"),
    name: t?.name ?? "",
    description: t?.description ?? "",
    host: c.host ?? "",
    port: c.port ? String(c.port) : "",
    username: c.username ?? "",
    password: "",
    tls: c.tls ?? false,
    serverId: c.server_id ?? "",
    addresses: (c.addresses ?? []).join(", "),
    peerPublicKey: c.peer_public_key ?? "",
    endpoint: c.endpoint ?? "",
    allowedIPs: (c.allowed_ips ?? []).join(", "),
    keepalive: c.keepalive ? String(c.keepalive) : "",
    mtu: c.mtu ? String(c.mtu) : "",
    privateKey: "",
    presharedKey: "",
    configFile: "",
    passphrase: "",
    group: c.group ?? "",
    serverCert: c.server_cert ?? "",
    ignoreCert: c.ignore_cert ?? false,
    dns: (c.dns ?? []).join(", "),
  }
}

const choiceFor = (v: string) =>
  choices.find((c) => c.value === v) ?? choices[0]

function toBody(d: Draft): TunnelBody {
  const ch = choiceFor(d.choice)
  const t = (s: string) => s.trim()
  const n = (s: string) => (t(s) ? Number(s) : undefined)
  const config: TunnelConfig = {}
  const body: TunnelBody = {
    kind: ch.kind,
    name: t(d.name) || ch.label,
    description: t(d.description) || undefined,
    config,
  }
  switch (ch.kind) {
    case "jump":
      config.server_id = d.serverId
      break
    case "socks5":
    case "http":
      config.host = t(d.host)
      config.port = n(d.port)
      config.username = t(d.username) || undefined
      if (ch.kind === "http") config.tls = d.tls
      if (d.password) body.password = d.password
      break
    case "wireguard":
      config.addresses = list(d.addresses)
      config.peer_public_key = t(d.peerPublicKey)
      config.endpoint = t(d.endpoint)
      config.allowed_ips = list(d.allowedIPs)
      config.keepalive = n(d.keepalive)
      config.mtu = n(d.mtu)
      if (d.privateKey) body.private_key = t(d.privateKey)
      if (d.presharedKey) body.preshared_key = t(d.presharedKey)
      break
    case "openvpn":
      config.username = t(d.username) || undefined
      if (d.configFile) body.config_file = d.configFile
      if (d.password) body.password = d.password
      if (d.passphrase) body.passphrase = d.passphrase
      break
    case "openconnect":
      config.protocol = ch.protocol
      config.host = t(d.host)
      config.port = n(d.port)
      config.username = t(d.username)
      config.group = t(d.group) || undefined
      config.server_cert = t(d.serverCert) || undefined
      if (d.password) body.password = d.password
      break
    case "sstp":
      config.host = t(d.host)
      config.port = n(d.port)
      config.username = t(d.username)
      config.ignore_cert = d.ignoreCert
      if (d.password) body.password = d.password
      break
  }
  if (isVpn(ch.kind)) config.dns = list(d.dns)
  return body
}

const ipLike = /^[0-9a-f.:]+(\/\d{1,3})?$/i
const wgKey = /^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw480]=$/
const portOk = (v: string) =>
  !v.trim() || (Number(v) >= 1 && Number(v) <= 65535)

// Mirrors the backend's checks; saved secrets count as set.
function check(d: Draft, saved?: Tunnel): Errors {
  const e: Errors = {}
  const ch = choiceFor(d.choice)
  const keep = saved && saved.kind === ch.kind
  if (!portOk(d.port)) e["config.port"] = "1 to 65535"
  const badIP = list(d.dns).find((x) => !ipLike.test(x))
  if (badIP) e["config.dns"] = `“${badIP}” isn't an IP address`
  switch (ch.kind) {
    case "jump":
      if (!d.serverId) e["config.server_id"] = "Pick the server to hop through"
      break
    case "socks5":
    case "http":
      if (!d.host.trim()) e["config.host"] = "Enter the proxy's address"
      break
    case "wireguard": {
      if (!list(d.addresses).length)
        e["config.addresses"] = "Enter this side's address, like 10.0.0.2/32"
      const bad = list(d.addresses).find((x) => !ipLike.test(x))
      if (bad) e["config.addresses"] = `“${bad}” isn't an address`
      if (!wgKey.test(d.peerPublicKey.trim()))
        e["config.peer_public_key"] = "44 characters of base64, ending in ="
      if (!/^\S+:\d{1,5}$/.test(d.endpoint.trim()))
        e["config.endpoint"] = "host:port, like vpn.example.com:51820"
      const badA = list(d.allowedIPs).find((x) => !ipLike.test(x))
      if (badA) e["config.allowed_ips"] = `“${badA}” isn't an address range`
      if (!d.privateKey.trim() && !(keep && saved.has_private_key))
        e.private_key = "Paste this side's private key"
      else if (d.privateKey.trim() && !wgKey.test(d.privateKey.trim()))
        e.private_key = "44 characters of base64, ending in ="
      if (d.presharedKey.trim() && !wgKey.test(d.presharedKey.trim()))
        e.preshared_key = "44 characters of base64, ending in ="
      break
    }
    case "openvpn":
      if (!d.configFile.trim() && !(keep && saved.has_config_file))
        e.config_file = "Paste or upload the .ovpn file"
      else if (d.configFile.trim() && !ovpnRemotes(d.configFile).length)
        e.config_file = "The file has no remote line (the VPN server)"
      if (d.configFile && ovpnNeedsLogin(d.configFile) && !d.username.trim())
        e["config.username"] = "This VPN asks for a username and password"
      break
    case "openconnect":
    case "sstp":
      if (!d.host.trim()) e["config.host"] = "Enter the VPN server's address"
      if (!d.username.trim()) e["config.username"] = "Enter the username"
      if (!d.password && !(keep && saved.has_password))
        e.password = "Enter the password"
      if (
        d.serverCert.trim() &&
        !/^pin-sha256:[A-Za-z0-9+/]{43}=$/.test(d.serverCert.trim())
      )
        e["config.server_cert"] = "Looks like pin-sha256:… (44 characters)"
      break
  }
  return e
}

export function TunnelEditorFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <TunnelEditor id={id} />
}

export function TunnelEditor({ id }: { id?: string }) {
  const phone = useIsPhone()
  const params = useSearchParams()
  const q = useTunnel(id)
  if (phone === null) return null
  if (id && q.pending) return <Loading phone={phone} />
  if (id && !q.tunnel) {
    const gone =
      q.error instanceof ApiError && [403, 404].includes(q.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={Cable}
          title={gone ? "This tunnel isn't here" : "Couldn't load the tunnel"}
          body={
            gone
              ? "It was removed, or you don't have access to it."
              : q.error?.message
          }
          action={<BackToList />}
        />
      </div>
    )
  }
  const asked = params.get("kind")
  const choice = choices.find((c) => c.value === asked)?.value
  if (!id && !choice) return <PickKind phone={phone} />
  return (
    <Editor
      key={q.tunnel?.id ?? `new:${choice}`}
      saved={q.tunnel}
      choice={choice}
      tools={q.tools}
      phone={phone}
    />
  )
}

function BackToList() {
  return (
    <Button
      variant="outline"
      className="h-11 w-full md:h-9 md:w-auto"
      render={<Link href="/tunnels" />}
      nativeButton={false}
    >
      Back to tunnels
    </Button>
  )
}

// /tunnels/new without a kind: pick one first.
function PickKind({ phone }: { phone: boolean }) {
  const leave = useBackOr("/tunnels")
  usePageCrumbs([{ href: "/tunnels/new", label: "New tunnel" }])
  return (
    <div
      className={cn("flex flex-col gap-6", phone ? "p-4" : "px-6 pt-5 pb-24")}
    >
      {phone && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={leave}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="text-body font-medium">New tunnel</h1>
        </div>
      )}
      <div className="flex max-w-2xl flex-col gap-1">
        <h2 className="text-subheading font-normal">
          How are the servers reached?
        </h2>
        <p className="text-body-sm text-muted-foreground">
          Pick what you'd use from a laptop to get to them: a VPN client, a
          proxy or a server you'd ssh to first.
        </p>
      </div>
      <ChoiceTiles />
    </div>
  )
}

function scrollToProblem() {
  requestAnimationFrame(() =>
    document
      .querySelector("[aria-invalid=true], [data-error]")
      ?.scrollIntoView({ block: "center", behavior: "smooth" }),
  )
}

// One sentence on where to find what this kind asks for.
const setupHint: Record<string, string> = {
  wireguard:
    "Paste the client config your WireGuard server gave you (the .conf file); the fields fill in by themselves.",
  openvpn:
    "Upload or paste the .ovpn file your VPN gave you. Certificates must be inside it, not paths to files.",
  openconnect:
    "The address you'd type in the VPN client, and your login. One-time codes aren't supported.",
  sstp: "The SSTP server's address and your login (MS-CHAPv2).",
  jump: "Morche signs in to that server with its saved login and opens connections from there, like ssh -J.",
  socks5: "The proxy's address. A login is optional.",
  http: "A proxy that supports CONNECT (Squid, tinyproxy…). A login is optional.",
}

function Editor({
  saved,
  choice,
  tools,
  phone,
}: {
  saved: Tunnel | undefined
  choice: string | undefined
  tools: Record<string, boolean> | undefined
  phone: boolean
}) {
  const { workspace } = useWorkspace()
  useFollowWorkspace(saved?.workspace_id)
  const ws = saved?.workspace_id ?? workspace?.id ?? ""
  const can = useTunnelCan()
  const leave = useBackOr(saved ? tunnelHref(saved.id) : "/tunnels")
  const save = useSaveTunnel()
  const test = useTestTunnel()
  const picks = useServerPicks()

  const [d, setD] = useState<Draft>(() => draftOf(saved, choice))
  const [initial] = useState(() => JSON.stringify(draftOf(saved, choice)))
  const [errors, setErrors] = useState<Errors>({})
  const [target, setTarget] = useState("")
  const [tested, setTested] = useState<TestResult>()
  const dirty = JSON.stringify(d) !== initial
  const ch = choiceFor(d.choice)

  usePageCrumbs(
    saved
      ? [
          { href: tunnelHref(saved.id), label: saved.name },
          { href: editTunnelHref(saved.id), label: "Edit" },
        ]
      : [{ href: "/tunnels/new", label: "New tunnel" }],
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const set = (patch: Partial<Draft>) => {
    setD((x) => ({ ...x, ...patch }))
    setTested(undefined)
    setErrors({})
  }

  const failed = (err: Error) => {
    const e = fieldErrors(err)
    setErrors(e)
    toast.error(Object.values(e)[0] ?? err.message)
    scrollToProblem()
  }

  const validate = () => {
    const e = check(d, saved)
    setErrors(e)
    const first = Object.values(e)[0]
    if (first) {
      toast.error(first)
      scrollToProblem()
      return false
    }
    return true
  }

  const submit = () => {
    if (!validate()) return
    save.mutate(
      { id: saved?.id, body: toBody(d) },
      {
        onSuccess: (t) => {
          toast.success(saved ? `${t.name} saved` : `${t.name} added`)
          leave()
        },
        onError: failed,
      },
    )
  }

  const runTest = () => {
    if (!validate()) return
    setTested(undefined)
    test.mutate(
      {
        ...toBody(d),
        tunnel_id: saved?.id,
        target: target.trim() || undefined,
      },
      {
        onSuccess: (r) => {
          setTested(r)
          if (r.ok) toast.success(r.message)
          else toast.error(r.message)
        },
        onError: failed,
      },
    )
  }

  if (saved ? !can(saved, "owner") : !can({ workspace_id: ws }, "owner")) {
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={Cable}
          title="You can't change tunnels here"
          body="Tunnels need Owner access to the workspace: they reach into other networks."
          action={<BackToList />}
        />
      </div>
    )
  }

  const f = (key: string) => errors[key]
  const missing = ch.tool && tools?.[ch.kind] === false ? ch.tool : null
  const name = d.name.trim() || ch.label
  const servers = picks.data?.items ?? []
  const keepSecret = (has: boolean | undefined) =>
    saved && saved.kind === ch.kind && has ? "Saved: blank keeps it" : undefined

  const sections = (
    <>
      <Section
        title="Kind"
        hint={
          saved
            ? "A tunnel keeps its kind. For another kind, add another tunnel."
            : "What you'd use from a laptop to reach these servers."
        }
        phone={phone}
      >
        {saved ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-subtle px-3 py-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
              <ch.icon className="size-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-body-sm font-medium">
                {ch.label}
              </span>
              <span className="block truncate text-caption text-muted-foreground">
                {ch.short}
              </span>
            </span>
          </div>
        ) : (
          <ChoiceTiles
            value={d.choice}
            onPick={(c: Choice) => set({ choice: c.value })}
          />
        )}
      </Section>

      <Section title="Connection" hint={setupHint[ch.kind]} phone={phone}>
        {missing && (
          <Callout icon={<ShieldAlert />} tone="warning">
            {missing} isn't installed on the machine Morche runs on, so this
            tunnel can't connect yet. The official Docker image has it.
          </Callout>
        )}
        <KindFields
          d={d}
          set={set}
          f={f}
          ch={ch}
          phone={phone}
          saved={saved}
          keepSecret={keepSecret}
          servers={servers.map((s) => ({
            value: s.id,
            label: s.name,
            detail: s.host,
          }))}
        />
      </Section>

      {isVpn(ch.kind) && (
        <Section
          title="Names inside the VPN"
          hint="To reach servers by name inside the VPN. Blank = the name servers the VPN hands out; names Morche can't look up there are looked up as usual."
          phone={phone}
        >
          <Field
            label="DNS servers"
            error={f("config.dns")}
            hint="Up to four, separated by commas."
          >
            {(p) => (
              <Input
                {...p}
                value={d.dns}
                onChange={(e) => set({ dns: e.target.value })}
                placeholder="10.0.0.53"
                autoCapitalize="none"
                className="font-mono placeholder:text-ash"
              />
            )}
          </Field>
        </Section>
      )}

      <Section
        title="Test it"
        hint="Connects with what's on this page, saved or not, and reaches one address through it. Nothing is saved."
        phone={phone}
      >
        <div className={cn("flex gap-2", phone ? "flex-col" : "items-end")}>
          <Field
            label="Reach"
            hint="A server behind it, host:port. Blank = only connect."
            className="min-w-0 flex-1"
          >
            {(p) => (
              <Input
                {...p}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="10.0.0.5:22"
                autoCapitalize="none"
                className="font-mono placeholder:text-ash"
              />
            )}
          </Field>
          <Button
            variant="outline"
            className={phone ? "h-11" : "mb-6 h-10"}
            disabled={test.isPending}
            onClick={runTest}
          >
            <FlaskConical />
            {test.isPending ? "Connecting…" : "Test"}
          </Button>
        </div>
        {tested && (
          <TestOutcome
            r={tested}
            onTrust={
              ch.kind === "openconnect" && tested.pin
                ? () => {
                    setD((x) => ({ ...x, serverCert: tested.pin ?? "" }))
                    setTested(undefined)
                    toast.success("Certificate trusted. Test again to connect.")
                  }
                : undefined
            }
          />
        )}
        {saved?.status === "failed" && !tested && (
          <Callout icon={<CircleAlert />} tone="warning">
            The last try failed
            {saved.status_at ? ` ${timeAgo(saved.status_at)}` : ""}:{" "}
            {saved.status_message}
          </Callout>
        )}
      </Section>

      <Section
        title="Name"
        hint="How it shows when picking how a server is reached."
        phone={phone}
      >
        <Field label="Name" error={f("name")}>
          {(p) => (
            <Input
              {...p}
              value={d.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={`${ch.label}: office`}
              maxLength={100}
              className="placeholder:text-ash"
            />
          )}
        </Field>
        <Field label="Note" hint="Optional: who runs it, what's behind it.">
          {(p) => (
            <Textarea
              {...p}
              value={d.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={2}
              maxLength={500}
            />
          )}
        </Field>
      </Section>
    </>
  )

  const label = saved ? "Save" : "Add tunnel"
  const blocked = save.isPending || (!!saved && !dirty)

  if (phone) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={leave}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {saved ? "Edit tunnel" : "New tunnel"}
          </h1>
          <Button
            variant="ghost"
            className="h-11 px-3 text-brand"
            disabled={blocked}
            onClick={submit}
          >
            {save.isPending ? "Saving…" : saved ? "Save" : "Add"}
          </Button>
        </header>
        <div className="flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {sections}
        </div>
      </div>
    )
  }

  return (
    <EditorPage
      icon={
        <TunnelIcon
          tunnel={{ kind: ch.kind, config: { protocol: ch.protocol } }}
        />
      }
      title={saved ? saved.name : "New tunnel"}
      dirty={dirty}
      status={
        dirty
          ? "Unsaved changes"
          : saved
            ? `Saved ${timeAgo(saved.updated_at)}`
            : "Not saved yet"
      }
      onSave={blocked ? undefined : submit}
      aside={
        <>
          <AsideCard title="Summary">
            <SummaryList
              rows={[
                ["Kind", ch.label],
                ["Name", name],
                ["Goes to", summaryTarget(d, ch, servers) || "Not set yet"],
                ...(saved
                  ? ([
                      [
                        "Used by",
                        `${saved.server_count} ${saved.server_count === 1 ? "server" : "servers"}`,
                      ],
                    ] as [string, string][])
                  : []),
              ]}
            />
          </AsideCard>
          <AsideCard title="How it runs">
            <p className="text-body-sm text-muted-foreground">
              {howItRuns[ch.kind]}
            </p>
          </AsideCard>
        </>
      }
      actions={
        <>
          <Button variant="outline" className="h-9" onClick={leave}>
            Cancel
          </Button>
          <Button className="h-9" disabled={blocked} onClick={submit}>
            {save.isPending ? "Saving…" : label}
          </Button>
        </>
      }
    >
      {sections}
    </EditorPage>
  )
}

const howItRuns: Record<string, string> = {
  wireguard:
    "Inside Morche itself, on its own private network stack: no root, no tun device, and the machine's routes never change.",
  openvpn:
    "openvpn runs in a private network namespace of its own, so its routes and DNS stay there. Needs /dev/net/tun.",
  openconnect:
    "openconnect hands its packets to Morche, which keeps them on a private network stack: no root and no tun device needed.",
  sstp: "sstpc and pppd run in a private network namespace. Needs /dev/ppp and a backend running as root.",
  jump: "Over Morche's SSH connection to that server, like ssh -J. Chains work: the jump host may use a tunnel too.",
  socks5: "Every connection asks the proxy to open it. Only TCP.",
  http: "Every connection is a CONNECT request to the proxy. Only TCP.",
}

function summaryTarget(
  d: Draft,
  ch: Choice,
  servers: { id: string; name: string }[],
) {
  switch (ch.kind) {
    case "jump":
      return servers.find((s) => s.id === d.serverId)?.name ?? ""
    case "wireguard":
      return d.endpoint.trim()
    case "openvpn":
      return ovpnRemotes(d.configFile)[0] ?? (d.configFile ? "" : "Saved file")
    default:
      return d.host.trim() + (d.port.trim() ? `:${d.port.trim()}` : "")
  }
}

function TestOutcome({ r, onTrust }: { r: TestResult; onTrust?: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Callout
        icon={r.ok ? <CircleCheck className="text-success" /> : <CircleAlert />}
        tone={r.ok ? undefined : "warning"}
      >
        <span className="block text-foreground">{r.message}</span>
        {r.ok && (r.address || r.dns?.length) && (
          <span className="block">
            {[
              r.address && `Address ${r.address}`,
              r.dns?.length && `DNS ${r.dns.join(", ")}`,
              `${r.ms} ms`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </Callout>
      {onTrust && (
        <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
          <p className="text-caption text-muted-foreground">
            The server&apos;s certificate isn&apos;t signed by a known
            authority. Compare this fingerprint with the one your VPN admin
            gives you before trusting it:
          </p>
          <code className="font-mono text-caption break-all">{r.pin}</code>
          <Button
            variant="outline"
            className="h-9 self-start"
            onClick={onTrust}
          >
            <ShieldCheck />
            Trust this certificate
          </Button>
        </div>
      )}
      {r.log.length > 0 && (
        <details className="rounded-xl border border-border">
          <summary className="cursor-pointer px-3 py-2 text-caption text-muted-foreground select-none">
            What happened ({r.log.length} lines)
          </summary>
          <pre className="max-h-72 overflow-auto border-t border-border px-3 py-2 font-mono text-caption whitespace-pre-wrap [contain:inline-size]">
            {r.log.map((l) => l.text).join("\n")}
          </pre>
        </details>
      )}
    </div>
  )
}

function KindFields({
  d,
  set,
  f,
  ch,
  phone,
  saved,
  keepSecret,
  servers,
}: {
  d: Draft
  set: (patch: Partial<Draft>) => void
  f: (key: string) => string | undefined
  ch: Choice
  phone: boolean
  saved: Tunnel | undefined
  keepSecret: (has: boolean | undefined) => string | undefined
  servers: { value: string; label: string; detail?: string }[]
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [more, setMore] = useState(false)
  const [withLogin, setWithLogin] = useState(false)
  const hostPort = (placeholder: string, port: string) => (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
      <Field label="Address" error={f("config.host")}>
        {(p) => (
          <Input
            {...p}
            value={d.host}
            onChange={(e) => {
              // A pasted URL keeps only its host (and port).
              const v = e.target.value
              const m = v.match(/^\w+:\/\/([^/:\s]+)(?::(\d+))?/)
              if (m) set({ host: m[1], port: m[2] ?? d.port })
              else set({ host: v })
            }}
            placeholder={placeholder}
            autoCapitalize="none"
            className="placeholder:text-ash"
          />
        )}
      </Field>
      <Field label="Port" error={f("config.port")}>
        {(p) => (
          <Input
            {...p}
            value={d.port}
            onChange={(e) => set({ port: e.target.value.replace(/\D/g, "") })}
            inputMode="numeric"
            placeholder={port}
            className="tabular-nums placeholder:text-ash"
          />
        )}
      </Field>
    </div>
  )
  const login = (required: boolean) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Username"
        error={f("config.username")}
        hint={required ? undefined : "Blank if it takes no login."}
      >
        {(p) => (
          <Input
            {...p}
            value={d.username}
            onChange={(e) => set({ username: e.target.value })}
            autoCapitalize="none"
            autoComplete="off"
          />
        )}
      </Field>
      <Field label="Password" error={f("password")}>
        {(p) => (
          <SecretInput
            {...p}
            value={d.password}
            onChange={(e) => set({ password: e.target.value })}
            placeholder={keepSecret(saved?.has_password)}
            autoComplete="new-password"
          />
        )}
      </Field>
    </div>
  )

  switch (ch.kind) {
    case "jump":
      return (
        <Field
          label="Jump host"
          error={f("config.server_id")}
          hint="Any server in this workspace Morche can already reach."
        >
          {(p) =>
            servers.length ? (
              <Pick
                id={p.id}
                value={d.serverId}
                onChange={(serverId) => set({ serverId })}
                items={[{ value: "", label: "Pick a server" }, ...servers]}
                phone={phone}
              />
            ) : (
              <p className="text-body-sm text-muted-foreground">
                Add the jump host as a server first.
              </p>
            )
          }
        </Field>
      )
    case "socks5":
    case "http":
      return (
        <>
          {hostPort(
            "proxy.example.com",
            ch.kind === "socks5" ? "1080" : "3128",
          )}
          {login(false)}
          {ch.kind === "http" && (
            <ToggleRow
              id="tunnel-tls"
              label="Talk to the proxy over TLS"
              hint="For an https:// proxy."
              checked={d.tls}
              onChange={(tls) => set({ tls })}
            />
          )}
        </>
      )
    case "wireguard":
      return (
        <>
          <Field
            label="Paste the config"
            hint="Optional: a wg-quick .conf fills the fields below. It isn't saved as is."
          >
            {(p) => (
              <Textarea
                {...p}
                rows={3}
                placeholder={
                  "[Interface]\nPrivateKey = …\nAddress = 10.0.0.2/32\n\n[Peer]\n…"
                }
                className="font-mono text-caption placeholder:text-ash"
                onChange={(e) => {
                  const c = parseWireGuard(e.target.value)
                  if (!c) return
                  set({
                    privateKey: c.privateKey ?? d.privateKey,
                    addresses: c.addresses ?? d.addresses,
                    dns: c.dns ?? d.dns,
                    mtu: c.mtu ?? d.mtu,
                    peerPublicKey: c.peerPublicKey ?? d.peerPublicKey,
                    presharedKey: c.presharedKey ?? d.presharedKey,
                    endpoint: c.endpoint ?? d.endpoint,
                    allowedIPs: c.allowedIPs ?? d.allowedIPs,
                    keepalive: c.keepalive ?? d.keepalive,
                  })
                  e.target.value = ""
                  toast.success("Filled in from the config")
                }}
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Address"
              error={f("config.addresses")}
              hint="Interface › Address"
            >
              {(p) => (
                <Input
                  {...p}
                  value={d.addresses}
                  onChange={(e) => set({ addresses: e.target.value })}
                  placeholder="10.0.0.2/32"
                  className="font-mono placeholder:text-ash"
                />
              )}
            </Field>
            <Field
              label="Private key"
              error={f("private_key")}
              hint="Interface › PrivateKey"
            >
              {(p) => (
                <SecretInput
                  {...p}
                  value={d.privateKey}
                  onChange={(e) => set({ privateKey: e.target.value })}
                  placeholder={keepSecret(saved?.has_private_key)}
                  autoComplete="off"
                />
              )}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Server's public key"
              error={f("config.peer_public_key")}
              hint="Peer › PublicKey"
            >
              {(p) => (
                <Input
                  {...p}
                  value={d.peerPublicKey}
                  onChange={(e) => set({ peerPublicKey: e.target.value })}
                  className="font-mono"
                  autoCapitalize="none"
                />
              )}
            </Field>
            <Field
              label="Endpoint"
              error={f("config.endpoint")}
              hint="Peer › Endpoint"
            >
              {(p) => (
                <Input
                  {...p}
                  value={d.endpoint}
                  onChange={(e) => set({ endpoint: e.target.value })}
                  placeholder="vpn.example.com:51820"
                  autoCapitalize="none"
                  className="font-mono placeholder:text-ash"
                />
              )}
            </Field>
          </div>
          <Field
            label="Allowed IPs"
            error={f("config.allowed_ips")}
            hint="Peer › AllowedIPs: what goes through it. Blank = everything."
          >
            {(p) => (
              <Input
                {...p}
                value={d.allowedIPs}
                onChange={(e) => set({ allowedIPs: e.target.value })}
                placeholder="10.0.0.0/24, 192.168.10.0/24"
                className="font-mono placeholder:text-ash"
              />
            )}
          </Field>
          <MoreToggle open={more} onToggle={() => setMore(!more)} />
          {more && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Preshared key" error={f("preshared_key")}>
                {(p) => (
                  <SecretInput
                    {...p}
                    value={d.presharedKey}
                    onChange={(e) => set({ presharedKey: e.target.value })}
                    placeholder={
                      keepSecret(saved?.has_preshared_key) ?? "Optional"
                    }
                    autoComplete="off"
                  />
                )}
              </Field>
              <Field label="Keepalive" hint="Seconds; blank = 25.">
                {(p) => (
                  <Input
                    {...p}
                    value={d.keepalive}
                    onChange={(e) =>
                      set({ keepalive: e.target.value.replace(/\D/g, "") })
                    }
                    inputMode="numeric"
                    placeholder="25"
                    className="tabular-nums placeholder:text-ash"
                  />
                )}
              </Field>
              <Field label="MTU" error={f("config.mtu")} hint="Blank = 1420.">
                {(p) => (
                  <Input
                    {...p}
                    value={d.mtu}
                    onChange={(e) =>
                      set({ mtu: e.target.value.replace(/\D/g, "") })
                    }
                    inputMode="numeric"
                    placeholder="1420"
                    className="tabular-nums placeholder:text-ash"
                  />
                )}
              </Field>
            </div>
          )}
        </>
      )
    case "openvpn": {
      const remotes = ovpnRemotes(d.configFile)
      const askLogin = ovpnNeedsLogin(d.configFile)
      const encrypted = ovpnEncryptedKey(d.configFile)
      return (
        <>
          <Field
            label=".ovpn file"
            error={f("config_file")}
            hint={
              saved?.has_config_file && !d.configFile
                ? `Saved${saved.remotes.length ? `, connects to ${saved.remotes.join(", ")}` : ""}. Paste or upload another to replace it.`
                : "Lines that run programs or read files from disk are refused."
            }
          >
            {(p) => (
              <div className="flex flex-col gap-2">
                <Textarea
                  {...p}
                  value={d.configFile}
                  onChange={(e) => set({ configFile: e.target.value })}
                  rows={d.configFile ? 8 : 3}
                  placeholder={
                    "client\ndev tun\nremote vpn.example.com 1194\n<ca>…</ca>"
                  }
                  spellCheck={false}
                  className="font-mono text-caption placeholder:text-ash"
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept=".ovpn,.conf,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    file.text().then((text) => {
                      set({
                        configFile: text,
                        name:
                          d.name || file.name.replace(/\.(ovpn|conf)$/i, ""),
                      })
                    })
                    e.target.value = ""
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    className={phone ? "h-11" : "h-8"}
                    onClick={() => fileRef.current?.click()}
                  >
                    <FileUp />
                    Upload a file
                  </Button>
                  {remotes.length > 0 && (
                    <span className="text-caption text-muted-foreground">
                      Connects to {remotes.join(", ")}
                    </span>
                  )}
                </div>
              </div>
            )}
          </Field>
          {askLogin || withLogin || d.username || saved?.config.username ? (
            login(true)
          ) : (
            <p className="text-caption text-muted-foreground">
              The file signs in with its certificate.{" "}
              <button
                type="button"
                className="text-brand hover:underline"
                onClick={() => setWithLogin(true)}
              >
                Add a username and password
              </button>
            </p>
          )}
          {(encrypted || saved?.has_passphrase) && (
            <Field label="Private key passphrase" error={f("passphrase")}>
              {(p) => (
                <SecretInput
                  {...p}
                  value={d.passphrase}
                  onChange={(e) => set({ passphrase: e.target.value })}
                  placeholder={keepSecret(saved?.has_passphrase)}
                  autoComplete="off"
                />
              )}
            </Field>
          )}
        </>
      )
    }
    case "openconnect":
      return (
        <>
          {hostPort("vpn.example.com", "443")}
          {login(true)}
          <MoreToggle
            open={more || !!d.group || !!d.serverCert}
            onToggle={() => setMore(!more)}
          />
          {(more || !!d.group || !!d.serverCert) && (
            <>
              <Field
                label="Login group"
                hint="The group or realm, when the VPN asks to pick one."
              >
                {(p) => (
                  <Input
                    {...p}
                    value={d.group}
                    onChange={(e) => set({ group: e.target.value })}
                    autoCapitalize="none"
                  />
                )}
              </Field>
              <Field
                label="Trusted certificate"
                error={f("config.server_cert")}
                hint="For a self-signed server: Test fills it in after you check it. Blank = trusted authorities only."
              >
                {(p) => (
                  <Input
                    {...p}
                    value={d.serverCert}
                    onChange={(e) => set({ serverCert: e.target.value })}
                    placeholder="pin-sha256:…"
                    className="font-mono placeholder:text-ash"
                  />
                )}
              </Field>
            </>
          )}
        </>
      )
    case "sstp":
      return (
        <>
          {hostPort("vpn.example.com", "443")}
          {login(true)}
          <ToggleRow
            id="tunnel-ignore-cert"
            label="Accept an untrusted certificate"
            hint="Only for a self-signed server you trust."
            checked={d.ignoreCert}
            onChange={(ignoreCert) => set({ ignoreCert })}
          />
        </>
      )
  }
  return null
}

function MoreToggle({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="self-start text-body-sm text-brand hover:underline"
      aria-expanded={open}
    >
      {open ? "Fewer options" : "More options"}
    </button>
  )
}

function Loading({ phone }: { phone: boolean }) {
  if (!phone) return <EditorLoading />
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  )
}
