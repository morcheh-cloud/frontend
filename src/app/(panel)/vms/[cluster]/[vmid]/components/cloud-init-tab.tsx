"use client"

import { useQueryClient } from "@tanstack/react-query"
import { CloudCog, HardDrive, RotateCcw } from "lucide-react"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { Field } from "@/components/field"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { fieldErrors } from "@/lib/api"
import type { PVECloudInit } from "@/lib/services"

import { Empty } from "../../../../servers/[id]/components/parts"
import { useCloudInit, useSetCloudInit, vmKeys } from "../../../api"
import { CheckRow, Pick } from "../../../components/form-parts"
import { TabLoading, useGuestPage } from "./guest-page"
import { Panel, TabBody } from "./kit"

type Mode = "dhcp" | "static" | "none"
type Nic = { key: string; nic: string; mode: Mode; ip: string; gw: string }

const ipRe = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
const gwRe = /^(\d{1,3}\.){3}\d{1,3}$/

// "ip=10.0.0.5/24,gw=10.0.0.1" → parts. ip6 and anything else is kept
// by sending the line back as it was when the IPv4 side didn't change.
function readNic(key: string, line: string): Nic {
  const props = Object.fromEntries(
    line
      .split(",")
      .filter(Boolean)
      .map((p) => {
        const i = p.indexOf("=")
        return [p.slice(0, i), p.slice(i + 1)]
      }),
  )
  const nic = key.replace("ipconfig", "net")
  if (!line) return { key, nic, mode: "none", ip: "", gw: "" }
  if (props.ip === "dhcp") return { key, nic, mode: "dhcp", ip: "", gw: "" }
  return { key, nic, mode: "static", ip: props.ip ?? "", gw: props.gw ?? "" }
}

function writeNic(n: Nic, before: string): string {
  if (n.mode === "none") return ""
  const extra = before
    .split(",")
    .filter((p) => p && !p.startsWith("ip=") && !p.startsWith("gw="))
  const own = n.mode === "dhcp" ? ["ip=dhcp"] : [`ip=${n.ip.trim()}`]
  if (n.mode === "static" && n.gw.trim()) own.push(`gw=${n.gw.trim()}`)
  return [...own, ...extra].join(",")
}

export function CloudInitTab() {
  const { guest: g } = useGuestPage()
  const q = useCloudInit(g.cluster_id, g.vmid)

  if (g.kind !== "qemu") {
    return (
      <Empty
        icon={CloudCog}
        title="Containers don't use cloud-init"
        body="A container's hostname, network and root password are set in Hardware › Network and Options."
      />
    )
  }
  if (q.isLoading) return <TabLoading />
  if (q.isError) {
    return (
      <Empty
        icon={CloudCog}
        title="Couldn't read cloud-init"
        body={q.error.message}
        action={
          <Button variant="outline" onClick={() => q.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }
  const ci = q.data
  if (!ci) return null
  if (!ci.has_drive) {
    return (
      <Empty
        icon={HardDrive}
        title="No cloud-init drive"
        body="Cloud-init sets the user, SSH keys and network when the machine first boots. It needs a cloud-init drive (Hardware › Add disk › Cloud-init) and an image that runs cloud-init, like the cloud images of Ubuntu and Debian."
      />
    )
  }
  // Keyed by the saved values, so a save (or someone else's) starts fresh.
  return <CloudInitForm key={JSON.stringify(ci)} ci={ci} />
}

function CloudInitForm({ ci }: { ci: PVECloudInit }) {
  const { guest: g, phone, can } = useGuestPage()
  const edit = can("engineer")
  const save = useSetCloudInit(g.cluster_id, g.vmid)
  const queryClient = useQueryClient()

  // One row per network card: every netN, plus ipconfigN set without one.
  const nicKeys = new Set([
    ...Object.keys(g.config)
      .filter((k) => /^net\d+$/.test(k))
      .map((k) => k.replace("net", "ipconfig")),
    ...Object.keys(ci.ip_config),
  ])
  const keys = [...nicKeys].sort(
    (a, b) => Number(a.slice(8)) - Number(b.slice(8)),
  )

  const [user, setUser] = useState(ci.user)
  const [password, setPassword] = useState("")
  const [clearPassword, setClearPassword] = useState(false)
  const [keysText, setKeysText] = useState(ci.ssh_keys)
  const [nics, setNics] = useState<Nic[]>(() =>
    keys.map((k) => readNic(k, ci.ip_config[k] ?? "")),
  )
  const [nameserver, setNameserver] = useState(ci.nameserver)
  const [search, setSearch] = useState(ci.search_domain)
  const [upgrade, setUpgrade] = useState(ci.upgrade)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const setNic = (key: string, patch: Partial<Nic>) =>
    setNics((all) => all.map((n) => (n.key === key ? { ...n, ...patch } : n)))

  const dirty =
    user !== ci.user ||
    password !== "" ||
    clearPassword ||
    keysText.trim() !== ci.ssh_keys.trim() ||
    nameserver !== ci.nameserver ||
    search !== ci.search_domain ||
    upgrade !== ci.upgrade ||
    nics.some(
      (n) =>
        writeNic(n, ci.ip_config[n.key] ?? "") !== (ci.ip_config[n.key] ?? ""),
    )

  const reset = () => {
    setUser(ci.user)
    setPassword("")
    setClearPassword(false)
    setKeysText(ci.ssh_keys)
    setNics(keys.map((k) => readNic(k, ci.ip_config[k] ?? "")))
    setNameserver(ci.nameserver)
    setSearch(ci.search_domain)
    setUpgrade(ci.upgrade)
    setErrors({})
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const bad: Record<string, string> = {}
    if (user && !/^[a-z_][a-z0-9_-]{0,31}$/.test(user))
      bad.user = "Lower-case letters, digits, - and _."
    for (const l of keysText.split("\n")) {
      const t = l.trim()
      if (t && !/^(ssh-|ecdsa-|sk-)/.test(t)) {
        bad.ssh_keys = "One public key per line, like ssh-ed25519 AAAA…"
        break
      }
    }
    for (const n of nics) {
      if (n.mode !== "static") continue
      if (!ipRe.test(n.ip.trim()))
        bad[`${n.key}.ip`] = "An address with its prefix, e.g. 10.0.0.5/24."
      if (n.gw.trim() && !gwRe.test(n.gw.trim()))
        bad[`${n.key}.gw`] = "An address, e.g. 10.0.0.1."
    }
    setErrors(bad)
    if (Object.keys(bad).length) return
    save.mutate(
      {
        user: user.trim(),
        password: clearPassword ? undefined : password || undefined,
        clear_password: clearPassword || undefined,
        ssh_keys: keysText.trim(),
        ip_config: Object.fromEntries(
          nics.map((n) => [n.key, writeNic(n, ci.ip_config[n.key] ?? "")]),
        ),
        nameserver: nameserver.trim(),
        search_domain: search.trim(),
        upgrade,
      },
      {
        onSuccess: () => {
          setPassword("")
          queryClient.invalidateQueries({
            queryKey: vmKeys.cloudInit(g.cluster_id, g.vmid),
          })
        },
        onError: (err) => {
          const fe = fieldErrors(err)
          setErrors(fe)
          const shown = ["user", "password", "ssh_keys", "nameserver"]
          if (
            !Object.keys(fe).some(
              (k) => shown.includes(k) || k === "search_domain",
            )
          )
            toast.error(err.message)
        },
      },
    )
  }

  return (
    <TabBody>
      <form onSubmit={submit} className="contents">
        <fieldset
          disabled={!edit || save.isPending}
          className="grid min-w-0 gap-4 max-md:gap-0 xl:grid-cols-2"
        >
          <Panel title="Sign-in">
            <div className="flex flex-col gap-4">
              <Field
                label="User"
                hint="Created on first boot, with sudo. Blank = the image's default user (ubuntu, debian…)."
                error={errors.user}
              >
                {(p) => (
                  <Input
                    {...p}
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Image default"
                  />
                )}
              </Field>
              <Field
                label="Password"
                hint={
                  ci.has_password
                    ? "A password is set. Blank keeps it."
                    : "Optional; SSH keys are safer."
                }
                error={errors.password}
              >
                {(p) => (
                  <SecretInput
                    {...p}
                    value={password}
                    disabled={clearPassword || !edit}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder={ci.has_password ? "Saved" : ""}
                  />
                )}
              </Field>
              {ci.has_password && (
                <CheckRow
                  checked={clearPassword}
                  onChange={(v) => {
                    setClearPassword(v)
                    if (v) setPassword("")
                  }}
                  label="Remove the password"
                  text="Sign in with an SSH key only."
                />
              )}
              <Field
                label="SSH public keys"
                hint="One per line. Each is added to the user's authorized_keys."
                error={errors.ssh_keys}
              >
                {(p) => (
                  <Textarea
                    {...p}
                    value={keysText}
                    onChange={(e) => setKeysText(e.target.value)}
                    rows={4}
                    spellCheck={false}
                    autoCapitalize="none"
                    className="font-mono text-caption"
                    placeholder="ssh-ed25519 AAAA… you@laptop"
                  />
                )}
              </Field>
            </div>
          </Panel>

          <Panel title="Network">
            <div className="flex flex-col gap-4">
              {nics.length === 0 && (
                <p className="text-body-sm text-muted-foreground">
                  The machine has no network card. Add one in Hardware.
                </p>
              )}
              {nics.map((n) => (
                <div
                  key={n.key}
                  className="flex flex-col gap-3 border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-14 shrink-0 font-mono text-caption text-muted-foreground">
                      {n.nic}
                    </span>
                    <Pick<Mode>
                      value={n.mode}
                      onChange={(mode) => setNic(n.key, { mode })}
                      items={[
                        { value: "dhcp", label: "Automatic (DHCP)" },
                        { value: "static", label: "Fixed address" },
                        { value: "none", label: "Not set" },
                      ]}
                    />
                  </div>
                  {n.mode === "static" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Address" error={errors[`${n.key}.ip`]}>
                        {(p) => (
                          <Input
                            {...p}
                            value={n.ip}
                            onChange={(e) =>
                              setNic(n.key, { ip: e.target.value })
                            }
                            inputMode="decimal"
                            placeholder="10.0.0.5/24"
                            className="font-mono"
                          />
                        )}
                      </Field>
                      <Field label="Gateway" error={errors[`${n.key}.gw`]}>
                        {(p) => (
                          <Input
                            {...p}
                            value={n.gw}
                            onChange={(e) =>
                              setNic(n.key, { gw: e.target.value })
                            }
                            inputMode="decimal"
                            placeholder="10.0.0.1"
                            className="font-mono"
                          />
                        )}
                      </Field>
                    </div>
                  )}
                </div>
              ))}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="DNS servers"
                  hint="Blank = the node's."
                  error={errors.nameserver}
                >
                  {(p) => (
                    <Input
                      {...p}
                      value={nameserver}
                      onChange={(e) => setNameserver(e.target.value)}
                      inputMode="decimal"
                      placeholder="1.1.1.1 9.9.9.9"
                      className="font-mono"
                    />
                  )}
                </Field>
                <Field label="Search domain" error={errors.search_domain}>
                  {(p) => (
                    <Input
                      {...p}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoCapitalize="none"
                      placeholder="lan"
                    />
                  )}
                </Field>
              </div>
            </div>
          </Panel>

          <Panel title="First boot" className="xl:col-span-2">
            <CheckRow
              checked={upgrade}
              onChange={setUpgrade}
              label="Upgrade packages on first boot"
              text="Slower first start, but the machine starts up to date."
            />
          </Panel>
        </fieldset>

        <p className="text-caption text-muted-foreground max-md:px-4 max-md:py-3">
          Cloud-init reads these when the machine boots
          {g.status === "running"
            ? ", so changes reach a running machine after its next restart. "
            : ". "}
          Most images apply the user and keys only on the very first boot.
        </p>

        {edit && (
          <div className="sticky bottom-0 z-10 flex items-center gap-2 border-t border-border bg-background/95 py-3 backdrop-blur max-md:bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] max-md:px-4">
            <span className="text-caption text-muted-foreground">
              {dirty ? "Unsaved changes" : "Saved"}
            </span>
            <span className="ms-auto flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size={phone ? "lg" : "default"}
                disabled={!dirty || save.isPending}
                onClick={reset}
              >
                <RotateCcw />
                Undo
              </Button>
              <Button
                type="submit"
                size={phone ? "lg" : "default"}
                disabled={!dirty || save.isPending}
              >
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </span>
          </div>
        )}
      </form>
    </TabBody>
  )
}
