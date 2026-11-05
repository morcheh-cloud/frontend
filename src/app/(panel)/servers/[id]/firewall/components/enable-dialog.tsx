"use client"

import { Lock } from "lucide-react"
import { useMemo, useState } from "react"

import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import type { FirewallRuleBody, OpenPort } from "@/lib/services"
import { useServerPage } from "../../components/server-page"
import { usePorts } from "../../ports/api"
import { useFirewallActions } from "./firewall-actions"
import { portName, portState } from "./meta"

const portKey = (p: OpenPort) => `${p.protocol}/${p.port}`

// Turning a firewall on is how people lock themselves out, so it starts from
// what the server actually serves and asks about each of those.
export function EnableDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { server, phone } = useServerPage()
  const a = useFirewallActions()
  const o = a.overview
  const query = usePorts(server.id)
  const [changed, setChanged] = useState<Record<string, boolean>>({})

  const ports = useMemo(() => {
    const seen = new Map<string, OpenPort>()
    for (const p of query.data?.ports ?? []) {
      if (p.exposure === "local" || p.port === o.ssh_port) continue
      if (portState({ ...o, active: true }, p).state === "open") continue
      if (!seen.has(portKey(p))) seen.set(portKey(p), p)
    }
    return [...seen.values()].sort((x, y) => x.port - y.port)
  }, [query.data, o])

  const isOn = (p: OpenPort) => changed[portKey(p)] ?? !p.sensitive

  async function submit() {
    const allow: FirewallRuleBody[] = ports.filter(isOn).map((p) => ({
      action: "allow",
      port: String(p.port),
      protocol: p.protocol,
    }))
    const ok = await a.apply(
      () => api.firewall.enableFirewall(server.id, { allow }),
      "Firewall turned on",
    )
    if (ok) onOpenChange(false)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Turn on the firewall"
      description={`Anything not allowed here gets ${o.defaults.incoming === "allow" ? "through, since the default is to allow" : "blocked"}. You'll have 90 seconds to keep the change; if you don't, it undoes itself.`}
      footer={
        <div className="flex w-full gap-2 max-md:flex-col md:justify-end">
          <Button
            size={phone ? "lg" : "default"}
            disabled={a.busy}
            onClick={submit}
          >
            {a.busy ? "Turning on…" : "Turn on"}
          </Button>
          <Button
            size={phone ? "lg" : "default"}
            variant={phone ? "ghost" : "outline"}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-1 text-body-sm">
        <div className="flex min-h-11 items-center gap-3">
          <Lock className="size-4 shrink-0 text-ash" />
          <span className="min-w-0 flex-1">
            <span className="font-medium">SSH</span>
            <span className="text-muted-foreground"> · port {o.ssh_port}</span>
          </span>
          <span className="text-caption text-muted-foreground">
            Always allowed
          </span>
        </div>
        {query.isPending && <Skeleton className="h-11 rounded-lg" />}
        {(query.error || query.data?.tool === "none") && (
          <p className="py-2 text-muted-foreground">
            Couldn't read which ports it listens on, so only SSH will be
            allowed. You can add more after.
          </p>
        )}
        {ports.map((p) => (
          // biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox inside is the control
          <label
            key={portKey(p)}
            className="flex min-h-11 cursor-pointer items-center gap-3"
          >
            <Checkbox
              checked={isOn(p)}
              onCheckedChange={(on) =>
                setChanged((c) => ({ ...c, [portKey(p)]: on }))
              }
            />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium">
                {portName(p.port) ?? p.service ?? p.process ?? "Unknown"}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · {p.port}/{p.protocol}
              </span>
            </span>
            {p.sensitive && (
              <span className="shrink-0 text-caption text-warning">
                Usually kept private
              </span>
            )}
          </label>
        ))}
        {query.data && query.data.tool !== "none" && ports.length === 0 && (
          <p className="py-2 text-muted-foreground">
            Nothing else is listening for other machines.
          </p>
        )}
      </div>
    </ResponsiveDialog>
  )
}
