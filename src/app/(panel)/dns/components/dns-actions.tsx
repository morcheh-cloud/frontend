"use client"

import {
  CircleCheck,
  CircleOff,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  ListTree,
  Pencil,
  Plus,
  RefreshCw,
  RotateCw,
  Settings2,
  Star,
  StarOff,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import type { Item } from "@/app/(panel)/servers/[id]/components/parts"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { useIntent } from "@/hooks/useIntent"
import { useOpen } from "@/hooks/useOpen"
import type { DNSRecord, DNSServer } from "@/lib/services"
import {
  recordBody,
  useCheckDnsServer,
  useDeleteDnsServer,
  useDeleteZone,
  useDnsServers,
  useRecordChange,
  useResyncZone,
  useSetDnsFavorite,
  useSetZoneEnabled,
} from "../api"
import {
  consoleHref,
  copiedZone,
  dnsStatusMeta,
  type RecordType,
  relativeName,
  zoneDisplayName,
  zoneHref,
} from "./meta"
import { useDnsCan } from "./permissions"
import { RecordEditorLayer } from "./record-editor"
import { DnsServerFormLayer } from "./server-form"
import { NewZoneDialog, ZoneSettingsLayer } from "./zone-dialogs"

// What a zone action needs to know about the zone.
export type ZoneInfo = { name: string; type: string; disabled: boolean }

type Actions = {
  addServer: () => void
  editServer: (server: DNSServer) => void
  check: (server: DNSServer) => void
  toggleFavorite: (server: DNSServer) => void
  deleteServer: (server: DNSServer, done?: () => void) => void
  // Without a server: any connected one the person may change.
  newZone: (server?: DNSServer) => void
  zoneSettings: (server: DNSServer, zone: ZoneInfo) => void
  toggleZone: (server: DNSServer, zone: ZoneInfo) => void
  resync: (server: DNSServer, zone: string) => void
  deleteZone: (server: DNSServer, zone: string, done?: () => void) => void
  addRecord: (server: DNSServer, zone: string, type?: RecordType) => void
  editRecord: (server: DNSServer, zone: string, record: DNSRecord) => void
  toggleRecord: (server: DNSServer, zone: string, record: DNSRecord) => void
  deleteRecord: (server: DNSServer, zone: string, record: DNSRecord) => void
}

const ActionsContext = createContext<Actions | null>(null)

export function useDnsActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error("useDnsActions outside DnsActionsProvider")
  return ctx
}

const errorToast = (error: Error) => toast.error(error.message)

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${what} copied`, { description: text })
  } catch {
    toast.error("Couldn't access the clipboard")
  }
}

// Run `fn` once the layer's history entry is gone (it may navigate).
function whenClosed(close: (open: boolean) => void, fn?: () => void) {
  if (fn) window.addEventListener("popstate", fn, { once: true })
  close(false)
}

// Owns every dialog and sheet of the DNS pages, so the list, a server's page
// and a zone's page start the same flows.
export function DnsActionsProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const can = useDnsCan()
  const servers = useDnsServers()

  const [formOpen, setFormOpen] = useOpen("dns-server-form")
  const [formServer, setFormServer] = useState<DNSServer>()
  const [formKey, setFormKey] = useState(0)

  const [deleteOpen, setDeleteOpen] = useOpen("dns-server-delete")
  const [toDelete, setToDelete] = useState<{
    server?: DNSServer
    done?: () => void
  }>({})

  const [zoneOpen, setZoneOpen] = useOpen("dns-new-zone")
  const [zoneServers, setZoneServers] = useState<DNSServer[]>([])
  const [zoneKey, setZoneKey] = useState(0)

  const [settingsOpen, setSettingsOpen] = useOpen("dns-zone-settings")
  const [settingsFor, setSettingsFor] = useState<{
    server: DNSServer
    zone: ZoneInfo
  }>()

  const [zoneDeleteOpen, setZoneDeleteOpen] = useOpen("dns-zone-delete")
  const [zoneToDelete, setZoneToDelete] = useState<{
    server: DNSServer
    zone: string
    done?: () => void
  }>()

  const [recordOpen, setRecordOpen] = useOpen("dns-record")
  const [recordFor, setRecordFor] = useState<{
    server: DNSServer
    zone: string
    record?: DNSRecord
    type?: RecordType
  }>()
  const [recordKey, setRecordKey] = useState(0)

  const [recordDeleteOpen, setRecordDeleteOpen] = useOpen("dns-record-delete")
  const [recordToDelete, setRecordToDelete] = useState<{
    server: DNSServer
    zone: string
    record: DNSRecord
  }>()

  const checkMutation = useCheckDnsServer()
  const favorite = useSetDnsFavorite()
  const removeServer = useDeleteDnsServer()
  const removeZone = useDeleteZone()
  const setEnabled = useSetZoneEnabled()
  const resyncMutation = useResyncZone()
  const recordChange = useRecordChange()

  const actions: Actions = {
    addServer: () => {
      setFormServer(undefined)
      setFormKey((k) => k + 1)
      setFormOpen(true)
    },
    editServer: (server) => {
      setFormServer(server)
      setFormKey((k) => k + 1)
      setFormOpen(true)
    },
    check: (server) =>
      checkMutation.mutate(server.id, {
        onSuccess: (s) => {
          if (s.status === "online") {
            toast.success(`${s.name} is online`, {
              description: [
                s.version && `Technitium ${s.version}`,
                `${s.zone_count} zone${s.zone_count === 1 ? "" : "s"}`,
                s.latency_ms != null && `${s.latency_ms} ms`,
              ]
                .filter(Boolean)
                .join(" · "),
            })
          } else {
            toast.error(
              `${s.name}: ${dnsStatusMeta[s.status].label.toLowerCase()}`,
              { description: s.status_message },
            )
          }
        },
        onError: errorToast,
      }),
    toggleFavorite: (server) =>
      favorite.mutate(
        { id: server.id, favorite: !server.favorite },
        { onError: errorToast },
      ),
    deleteServer: (server, done) => {
      setToDelete({ server, done })
      setDeleteOpen(true)
    },
    newZone: (server) => {
      const list = server
        ? [server]
        : (servers.data?.items ?? []).filter(
            (s) => s.status === "online" && can(s, "engineer"),
          )
      if (list.length === 0) {
        toast.error("No connected DNS server you can add zones to")
        return
      }
      setZoneServers(list)
      setZoneKey((k) => k + 1)
      setZoneOpen(true)
    },
    zoneSettings: (server, zone) => {
      setSettingsFor({ server, zone })
      setSettingsOpen(true)
    },
    toggleZone: (server, zone) =>
      setEnabled.mutate(
        { id: server.id, zone: zone.name, enabled: zone.disabled },
        {
          onSuccess: () =>
            toast.success(
              `${zoneDisplayName(zone.name)} ${zone.disabled ? "enabled" : "disabled"}`,
              {
                description: zone.disabled
                  ? undefined
                  : "The server stops answering for it until you enable it.",
              },
            ),
          onError: errorToast,
        },
      ),
    resync: (server, zone) =>
      resyncMutation.mutate(
        { id: server.id, zone },
        {
          onSuccess: () =>
            toast.success(`Copying ${zoneDisplayName(zone)} again`, {
              description: `${server.name} asks the primary for the whole zone.`,
            }),
          onError: errorToast,
        },
      ),
    deleteZone: (server, zone, done) => {
      setZoneToDelete({ server, zone, done })
      setZoneDeleteOpen(true)
    },
    addRecord: (server, zone, type) => {
      setRecordFor({ server, zone, type })
      setRecordKey((k) => k + 1)
      setRecordOpen(true)
    },
    editRecord: (server, zone, record) => {
      setRecordFor({ server, zone, record })
      setRecordKey((k) => k + 1)
      setRecordOpen(true)
    },
    toggleRecord: (server, zone, record) =>
      recordChange.mutate(
        {
          id: server.id,
          zone,
          change: {
            op: "update",
            current: recordBody(record),
            record: { ...recordBody(record), disabled: !record.disabled },
          },
        },
        {
          onSuccess: () =>
            toast.success(
              `${relativeName(record.name, zone)} ${record.type} ${record.disabled ? "enabled" : "disabled"}`,
            ),
          onError: errorToast,
        },
      ),
    deleteRecord: (server, zone, record) => {
      setRecordToDelete({ server, zone, record })
      setRecordDeleteOpen(true)
    },
  }

  // "Add DNS server" from the command palette, on any page.
  useIntent("add-dns-server", () => actions.addServer())

  const apexNs =
    recordToDelete?.record.type === "NS" &&
    relativeName(recordToDelete.record.name, recordToDelete.zone) === "@"

  return (
    <ActionsContext value={actions}>
      {children}

      <DnsServerFormLayer
        key={`form-${formKey}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        server={formServer}
        onSaved={(saved) =>
          whenClosed(
            setFormOpen,
            formServer ? undefined : () => router.push(`/dns/${saved.id}`),
          )
        }
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Remove “${toDelete.server?.name}”?`}
        description="Morche forgets this connection and its token. The DNS server, its zones and records stay as they are."
        confirmLabel="Remove server"
        pending={removeServer.isPending}
        onConfirm={() =>
          toDelete.server &&
          removeServer.mutate(toDelete.server.id, {
            onSuccess: () => {
              whenClosed(setDeleteOpen, toDelete.done)
              toast.success("DNS server removed")
            },
            onError: errorToast,
          })
        }
      />

      <NewZoneDialog
        key={`zone-${zoneKey}`}
        open={zoneOpen}
        onOpenChange={setZoneOpen}
        servers={zoneServers}
        onCreated={(server, zone) =>
          whenClosed(setZoneOpen, () => router.push(zoneHref(server.id, zone)))
        }
      />

      {settingsFor && (
        <ZoneSettingsLayer
          key={`${settingsFor.server.id}/${settingsFor.zone.name}`}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          server={settingsFor.server}
          zone={settingsFor.zone.name}
          type={settingsFor.zone.type}
          canEdit={can(settingsFor.server, "engineer")}
        />
      )}

      <ConfirmDialog
        open={zoneDeleteOpen}
        onOpenChange={setZoneDeleteOpen}
        title={`Delete ${zoneDisplayName(zoneToDelete?.zone ?? "")}?`}
        description={
          <>
            <p>
              {zoneToDelete?.server.name} stops answering for this domain and
              all its records are deleted. This can't be undone.
            </p>
            <p className="mt-2">
              Copies on other servers (Secondary) stay, but stop updating.
            </p>
          </>
        }
        confirmLabel="Delete zone"
        pending={removeZone.isPending}
        onConfirm={() =>
          zoneToDelete &&
          removeZone.mutate(
            { id: zoneToDelete.server.id, zone: zoneToDelete.zone },
            {
              onSuccess: () => {
                whenClosed(setZoneDeleteOpen, zoneToDelete.done)
                toast.success(`Deleted ${zoneDisplayName(zoneToDelete.zone)}`)
              },
              onError: errorToast,
            },
          )
        }
      />

      {recordFor && (
        <RecordEditorLayer
          key={`record-${recordKey}`}
          open={recordOpen}
          onOpenChange={setRecordOpen}
          serverId={recordFor.server.id}
          zone={recordFor.zone}
          record={recordFor.record}
          type={recordFor.type}
        />
      )}

      <ConfirmDialog
        open={recordDeleteOpen}
        onOpenChange={setRecordDeleteOpen}
        title={
          recordToDelete
            ? `Delete ${relativeName(recordToDelete.record.name, recordToDelete.zone)} ${recordToDelete.record.type}?`
            : "Delete record?"
        }
        description={
          recordToDelete && (
            <>
              <p className="font-mono break-all">
                {recordToDelete.record.value}
              </p>
              {apexNs && (
                <p className="mt-2">
                  This is one of the zone's name servers: Secondary copies on it
                  stop being allowed to sync, and resolvers stop asking it.
                </p>
              )}
            </>
          )
        }
        confirmLabel="Delete record"
        pending={recordChange.isPending}
        onConfirm={() =>
          recordToDelete &&
          recordChange.mutate(
            {
              id: recordToDelete.server.id,
              zone: recordToDelete.zone,
              change: {
                op: "delete",
                record: recordBody(recordToDelete.record),
              },
            },
            {
              onSuccess: () => {
                setRecordDeleteOpen(false)
                toast.success("Record deleted")
              },
              onError: errorToast,
            },
          )
        }
      />
    </ActionsContext>
  )
}

// A server's actions. `open` adds the link to its page (lists only).
export function useServerMenu() {
  const a = useDnsActions()
  const can = useDnsCan()
  const router = useRouter()
  return (
    server: DNSServer,
    {
      open = false,
      onRemoved,
    }: { open?: boolean; onRemoved?: () => void } = {},
  ): Item[][] => {
    const online = server.status === "online"
    return [
      open
        ? [
            {
              key: "open",
              label: "Open",
              icon: <ListTree />,
              onSelect: () => router.push(`/dns/${server.id}`),
            },
          ]
        : [],
      [
        ...(can(server, "engineer") && online
          ? [
              {
                key: "new-zone",
                label: "New zone",
                icon: <Plus />,
                onSelect: () => a.newZone(server),
              },
            ]
          : []),
        ...(can(server, "operator")
          ? [
              {
                key: "check",
                label: "Check now",
                icon: <RefreshCw />,
                onSelect: () => a.check(server),
              },
              {
                key: "favorite",
                label: server.favorite
                  ? "Remove from favorites"
                  : "Add to favorites",
                icon: server.favorite ? <StarOff /> : <Star />,
                stay: true,
                onSelect: () => a.toggleFavorite(server),
              },
            ]
          : []),
      ],
      [
        {
          key: "console",
          label: "Open Technitium console",
          icon: <ExternalLink />,
          onSelect: () => {
            const href = consoleHref(server.url)
            if (href) window.open(href, "_blank", "noopener,noreferrer")
          },
        },
        {
          key: "copy",
          label: "Copy address",
          icon: <Copy />,
          onSelect: () => copy(server.url, "Address"),
        },
      ],
      can(server, "owner")
        ? [
            {
              key: "edit",
              label: "Edit connection",
              icon: <Pencil />,
              onSelect: () => a.editServer(server),
            },
            {
              key: "remove",
              label: "Remove server",
              icon: <Trash2 />,
              destructive: true,
              onSelect: () => a.deleteServer(server, onRemoved),
            },
          ]
        : [],
    ]
  }
}

// A zone's actions on one server.
export function useZoneMenu() {
  const a = useDnsActions()
  const can = useDnsCan()
  const router = useRouter()
  return (
    server: DNSServer,
    zone: ZoneInfo,
    {
      open = false,
      onDeleted,
    }: { open?: boolean; onDeleted?: () => void } = {},
  ): Item[][] => {
    const engineer = can(server, "engineer")
    return [
      open
        ? [
            {
              key: "open",
              label: "Records",
              icon: <ListTree />,
              onSelect: () => router.push(zoneHref(server.id, zone.name)),
            },
          ]
        : [],
      [
        {
          key: "settings",
          label: engineer ? "Zone settings" : "View settings",
          icon: <Settings2 />,
          onSelect: () => a.zoneSettings(server, zone),
        },
        ...(copiedZone(zone.type) && can(server, "operator")
          ? [
              {
                key: "resync",
                label: "Copy again from primary",
                icon: <RotateCw />,
                onSelect: () => a.resync(server, zone.name),
              },
            ]
          : []),
        {
          key: "copy",
          label: "Copy name",
          icon: <Copy />,
          onSelect: () => copy(zone.name, "Zone name"),
        },
      ],
      engineer
        ? [
            {
              key: "toggle",
              label: zone.disabled ? "Enable zone" : "Disable zone",
              icon: zone.disabled ? <CircleCheck /> : <CircleOff />,
              onSelect: () => a.toggleZone(server, zone),
            },
            {
              key: "delete",
              label: "Delete zone",
              icon: <Trash2 />,
              destructive: true,
              onSelect: () => a.deleteZone(server, zone.name, onDeleted),
            },
          ]
        : [],
    ]
  }
}

// A record's actions. Records of a copied zone, or of a type Morche can't
// edit, only copy.
export function useRecordMenu(
  server: DNSServer,
  zone: string,
  readOnly: boolean,
) {
  const a = useDnsActions()
  const can = useDnsCan()
  const engineer = can(server, "engineer") && !readOnly
  return (record: DNSRecord): Item[][] => {
    const edit = engineer && record.editable
    return [
      edit
        ? [
            {
              key: "edit",
              label: "Edit",
              icon: <Pencil />,
              onSelect: () => a.editRecord(server, zone, record),
            },
            {
              key: "toggle",
              label: record.disabled ? "Enable" : "Disable",
              icon: record.disabled ? <Eye /> : <EyeOff />,
              onSelect: () => a.toggleRecord(server, zone, record),
            },
          ]
        : [],
      [
        {
          key: "copy-value",
          label: "Copy value",
          icon: <Copy />,
          onSelect: () => copy(record.value, "Value"),
        },
        {
          key: "copy-name",
          label: "Copy name",
          icon: <Copy />,
          onSelect: () => copy(record.name, "Name"),
        },
      ],
      edit
        ? [
            {
              key: "delete",
              label: "Delete",
              icon: <Trash2 />,
              destructive: true,
              onSelect: () => a.deleteRecord(server, zone, record),
            },
          ]
        : [],
    ]
  }
}
