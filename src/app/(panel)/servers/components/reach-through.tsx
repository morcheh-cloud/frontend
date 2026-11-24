"use client"

import { Cable } from "lucide-react"
import Link from "next/link"

import { Pick } from "@/app/(panel)/monitoring/components/monitor-fields"
import { useTunnels } from "@/app/(panel)/tunnels/api"
import {
  newTunnelHref,
  statusMeta,
} from "@/app/(panel)/tunnels/components/meta"
import { useCanAddTunnel } from "@/app/(panel)/tunnels/components/permissions"
import { useIsPhone } from "@/hooks/useIsPhone"
import { Field } from "./fields"

// "Reach it through": directly, or through one of the workspace's tunnels
// (VPN, proxy or jump host). Shown once there are tunnels; before that, an
// Owner gets a link to set one up.
export function ReachThrough({
  value,
  onChange,
  error,
}: {
  value: string | null
  onChange: (id: string | null) => void
  error?: string
}) {
  const phone = useIsPhone() ?? false
  const tunnels = useTunnels()
  const canAdd = useCanAddTunnel()
  const items = tunnels.data?.items ?? []
  if (items.length === 0 && !value) {
    if (!canAdd || tunnels.isPending) return null
    return (
      <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
        <Cable className="size-3.5 shrink-0" />
        Only reachable over a VPN or through another server?{" "}
        <Link
          href={newTunnelHref()}
          target="_blank"
          className="text-brand hover:underline"
        >
          Set up a tunnel
        </Link>
      </p>
    )
  }
  const picked = items.find((t) => t.id === value)
  return (
    <Field
      label="Reach it through"
      error={error}
      hint={
        picked
          ? `${picked.kind_label} · ${statusMeta[picked.status].label}. Host is the address as seen from inside it.`
          : "Directly from the machine Morche runs on."
      }
    >
      {(p) => (
        <Pick
          id={p.id}
          value={value ?? ""}
          onChange={(v) => onChange(v || null)}
          phone={phone}
          items={[
            { value: "", label: "Directly" },
            ...items.map((t) => ({
              value: t.id,
              label: t.name,
              detail: t.kind_label,
            })),
          ]}
        />
      )}
    </Field>
  )
}
