"use client"

import { CircleCheck, Cloud, Loader2, TriangleAlert } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { usePointDnsName } from "@/app/(panel)/dns/api"
import { zoneHref } from "@/app/(panel)/dns/components/meta"
import type { DNSNameMatch } from "@/lib/services"

const isIPv4 = (s: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(s)
const isIPv6 = (s: string) => s.includes(":")

// A site name's DNS, when a zone Morche manages (Technitium or ArvanCloud)
// covers it: where it points, whether a CDN is in front, and a button to
// point it at the proxy's server.
export function DnsStatus({
  match,
  serverHost,
  readOnly,
}: {
  match?: DNSNameMatch
  serverHost: string
  readOnly: boolean
}) {
  const point = usePointDnsName()
  if (!match?.found || !match.server_id || !match.zone) return null
  const type = isIPv4(serverHost) ? "A" : isIPv6(serverHost) ? "AAAA" : null
  const addrs = match.records.filter((r) => r.type === "A" || r.type === "AAAA")
  const alias = match.records.find(
    (r) => r.type === "CNAME" || r.type === "ANAME",
  )
  const here = addrs.some((r) => r.values.includes(serverHost))
  const cdn = match.records.some((r) => r.cloud)
  const where = match.server_kind === "arvan" ? "ArvanCloud" : match.server_name
  const canPoint =
    !readOnly &&
    match.writable &&
    !!type &&
    !here &&
    !alias &&
    addrs.length <= 1

  const link = (
    <Link
      href={zoneHref(match.server_id, match.zone)}
      className="text-muted-foreground underline-offset-2 hover:text-brand hover:underline"
    >
      {where}
    </Link>
  )

  function run() {
    if (!type || !match?.server_id || !match.zone) return
    point.mutate(
      {
        serverId: match.server_id,
        zone: match.zone,
        body: { name: match.name, type, value: serverHost },
      },
      {
        onSuccess: () =>
          toast.success(`${match.name} points at ${serverHost}`, {
            description: `Changed in ${where}. Resolvers may keep the old answer until its TTL ends.`,
          }),
        onError: (e) => toast.error(e.message),
      },
    )
  }

  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption">
      {match.problem ? (
        <span className="text-muted-foreground">
          DNS in {link}: couldn't read it ({match.problem})
        </span>
      ) : here ? (
        <span className="inline-flex items-center gap-1 text-success">
          <CircleCheck className="size-3.5" />
          Points here
          <span className="text-muted-foreground">· {link}</span>
        </span>
      ) : alias ? (
        <span className="text-muted-foreground">
          {alias.type} to <span className="font-mono">{alias.values[0]}</span> ·{" "}
          {link}
        </span>
      ) : addrs.length ? (
        <span className="inline-flex items-center gap-1 text-warning">
          <TriangleAlert className="size-3.5" />
          Points at{" "}
          <span className="font-mono">
            {addrs.flatMap((r) => r.values).join(", ")}
          </span>
          <span className="text-muted-foreground">· {link}</span>
        </span>
      ) : (
        <span className="text-muted-foreground">
          No record yet in {link}
          {match.zone_status &&
            match.zone_status !== "active" &&
            " (not active yet)"}
        </span>
      )}
      {cdn && (
        <span className="inline-flex items-center gap-1 text-brand">
          <Cloud className="size-3.5" />
          Through ArvanCloud CDN
        </span>
      )}
      {canPoint && (
        <button
          type="button"
          disabled={point.isPending}
          onClick={run}
          className="inline-flex items-center gap-1 rounded font-medium text-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 max-md:min-h-11"
        >
          {point.isPending && <Loader2 className="size-3.5 animate-spin" />}
          {addrs.length ? "Point it here" : "Add a record pointing here"}
        </button>
      )}
    </p>
  )
}
