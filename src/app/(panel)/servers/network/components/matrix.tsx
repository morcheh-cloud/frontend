"use client"

import { Search } from "lucide-react"
import { Fragment } from "react"

import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import type { NetworkMap, NetworkServer, Reach } from "@/lib/services"
import { cn } from "@/lib/utils"

import {
  findLink,
  formatMs,
  matches,
  reachMeta,
  type Selection,
  serverText,
  toneDot,
  toneText,
} from "./meta"

// Every pair, both directions: the row's server tried to reach the column's.
export function Matrix({
  map,
  query,
  phone,
  onSelect,
}: {
  map: NetworkMap
  query: string
  phone: boolean
  onSelect: (selection: Selection) => void
}) {
  const shown = map.servers.filter((s) => matches(serverText(s), query))
  if (shown.length === 0) {
    return (
      <Empty
        icon={Search}
        title="No servers match"
        body="Try a name or an address."
        className="m-4 md:m-6"
      />
    )
  }
  return phone ? (
    <PhoneList map={map} shown={shown} onSelect={onSelect} />
  ) : (
    <Table map={map} shown={shown} onSelect={onSelect} />
  )
}

type Props = {
  map: NetworkMap
  shown: NetworkServer[]
  onSelect: (selection: Selection) => void
}

function Table({ map, shown, onSelect }: Props) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-separate border-spacing-0 text-body-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky start-0 top-0 z-30 border-e border-b border-border bg-subtle px-4 py-2 text-start text-caption font-normal whitespace-nowrap text-ash"
            >
              From ↓ &nbsp; To →
            </th>
            {shown.map(({ server: s }) => (
              <th
                key={s.id}
                scope="col"
                title={s.name}
                className="sticky top-0 z-20 max-w-36 min-w-28 truncate border-e border-b border-border bg-subtle px-3 py-2 text-start font-medium"
              >
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map(({ server: from }) => (
            <tr key={from.id}>
              <th
                scope="row"
                title={from.name}
                className="sticky start-0 z-10 max-w-52 min-w-44 truncate border-e border-b border-border bg-subtle px-4 py-2 text-start font-medium"
              >
                {from.name}
              </th>
              {shown.map(({ server: to }) => {
                if (from.id === to.id) {
                  return (
                    <td
                      key={to.id}
                      aria-label="Same server"
                      className="border-e border-b border-border bg-muted"
                    />
                  )
                }
                const link = findLink(map, from.id, to.id)
                return (
                  <td
                    key={to.id}
                    className="border-e border-b border-border p-0"
                  >
                    {link && (
                      <button
                        type="button"
                        title={reachMeta[link.status].label}
                        onClick={() =>
                          onSelect({ kind: "link", from: from.id, to: to.id })
                        }
                        className="flex h-11 w-full items-center gap-2 px-3 whitespace-nowrap outline-none hover:bg-muted focus-visible:bg-muted"
                      >
                        <Status link={link} />
                      </button>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Status({ link }: { link: Reach }) {
  const meta = reachMeta[link.status]
  return (
    <>
      <span
        aria-hidden
        className={cn("size-2 shrink-0 rounded-full", toneDot[meta.tone])}
      />
      {link.status === "open" ? (
        <span className="text-muted-foreground">
          {link.ping_ms != null ? formatMs(link.ping_ms) : "Open"}
        </span>
      ) : (
        <span className={toneText[meta.tone]}>
          {link.status === "up"
            ? "Port closed"
            : link.status === "blocked"
              ? "Blocked"
              : "Not tested"}
        </span>
      )}
    </>
  )
}

function PhoneList({ map, shown, onSelect }: Props) {
  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      {shown.map(({ server: from }) => (
        <Fragment key={from.id}>
          <h2 className="sticky top-0 z-10 truncate border-b border-border bg-subtle px-4 py-2 text-body-sm font-medium">
            From {from.name}
          </h2>
          <ul className="divide-y divide-border">
            {map.servers
              .filter((s) => s.server.id !== from.id)
              .map(({ server: to }) => {
                const link = findLink(map, from.id, to.id)
                if (!link) return null
                return (
                  <li key={to.id}>
                    <button
                      type="button"
                      onClick={() =>
                        onSelect({ kind: "link", from: from.id, to: to.id })
                      }
                      className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-start text-body-sm outline-none active:bg-muted"
                    >
                      <span className="min-w-0 truncate">{to.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Status link={link} />
                      </span>
                    </button>
                  </li>
                )
              })}
          </ul>
        </Fragment>
      ))}
    </div>
  )
}
