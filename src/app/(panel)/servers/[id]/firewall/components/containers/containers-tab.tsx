"use client"

import { Container, Pencil, ShieldCheck, Trash2 } from "lucide-react"
import { useState } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import type { ContainerAccess, ContainerLimit } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  Facts,
  type Item,
  ItemMenu,
  Loading,
  type Note,
  Notices,
  SheetItems,
  StateDot,
} from "../../../components/parts"
import { useServerPage } from "../../../components/server-page"
import { useContainerAccess } from "../../api"
import { useContainerLimits } from "./limits-provider"
import {
  idleLimits,
  limitPort,
  limitText,
  type PortRow,
  portRows,
  reachMeta,
  reachOf,
} from "./meta"

// What one row offers: limit an open port, or change/remove its limit.
function useRowMenu(
  row: { protocol: PortRow["protocol"]; port: string; limit?: ContainerLimit },
  access: ContainerAccess,
): Item[][] {
  const a = useContainerLimits()
  if (!a.can || !access.supported) return []
  const l = row.limit
  if (!l) {
    return [
      [
        {
          key: "limit",
          label: "Limit who can reach it",
          icon: <ShieldCheck />,
          disabled: a.busy,
          onSelect: () => a.edit({ port: row.port, protocol: row.protocol }),
        },
      ],
    ]
  }
  return [
    [
      {
        key: "edit",
        label: "Edit limit",
        icon: <Pencil />,
        disabled: a.busy,
        onSelect: () => a.edit({ limit: l }),
      },
    ],
    [
      {
        key: "remove",
        label: "Remove limit",
        icon: <Trash2 />,
        destructive: true,
        disabled: a.busy,
        onSelect: () => a.remove(l),
      },
    ],
  ]
}

function useNotes(access: ContainerAccess): Note[] {
  const a = useContainerLimits()
  const notes: Note[] = []
  if (!access.running) {
    notes.push({
      key: "stopped",
      title: "Docker isn't running",
      body: "Limits are kept and loaded again when it starts.",
      warn: true,
    })
  }
  if (!access.supported) {
    notes.push({
      key: "unsupported",
      title: "Limits can't be set on this server",
      body: access.problem,
      warn: true,
    })
  } else if (access.limits.length > 0 && !access.loaded) {
    notes.push({
      key: "loaded",
      title: "The server's rules don't match the limits",
      body:
        access.problem ??
        "Something else changed them, or Docker started again before they were loaded.",
      warn: true,
      action: a.can && (
        <Button
          size="sm"
          variant="outline"
          disabled={a.busy}
          onClick={a.reload}
        >
          Load again
        </Button>
      ),
    })
  } else if (access.limits.length > 0 && !access.persistent) {
    notes.push({
      key: "persistent",
      title: "Limits won't survive a restart",
      body: "Morche couldn't set them to load at boot. Open this tab after a restart and press Load again.",
      warn: true,
    })
  }
  return notes
}

export function ContainersTab() {
  const { server, phone } = useServerPage()
  const q = useContainerAccess(server.id)
  const a = useContainerLimits()

  if (q.isPending) return <Loading phone={phone} />
  if (q.isError) {
    return (
      <Empty
        icon={Container}
        title="Couldn't read the containers"
        className="max-md:mt-4"
        body={q.error.message}
        action={
          <Button variant="outline" onClick={() => q.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }
  return <Content access={q.data} phone={phone} add={a.can} />
}

function Content({
  access,
  phone,
  add,
}: {
  access: ContainerAccess
  phone: boolean
  add: boolean
}) {
  const a = useContainerLimits()
  const notes = useNotes(access)

  if (!access.docker) {
    return (
      <Empty
        icon={Container}
        title="Docker isn't installed"
        className="max-md:mt-4"
        body="Ports that containers publish show here, with who can reach them."
      />
    )
  }

  const rows = portRows(access)
  const idle = idleLimits(access)
  if (rows.length === 0 && idle.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Notices notes={notes} />
        <Empty
          icon={Container}
          title="No container publishes a port"
          className="max-md:mt-4"
          body="Nothing running answers from outside. You can still set a limit now; it holds once a container publishes that port."
          action={
            add &&
            access.supported && (
              <Button
                className="max-md:h-11 max-md:w-full"
                disabled={a.busy}
                onClick={() => a.edit()}
              >
                Add a limit
              </Button>
            )
          }
        />
      </div>
    )
  }

  const intro = (
    <p className="text-caption text-ash max-md:px-4 max-md:pt-3">
      Docker publishes these past ufw and firewalld. A limit here is checked
      first, so only the addresses you list get through.
    </p>
  )

  if (phone) {
    return (
      <>
        <Notices notes={notes} />
        {intro}
        <PhoneList access={access} rows={rows} idle={idle} />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Notices notes={notes} />
      {intro}
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-b border-border text-caption text-ash">
              <th className="py-2 ps-4 text-start font-normal">Port</th>
              <th className="px-4 py-2 text-start font-normal">Container</th>
              <th className="px-4 py-2 text-start font-normal">
                Who can reach it
              </th>
              <th className="px-4 py-2 text-start font-normal">Note</th>
              <th className="w-32" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <PortTr key={r.key} row={r} access={access} />
            ))}
          </tbody>
        </table>
      </div>
      {idle.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-body-sm font-medium">
            Waiting for a container
            <span className="ms-2 font-normal text-ash">
              No running container publishes these yet
            </span>
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-body-sm">
              <tbody className="divide-y divide-border">
                {idle.map((l) => (
                  <IdleTr key={l.id} limit={l} access={access} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Reach({ row }: { row: PortRow }) {
  const reach = reachOf(row)
  const m = reachMeta[reach]
  const detail =
    reach === "limited" && row.limit
      ? row.limit.allow.join(", ")
      : reach === "local"
        ? row.addresses.join(", ")
        : undefined
  return (
    <div className="flex min-w-0 flex-col" title={m.hint}>
      <StateDot tone={m.tone} label={m.label} />
      {detail && (
        <span className="max-w-72 truncate ps-3.5 font-mono text-caption text-muted-foreground">
          {detail}
        </span>
      )}
    </div>
  )
}

function PortTr({ row, access }: { row: PortRow; access: ContainerAccess }) {
  const a = useContainerLimits()
  const target = {
    protocol: row.protocol,
    port: String(row.port),
    limit: row.limit,
  }
  const menu = useRowMenu(target, access)
  const open = reachOf(row) === "anyone"
  return (
    <tr>
      <td className="py-2 ps-4 whitespace-nowrap">
        <span className="font-medium">
          {row.port}/{row.protocol}
        </span>
        {row.name && <span className="ms-2 text-ash">{row.name}</span>}
      </td>
      <td className="px-4 py-2">
        <div className="flex flex-col">
          {row.containers.map((c) => (
            <span key={c.name} className="truncate">
              {c.name}
              {c.target !== row.port && (
                <span className="text-ash"> → {c.target} inside</span>
              )}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-2">
        <Reach row={row} />
      </td>
      <td className="max-w-56 truncate px-4 py-2 text-muted-foreground">
        {row.limit?.comment}
      </td>
      <td className="pe-2 text-end whitespace-nowrap">
        {open && a.can && access.supported ? (
          <Button
            size="sm"
            variant="outline"
            disabled={a.busy}
            onClick={() =>
              a.edit({ port: String(row.port), protocol: row.protocol })
            }
          >
            Limit…
          </Button>
        ) : (
          row.limit && (
            <ItemMenu
              groups={menu}
              label={`Actions for ${row.port}/${row.protocol}`}
            />
          )
        )}
      </td>
    </tr>
  )
}

function IdleTr({
  limit,
  access,
}: {
  limit: ContainerLimit
  access: ContainerAccess
}) {
  const menu = useRowMenu({ ...limit, limit }, access)
  return (
    <tr>
      <td className="py-2 ps-4 font-medium whitespace-nowrap">
        {limitPort(limit)}
      </td>
      <td className="px-4 py-2 text-muted-foreground">{limitText(limit)}</td>
      <td className="max-w-72 truncate px-4 py-2 font-mono text-caption text-muted-foreground">
        {limit.allow.join(", ")}
      </td>
      <td className="max-w-56 truncate px-4 py-2 text-muted-foreground">
        {limit.comment}
      </td>
      <td className="w-12 pe-2 text-end">
        <ItemMenu groups={menu} label={`Actions for ${limitPort(limit)}`} />
      </td>
    </tr>
  )
}

type Picked =
  | { kind: "port"; row: PortRow }
  | { kind: "idle"; limit: ContainerLimit }

function PhoneList({
  access,
  rows,
  idle,
}: {
  access: ContainerAccess
  rows: PortRow[]
  idle: ContainerLimit[]
}) {
  const [open, setOpen] = useOpen("fw-ct-sheet")
  const [current, setCurrent] = useState<Picked>()
  const pick = (p: Picked) => {
    setCurrent(p)
    setOpen(true)
  }
  return (
    <>
      <ul className="mt-3 divide-y divide-border border-y border-border">
        {rows.map((r) => {
          const m = reachMeta[reachOf(r)]
          return (
            <li key={r.key}>
              <button
                type="button"
                className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-start active:bg-muted"
                onClick={() => pick({ kind: "port", row: r })}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body-sm font-medium">
                    {r.port}/{r.protocol}
                    {r.name && (
                      <span className="ms-1.5 font-normal text-ash">
                        {r.name}
                      </span>
                    )}
                  </span>
                  <span className="truncate text-caption text-muted-foreground">
                    {r.containers.map((c) => c.name).join(", ")}
                  </span>
                </span>
                <span className="shrink-0 text-caption">
                  <StateDot tone={m.tone} label={m.label} />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {idle.length > 0 && (
        <>
          <p className="px-4 pt-5 pb-2 text-caption text-ash">
            Waiting for a container
          </p>
          <ul className="divide-y divide-border border-y border-border">
            {idle.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  className="flex min-h-14 w-full flex-col justify-center px-4 py-2 text-start active:bg-muted"
                  onClick={() => pick({ kind: "idle", limit: l })}
                >
                  <span className="truncate text-body-sm font-medium">
                    {limitPort(l)}
                  </span>
                  <span className="truncate text-caption text-muted-foreground">
                    {[limitText(l), l.comment].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {current && (
        <RowSheet
          picked={current}
          access={access}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  )
}

function RowSheet({
  picked,
  access,
  open,
  onOpenChange,
}: {
  picked: Picked
  access: ContainerAccess
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const row = picked.kind === "port" ? picked.row : undefined
  const limit = row
    ? row.limit
    : picked.kind === "idle"
      ? picked.limit
      : undefined
  const protocol = row?.protocol ?? limit?.protocol ?? "tcp"
  const port = row ? String(row.port) : (limit?.port ?? "")
  const menu = useRowMenu({ protocol, port, limit }, access)
  const reach = row ? reachMeta[reachOf(row)] : undefined
  const facts = [
    ...(row
      ? [
          {
            label: "Container",
            value: row.containers
              .map((c) =>
                c.target !== row.port ? `${c.name} → ${c.target}` : c.name,
              )
              .join(", "),
            wide: true,
          },
          { label: "Bound to", value: row.addresses.join(", "), mono: true },
        ]
      : []),
    {
      label: "Who can reach it",
      value: reach ? reach.label : limit ? limitText(limit) : "",
    },
    ...(limit && limit.allow.length > 0
      ? [
          {
            label: "Let in",
            value: limit.allow.join(", "),
            wide: true,
            mono: true,
          },
        ]
      : []),
    ...(limit?.comment
      ? [{ label: "Note", value: limit.comment, wide: true }]
      : []),
  ]
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Port ${port}/${protocol}`}
    >
      {reach && (
        <p
          className={cn(
            "mx-4 mb-3 text-body-sm",
            reach.tone === "warning" ? "text-warning" : "text-muted-foreground",
          )}
        >
          {reach.hint}
        </p>
      )}
      <Facts items={facts} />
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}
