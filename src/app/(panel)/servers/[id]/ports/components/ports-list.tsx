"use client"

import { ChevronRight, Container, TriangleAlert } from "lucide-react"

import type { OpenPort } from "@/lib/services"
import { cn } from "@/lib/utils"
import { exposureMeta, ownerText, portKey, risks } from "./meta"

type ListProps = { ports: OpenPort[]; onSelect: (port: OpenPort) => void }

// The service name, hedged when it's only a guess from the port number.
function ServiceName({ port }: { port: OpenPort }) {
  if (!port.service) {
    return <span className="text-muted-foreground">Unknown</span>
  }
  return (
    <>
      {port.service_source === "port" && (
        <span className="text-muted-foreground">Probably </span>
      )}
      {port.service}
    </>
  )
}

function RiskIcon({ port }: { port: OpenPort }) {
  const list = risks(port)
  if (list.length === 0) return null
  return (
    <span role="img" aria-label={list[0].title} title={list[0].title}>
      <TriangleAlert className="size-4 shrink-0 text-warning" />
    </span>
  )
}

export function PortsTable({ ports, onSelect }: ListProps) {
  return (
    <div className="@container overflow-hidden rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr className="h-10 text-start">
            <th scope="col" className="w-28 ps-4 text-start font-medium">
              Port
            </th>
            <th scope="col" className="px-3 text-start font-medium">
              Service
            </th>
            <th scope="col" className="px-3 text-start font-medium">
              Owner
            </th>
            <th
              scope="col"
              className="hidden px-3 text-start font-medium @2xl:table-cell"
            >
              Listening on
            </th>
            <th scope="col" className="w-10">
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {ports.map((p) => {
            const exposure = exposureMeta[p.exposure]
            const ExposureIcon = exposure.icon
            const ct = p.container
            return (
              <tr
                key={portKey(p)}
                tabIndex={0}
                onClick={() => onSelect(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onSelect(p)
                  }
                }}
                className="group/row h-14 cursor-pointer outline-none hover:bg-subtle focus-visible:bg-subtle focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
              >
                <td className="ps-4 whitespace-nowrap">
                  <span className="font-mono font-medium tabular-nums">
                    {p.port}
                  </span>
                  <span className="ms-1.5 font-label text-caption tracking-label text-ash uppercase">
                    {p.protocol}
                  </span>
                </td>
                <td className="max-w-0 px-3">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate font-medium">
                      <ServiceName port={p} />
                    </span>
                    <RiskIcon port={p} />
                  </span>
                </td>
                <td className="max-w-0 px-3">
                  {ct ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <Container className="size-4 shrink-0 text-ash" />
                      <span className="min-w-0">
                        <span className="block truncate">{ct.name}</span>
                        <span className="block truncate font-mono text-caption text-ash">
                          {ct.image}
                        </span>
                      </span>
                    </span>
                  ) : p.process ? (
                    <span className="block min-w-0">
                      <span className="block truncate">
                        {p.process.name}
                        <span className="text-ash"> · {p.process.pid}</span>
                      </span>
                      {(p.unit || p.process.user) && (
                        <span className="block truncate text-caption text-ash">
                          {[p.unit?.name, p.process.user]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-ash">Hidden</span>
                  )}
                </td>
                <td className="hidden max-w-0 px-3 @2xl:table-cell">
                  <span className="flex min-w-0 items-center gap-2">
                    <ExposureIcon
                      className={cn(
                        "size-4 shrink-0",
                        p.exposure === "public"
                          ? "text-foreground"
                          : "text-ash",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block truncate">{exposure.label}</span>
                      <span className="block truncate font-mono text-caption text-ash">
                        {p.addresses.join(", ")}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="pe-3 text-ash">
                  <ChevronRight className="size-4 opacity-0 group-hover/row:opacity-100 group-focus-visible/row:opacity-100" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Phones: a full-width native list; a tap opens the details sheet.
export function PortsList({ ports, onSelect }: ListProps) {
  return (
    <ul className="mt-4 divide-y divide-border border-y border-border">
      {ports.map((p) => {
        const exposure = exposureMeta[p.exposure]
        const ExposureIcon = exposure.icon
        const owner = ownerText(p)
        return (
          <li key={portKey(p)}>
            <button
              type="button"
              onClick={() => onSelect(p)}
              className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start outline-none active:bg-muted"
            >
              <span className="flex h-11 min-w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-muted px-1.5">
                <span className="font-mono text-body-sm font-medium tabular-nums">
                  {p.port}
                </span>
                <span className="font-label text-caption leading-none tracking-label text-ash uppercase">
                  {p.protocol}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-body font-medium">
                    <ServiceName port={p} />
                  </span>
                  <RiskIcon port={p} />
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-body-sm text-muted-foreground">
                  <ExposureIcon className="size-3.5 shrink-0 text-ash" />
                  <span className="shrink-0">{exposure.label}</span>
                  {owner && (
                    <span className="truncate">
                      <span className="text-ash"> · </span>
                      {owner}
                    </span>
                  )}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ash" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
