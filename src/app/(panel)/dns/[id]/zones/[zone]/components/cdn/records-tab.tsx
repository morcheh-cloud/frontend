"use client"

import {
  Cloud,
  CloudOff,
  Copy,
  Download,
  FileText,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react"
import { parseAsString, useQueryStates } from "nuqs"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import {
  Empty,
  type Item,
  ItemMenu,
  SearchBox,
} from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useOpen } from "@/hooks/useOpen"
import type { CDNRecord, CDNRecords, DNSServer } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useCdnRecordChange,
  useExportCdnRecords,
  useSetCdnDnssec,
} from "../../../../../api"
import {
  ActionSheet,
  chipClass,
  Tag,
  Th,
} from "../../../../../components/parts"
import { canCloud, cdnValue, fullName, ttlLabel } from "./meta"
import { SettingCard } from "./parts"
import { CdnRecordEditor } from "./record-editor"

const filters = {
  type: parseAsString.withDefault(""),
  q: parseAsString.withDefault(""),
}

const typeRank: Record<string, number> = { NS: 0, A: 1, AAAA: 2, CNAME: 3 }

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${what} copied`, { description: text })
  } catch {
    toast.error("Couldn't access the clipboard")
  }
}

// The records layers (editor, delete, import) for one domain, opened from
// the tab and the page header.
export function useRecordLayers(server: DNSServer, zone: string) {
  const [editorOpen, setEditorOpen] = useOpen("cdn-record")
  const [editing, setEditing] = useState<{ record?: CDNRecord; key: number }>({
    key: 0,
  })
  const [deleteOpen, setDeleteOpen] = useOpen("cdn-record-delete")
  const [toDelete, setToDelete] = useState<CDNRecord>()
  const [importOpen, setImportOpen] = useOpen("cdn-records-import")
  const change = useCdnRecordChange()

  const layers = (
    <>
      <CdnRecordEditor
        key={editing.key}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        serverId={server.id}
        zone={zone}
        record={editing.record}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={
          toDelete
            ? `Delete ${fullName(toDelete.name, zone)} ${toDelete.type}?`
            : "Delete record?"
        }
        description={
          toDelete && (
            <>
              <p className="font-mono break-all">{cdnValue(toDelete)}</p>
              {toDelete.cloud && (
                <p className="mt-2">
                  It goes through the CDN: the site on this name stops
                  answering.
                </p>
              )}
            </>
          )
        }
        confirmLabel="Delete record"
        pending={change.isPending}
        onConfirm={() =>
          toDelete &&
          change.mutate(
            {
              id: server.id,
              zone,
              change: { op: "delete", recordId: toDelete.id },
            },
            {
              onSuccess: () => {
                setDeleteOpen(false)
                toast.success("Record deleted")
              },
              onError: (e) => toast.error(e.message),
            },
          )
        }
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        server={server}
        zone={zone}
      />
    </>
  )

  return {
    layers,
    add: () => {
      setEditing((e) => ({ key: e.key + 1 }))
      setEditorOpen(true)
    },
    edit: (record: CDNRecord) => {
      setEditing((e) => ({ record, key: e.key + 1 }))
      setEditorOpen(true)
    },
    remove: (record: CDNRecord) => {
      setToDelete(record)
      setDeleteOpen(true)
    },
    importFile: () => setImportOpen(true),
  }
}

export type RecordLayers = ReturnType<typeof useRecordLayers>

export function RecordsTab({
  server,
  zone,
  data,
  fetching,
  refetch,
  canEdit,
  phone,
  layers,
}: {
  server: DNSServer
  zone: string
  data?: CDNRecords
  fetching: boolean
  refetch: () => void
  canEdit: boolean
  phone: boolean
  layers: RecordLayers
}) {
  const [{ type, q }, setFilters] = useQueryStates(filters, {
    history: "replace",
  })
  const change = useCdnRecordChange()
  const exporter = useExportCdnRecords()
  const [sheetOpen, setSheetOpen] = useOpen("cdn-record-sheet")
  const [sheetFor, setSheetFor] = useState<CDNRecord>()

  const all = [...(data?.records ?? [])].sort((a, b) => {
    if (a.name !== b.name) {
      if (a.name === "@") return -1
      if (b.name === "@") return 1
      return a.name.localeCompare(b.name)
    }
    return (typeRank[a.type] ?? 9) - (typeRank[b.type] ?? 9)
  })
  const counts = new Map<string, number>()
  for (const r of all) counts.set(r.type, (counts.get(r.type) ?? 0) + 1)
  const types = [...counts.keys()].sort(
    (a, b) => (typeRank[a] ?? 9) - (typeRank[b] ?? 9) || a.localeCompare(b),
  )
  const needle = q.trim().toLowerCase()
  const shown = all.filter(
    (r) =>
      (!type || r.type === type) &&
      (!needle ||
        fullName(r.name, zone).toLowerCase().includes(needle) ||
        cdnValue(r).toLowerCase().includes(needle)),
  )

  function toggleCloud(r: CDNRecord, on: boolean) {
    change.mutate(
      {
        id: server.id,
        zone,
        change: { op: "cloud", recordId: r.id, cloud: on },
      },
      {
        onSuccess: () =>
          toast.success(
            `${fullName(r.name, zone)} ${on ? "goes through the CDN" : "is DNS only"}`,
            {
              description: on
                ? "Visitors now reach ArvanCloud, which reaches the origin."
                : "Visitors go straight to the address; the CDN no longer protects or caches it.",
            },
          ),
        onError: (e) => toast.error(e.message),
      },
    )
  }

  function exportFile() {
    exporter.mutate(
      { id: server.id, zone },
      {
        onSuccess: ({ text }) => {
          const url = URL.createObjectURL(
            new Blob([text], { type: "text/plain" }),
          )
          const a = document.createElement("a")
          a.href = url
          a.download = `${zone}.zone`
          a.click()
          URL.revokeObjectURL(url)
        },
        onError: (e) => toast.error(e.message),
      },
    )
  }

  const menuFor = (r: CDNRecord): Item[][] => {
    const edit = canEdit && r.editable
    return [
      edit
        ? [
            {
              key: "edit",
              label: "Edit",
              icon: <Pencil />,
              onSelect: () => layers.edit(r),
            },
            ...(canCloud(r.type)
              ? [
                  {
                    key: "cloud",
                    label: r.cloud
                      ? "Make it DNS only"
                      : "Put it through the CDN",
                    icon: r.cloud ? <CloudOff /> : <Cloud />,
                    onSelect: () => toggleCloud(r, !r.cloud),
                  },
                ]
              : []),
          ]
        : [],
      [
        {
          key: "copy-value",
          label: "Copy value",
          icon: <Copy />,
          onSelect: () => copy(cdnValue(r), "Value"),
        },
        {
          key: "copy-name",
          label: "Copy name",
          icon: <Copy />,
          onSelect: () => copy(fullName(r.name, zone), "Name"),
        },
      ],
      edit
        ? [
            {
              key: "delete",
              label: "Delete",
              icon: <Trash2 />,
              destructive: true,
              onSelect: () => layers.remove(r),
            },
          ]
        : [],
    ]
  }

  const chips = [
    { value: "", label: "All", count: all.length },
    ...types.map((t) => ({ value: t, label: t, count: counts.get(t) ?? 0 })),
  ]

  const toolbar = (
    <div
      className={cn(
        "flex items-center gap-3",
        phone && "flex-col items-stretch gap-2 px-4 pt-3",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <SearchBox
          value={q}
          onChange={(v) => setFilters({ q: v || null })}
          placeholder="Search records"
          label="Search records"
        />
        {phone && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh records"
            disabled={fetching}
            onClick={refetch}
          >
            <RefreshCw className={cn(fetching && "animate-spin")} />
          </Button>
        )}
      </div>
      <nav
        aria-label="Record type"
        className={cn(
          "no-scrollbar flex min-w-0 gap-1.5 overflow-x-auto",
          phone && "-mx-4 gap-2 px-4",
        )}
      >
        {chips.map((c) => (
          <button
            key={c.value || "all"}
            type="button"
            aria-current={type === c.value ? "page" : undefined}
            onClick={() => setFilters({ type: c.value || null })}
            className={cn(chipClass, !phone && "h-8 px-3")}
          >
            {c.label}
            <span className="tabular-nums opacity-70">{c.count}</span>
          </button>
        ))}
      </nav>
      {!phone && (
        <>
          <span className="flex-1" />
          <ItemMenu
            label="Zone file"
            groups={[
              [
                {
                  key: "export",
                  label: "Download as zone file",
                  icon: <Download />,
                  onSelect: exportFile,
                },
                ...(canEdit
                  ? [
                      {
                        key: "import",
                        label: "Add from a zone file…",
                        icon: <Upload />,
                        onSelect: layers.importFile,
                      },
                    ]
                  : []),
              ],
            ]}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh records"
            disabled={fetching}
            onClick={refetch}
          >
            <RefreshCw className={cn(fetching && "animate-spin")} />
          </Button>
        </>
      )}
    </div>
  )

  let body: ReactNode
  if (!data) {
    body = (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    )
  } else if (shown.length === 0) {
    body = (
      <Empty
        icon={FileText}
        title={q || type ? "No record matches" : "No records yet"}
        body={
          q || type
            ? "Try another name or value, or show every type."
            : "Add an A record to point the domain at a server."
        }
        action={
          q || type ? (
            <Button
              variant="outline"
              onClick={() => setFilters({ q: null, type: null })}
            >
              Clear filters
            </Button>
          ) : (
            canEdit && (
              <Button onClick={layers.add}>
                <Plus />
                Add record
              </Button>
            )
          )
        }
      />
    )
  } else if (phone) {
    body = (
      <ul className="divide-y divide-border border-y border-border">
        {shown.map((r) => (
          <li key={r.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setSheetFor(r)
                setSheetOpen(true)
              }}
              className="flex min-h-16 min-w-0 flex-1 flex-col justify-center gap-0.5 py-3 ps-4 text-start outline-none active:bg-muted"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-mono text-body font-medium">
                  {r.name}
                </span>
                <Tag>{r.type}</Tag>
                {r.protected && <Lock className="size-3.5 text-ash" />}
              </span>
              <span className="truncate font-mono text-body-sm text-muted-foreground">
                {cdnValue(r)}
              </span>
            </button>
            {canCloud(r.type) && (
              <CloudSwitch
                record={r}
                disabled={!canEdit || !r.editable}
                onChange={(on) => toggleCloud(r, on)}
                phone
              />
            )}
          </li>
        ))}
      </ul>
    )
  } else {
    body = (
      <div className="@container overflow-hidden rounded-2xl border border-border [contain:inline-size]">
        <table className="w-full table-fixed text-body-sm">
          <colgroup>
            <col className="w-[20%]" />
            <col className="w-20" />
            <col />
            <col className="w-36" />
            <col className="hidden w-24 @3xl:table-column" />
            <col className="w-12" />
          </colgroup>
          <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
            <tr>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Value</Th>
              <Th>CDN</Th>
              <Th className="hidden @3xl:table-cell">TTL</Th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((r) => {
              const edit = canEdit && r.editable
              return (
                <tr key={r.id} className="h-12 hover:bg-subtle">
                  <td
                    className="truncate px-3 font-mono"
                    title={fullName(r.name, zone)}
                  >
                    {edit ? (
                      <button
                        type="button"
                        onClick={() => layers.edit(r)}
                        className="max-w-full truncate font-medium outline-none hover:text-brand focus-visible:text-brand"
                      >
                        {r.name}
                      </button>
                    ) : (
                      <span className="inline-flex max-w-full items-center gap-1.5 font-medium">
                        <span className="truncate">{r.name}</span>
                        {r.protected && (
                          <Lock
                            className="size-3.5 shrink-0 text-ash"
                            aria-label="Kept by ArvanCloud"
                          />
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-3">
                    <Tag>{r.type}</Tag>
                  </td>
                  <td
                    className="truncate px-3 font-mono text-muted-foreground"
                    title={cdnValue(r)}
                  >
                    {cdnValue(r)}
                    {(r.addresses?.length ?? 0) > 1 && (
                      <span className="ms-2 font-sans text-caption text-ash">
                        {r.addresses?.length} addresses
                      </span>
                    )}
                  </td>
                  <td className="px-3">
                    {canCloud(r.type) ? (
                      <CloudSwitch
                        record={r}
                        disabled={!edit}
                        onChange={(on) => toggleCloud(r, on)}
                      />
                    ) : (
                      <span className="text-ash">—</span>
                    )}
                  </td>
                  <td className="hidden px-3 whitespace-nowrap text-muted-foreground @3xl:table-cell">
                    {r.cloud ? "Auto" : ttlLabel(r.ttl ?? 120)}
                  </td>
                  <td className="pe-3">
                    <ItemMenu
                      groups={menuFor(r)}
                      label={`${r.name} ${r.type} actions`}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {toolbar}
      {body}
      {data && (
        <DnssecCard
          server={server}
          zone={zone}
          data={data}
          canEdit={canEdit}
          phone={phone}
        />
      )}
      {phone && (
        <div className="flex gap-2 px-4">
          <Button variant="outline" className="flex-1" onClick={exportFile}>
            <Download />
            Zone file
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={layers.importFile}
            >
              <Upload />
              Import
            </Button>
          )}
        </div>
      )}
      <ActionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={
          sheetFor ? `${fullName(sheetFor.name, zone)} ${sheetFor.type}` : ""
        }
        head={
          sheetFor && (
            <p className="mx-2 mb-3 rounded-2xl bg-subtle p-4 font-mono text-caption break-all">
              {cdnValue(sheetFor)}
            </p>
          )
        }
        groups={sheetFor ? menuFor(sheetFor) : []}
      />
    </div>
  )
}

function CloudSwitch({
  record: r,
  disabled,
  onChange,
  phone,
}: {
  record: CDNRecord
  disabled: boolean
  onChange: (on: boolean) => void
  phone?: boolean
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the Base UI switch renders the control inside
    <label
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap",
        phone && "me-3 min-h-11 flex-col justify-center gap-1",
      )}
    >
      <Switch
        checked={r.cloud}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-label={`${r.name} through the CDN`}
      />
      <span
        className={cn(
          "inline-flex items-center gap-1 text-caption",
          r.cloud ? "text-brand" : "text-muted-foreground",
        )}
      >
        {r.cloud ? (
          <Cloud className="size-3.5" />
        ) : (
          !phone && <CloudOff className="size-3.5" />
        )}
        {r.cloud ? "CDN" : "DNS only"}
      </span>
    </label>
  )
}

function DnssecCard({
  server,
  zone,
  data,
  canEdit,
  phone,
}: {
  server: DNSServer
  zone: string
  data: CDNRecords
  canEdit: boolean
  phone: boolean
}) {
  const set = useSetCdnDnssec()
  const [confirmOpen, setConfirmOpen] = useOpen("cdn-dnssec-off")
  const sec = data.dnssec
  if (!sec.known) return null
  const toggle = (enabled: boolean) =>
    set.mutate(
      { id: server.id, zone, enabled },
      {
        onSuccess: (s) => {
          setConfirmOpen(false)
          toast.success(s.enabled ? "DNSSEC on" : "DNSSEC off", {
            description: s.enabled
              ? "Give the DS record to the registrar to finish."
              : "Remove the DS record at the registrar first, or resolvers fail the domain.",
          })
        },
        onError: (e) => toast.error(e.message),
      },
    )
  return (
    <SettingCard
      phone={phone}
      title="DNSSEC"
      hint="Signs the answers so resolvers can tell they're real."
      action={
        <span className="flex items-center gap-2">
          {sec.enabled && (
            <Tag tone="brand">
              <ShieldCheck className="me-1 size-3" />
              On
            </Tag>
          )}
          <Switch
            checked={sec.enabled}
            disabled={!canEdit || set.isPending}
            onCheckedChange={(on) => (on ? toggle(true) : setConfirmOpen(true))}
            aria-label="DNSSEC"
          />
        </span>
      }
    >
      {sec.enabled && sec.ds ? (
        <Field
          label="DS record for the registrar"
          hint="Add it where the domain is registered; until then DNSSEC isn't checked."
        >
          {(p) => (
            <div className="flex items-start gap-2">
              <code
                id={p.id}
                className="min-w-0 flex-1 rounded-lg bg-subtle px-3 py-2 font-mono text-caption break-all"
              >
                {sec.ds}
              </code>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Copy DS record"
                onClick={() => copy(sec.ds ?? "", "DS record")}
              >
                <Copy />
              </Button>
            </div>
          )}
        </Field>
      ) : (
        <p className="text-body-sm text-muted-foreground">
          Off. Turn it on, then give the DS record ArvanCloud makes to your
          registrar.
        </p>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Turn DNSSEC off?"
        description="If the registrar still has the DS record, resolvers that check DNSSEC stop finding the domain. Remove it there first and wait a day."
        confirmLabel="Turn off"
        pending={set.isPending}
        onConfirm={() => toggle(false)}
      />
    </SettingCard>
  )
}

function ImportDialog({
  open,
  onOpenChange,
  server,
  zone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: DNSServer
  zone: string
}) {
  const [text, setText] = useState("")
  const change = useCdnRecordChange()
  const lines = text.split("\n").filter((l) => /\sIN\s/i.test(l)).length
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add records from a zone file"
      description={`BIND format. The records are added to ${zone}; existing ones stay.`}
      footer={
        <>
          <Button
            variant="outline"
            className="max-md:hidden"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="lg"
            className="md:h-9"
            disabled={!text.trim() || change.isPending}
            onClick={() =>
              change.mutate(
                { id: server.id, zone, change: { op: "import", text } },
                {
                  onSuccess: () => {
                    toast.success("Records added")
                    setText("")
                    onOpenChange(false)
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            <Upload />
            Add{" "}
            {lines > 0 ? `${lines} record${lines === 1 ? "" : "s"}` : "records"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 pb-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          spellCheck={false}
          className="font-mono text-caption"
          placeholder={
            "www   3600  IN  A      203.0.113.10\nmail  3600  IN  CNAME  mx.example.net."
          }
          aria-label="Zone file"
        />
        <label className="w-fit cursor-pointer text-body-sm font-medium text-brand hover:underline">
          Or pick a file…
          <input
            type="file"
            accept=".zone,.txt,.db,text/plain"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f) setText(await f.text())
            }}
          />
        </label>
      </div>
    </ResponsiveDialog>
  )
}
