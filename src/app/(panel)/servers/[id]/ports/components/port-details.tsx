"use client"

import { Container, Cpu, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { OpenPort } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Copyable, Mono } from "../../components/facts"
import { useServerPage } from "../../components/server-page"
import { endpoint, exposureMeta, risks } from "./meta"

// Everything known about one port: a side sheet on desktop, a bottom sheet
// on phones. Drive `open` with useOpen.
export function PortDetailsLayer({
  port,
  open,
  onOpenChange,
  privileged,
}: {
  port: OpenPort | null
  open: boolean
  onOpenChange: (open: boolean) => void
  privileged: boolean
}) {
  const { phone } = useServerPage()
  if (!port) return null
  const title = `${port.port}/${port.protocol}`
  const subtitle = port.service || "Unknown service"

  if (phone) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        header={
          <div className="px-6 pt-1 pb-3">
            <p className="font-mono text-subheading font-medium">{title}</p>
            <p className="text-body-sm text-muted-foreground">{subtitle}</p>
          </div>
        }
      >
        <PortDetails port={port} privileged={privileged} />
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="font-mono text-body">{title}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <PortDetails port={port} privileged={privileged} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function PortDetails({
  port,
  privileged,
}: {
  port: OpenPort
  privileged: boolean
}) {
  const { server } = useServerPage()
  const exposure = exposureMeta[port.exposure]
  const ExposureIcon = exposure.icon
  const { container: ct, process: proc, unit } = port

  return (
    <div className="flex flex-col gap-6 pb-2">
      {risks(port).map((risk) => (
        <div
          key={risk.title}
          className="flex gap-3 rounded-2xl border border-warning/25 bg-warning/5 p-4 text-body-sm"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium">{risk.title}</p>
            <p className="mt-0.5 text-muted-foreground">{risk.body}</p>
          </div>
        </div>
      ))}

      <Group title="Listening on">
        <Row label="Reach">
          <span className="inline-flex items-center gap-1.5">
            <ExposureIcon className="size-3.5 text-ash" />
            {exposure.label}
          </span>
          <p className="text-caption text-ash">{exposure.hint}</p>
        </Row>
        <Row label="Addresses">
          <ul className="flex flex-col gap-1">
            {port.addresses.map((a) => (
              <li key={a}>
                <Copyable text={endpoint(a, port.port)} label="Address">
                  <Mono>{endpoint(a, port.port)}</Mono>
                </Copyable>
              </li>
            ))}
          </ul>
        </Row>
        {port.service_source === "port" && (
          <Row label="Service">
            {port.service}
            <p className="text-caption text-ash">
              A guess from the port number; the process is hidden
            </p>
          </Row>
        )}
      </Group>

      {ct && (
        <Group title="Container" icon={Container}>
          <Row label="Name">{ct.name}</Row>
          <Row label="Image">
            <Mono className="break-all">{ct.image}</Mono>
          </Row>
          {ct.target_port ? (
            <Row label="Forwards to">
              Port {ct.target_port}/{port.protocol} inside the container
            </Row>
          ) : (
            ct.network === "host" && (
              <Row label="Forwards to">
                Host network: the container listens directly
              </Row>
            )
          )}
          {ct.compose_project && (
            <Row label="Compose">
              {ct.compose_project}
              {ct.compose_service && (
                <span className="text-muted-foreground">
                  {" "}
                  · service {ct.compose_service}
                </span>
              )}
            </Row>
          )}
          {ct.network && <Row label="Network">{ct.network}</Row>}
          {ct.state && <Row label="State">{ct.state}</Row>}
          <Row label="ID">
            <Copyable text={ct.id} label="Container ID">
              <Mono>{ct.id}</Mono>
            </Copyable>
          </Row>
          <Row label="Logs">
            <Copyable
              text={`docker logs -f --tail 100 ${ct.name}`}
              label="Command"
            >
              <Mono className="break-all">
                docker logs -f --tail 100 {ct.name}
              </Mono>
            </Copyable>
          </Row>
        </Group>
      )}

      {proc ? (
        <Group
          title={ct ? "Host process" : "Process"}
          icon={Cpu}
          note={
            ct
              ? "What holds the port on the server and forwards it to the container."
              : undefined
          }
        >
          <Row label="Name">{proc.name}</Row>
          <Row label="PID">
            {proc.pid}
            {proc.pids.length > 1 && (
              <span className="text-muted-foreground">
                {" "}
                · {proc.pids.length} processes share it
              </span>
            )}
          </Row>
          {proc.user && <Row label="User">{proc.user}</Row>}
          {proc.command && (
            <Row label="Command">
              <Copyable text={proc.command} label="Command">
                <Mono className="break-all">{proc.command}</Mono>
              </Copyable>
            </Row>
          )}
          {unit && (
            <Row label="systemd unit">
              <Mono>{unit.name}</Mono>
              {unit.description && (
                <p className="text-caption text-muted-foreground">
                  {unit.description}
                </p>
              )}
            </Row>
          )}
        </Group>
      ) : (
        !ct && (
          <Group
            title="Process"
            icon={Cpu}
            note={
              privileged
                ? "No process owns this socket (the kernel holds it, e.g. NFS or WireGuard)."
                : `Hidden: ${server.username} isn't root and sudo asks for a password, so only ${server.username}'s own processes are named.`
            }
          />
        )
      )}
    </div>
  )
}

function Group({
  title,
  icon: Icon,
  note,
  children,
}: {
  title: string
  icon?: typeof Cpu
  note?: string
  children?: ReactNode
}) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-1.5 font-label text-caption tracking-label text-ash uppercase">
        {Icon && <Icon className="size-3.5" />}
        {title}
      </h3>
      {note && (
        <p
          className={cn(
            "text-muted-foreground",
            children ? "-mt-1 mb-3 text-caption" : "text-body-sm",
          )}
        >
          {note}
        </p>
      )}
      {children && (
        <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-body-sm">
          {children}
        </dl>
      )}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}
