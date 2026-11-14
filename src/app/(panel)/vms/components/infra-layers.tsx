"use client"

import {
  CloudDownload,
  Copy,
  FileArchive,
  HardDrive,
  Loader2,
  Network,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import Link from "next/link"
import { type FormEvent, useRef, useState } from "react"
import { toast } from "sonner"

import { useJobActions } from "@/components/jobs/jobs-provider"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useOpen } from "@/hooks/useOpen"
import { api } from "@/lib/api"
import { formatDuration, formatSize } from "@/lib/format"
import type { PVEStorage, PVEVolume } from "@/lib/services"
import { cn } from "@/lib/utils"

import {
  Facts,
  type Item,
  ItemMenu,
  Segmented,
} from "../../servers/[id]/components/parts"
import { Meter } from "../../servers/[id]/components/resources"
import {
  type Timeframe,
  uploadToStorage,
  useNode,
  useNodeRrd,
  useStorageContent,
  type VolumeContent,
} from "../api"
import { Pick } from "./form-parts"
import {
  contentLabels,
  GuestTile,
  guestName,
  guestState,
  guestStateMeta,
  newVmHref,
  nodeStatusMeta,
  StatusDot,
  vmHref,
} from "./meta"
import { RrdCharts, TimeframePicker, VmLayer } from "./parts"
import { useVmCan } from "./permissions"
import { copy } from "./vm-actions"

// ---- node

function UsageRow({
  label,
  used,
  total,
  text,
}: {
  label: string
  used: number
  total: number
  text?: string
}) {
  const pct = total ? Math.min(100, (used / total) * 100) : 0
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-body-sm">
        <span className="font-medium">{label}</span>
        <span className="text-caption text-muted-foreground tabular-nums">
          {text ?? `${formatSize(used)} of ${formatSize(total)}`}
        </span>
      </div>
      <Meter value={pct} label={label} />
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 mb-2 px-2 font-label text-[11px] tracking-label text-ash uppercase md:px-0">
      {children}
    </h3>
  )
}

export function NodeLayer({
  open,
  onOpenChange,
  cluster,
  node,
  onStorage,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cluster: string
  node: string
  onStorage?: (s: PVEStorage) => void
}) {
  const [tf, setTf] = useState<Timeframe>("hour")
  const can = useVmCan()
  const q = useNode(cluster, node, open)
  const rrd = useNodeRrd(cluster, node, tf, open)
  const n = q.data
  const status = nodeStatusMeta[n?.status ?? "unknown"]

  return (
    <VmLayer
      open={open}
      onOpenChange={onOpenChange}
      title={node}
      description={n ? `Node in ${n.cluster_name}` : undefined}
      wide
      footer={
        can(cluster, "engineer") &&
        n?.status === "online" && (
          <Button
            render={<Link href={newVmHref({ cluster, node })} />}
            nativeButton={false}
            className="max-md:h-11 max-md:flex-1"
          >
            <Plus />
            New machine here
          </Button>
        )
      }
    >
      {q.isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-ash" />
        </div>
      ) : q.isError || !n ? (
        <p className="text-body-sm text-destructive">
          {q.error?.message ?? "Couldn't read this node."}
        </p>
      ) : (
        <>
          <Facts
            items={[
              {
                label: "Status",
                value: (
                  <span className="inline-flex items-center gap-2">
                    <StatusDot tone={status.dot} />
                    {status.label}
                  </span>
                ),
              },
              {
                label: "Up for",
                value: n.uptime ? formatDuration(n.uptime) : "—",
              },
              {
                label: "Processor",
                value: `${n.cores} cores${n.sockets > 1 ? ` · ${n.sockets} sockets` : ""}`,
              },
              {
                label: "Load",
                value: n.load.length
                  ? n.load.map((l) => l.toFixed(2)).join(" · ")
                  : "—",
              },
              { label: "Model", value: n.cpu_model || "—", wide: true },
              { label: "Proxmox", value: n.pve_version || "—" },
              { label: "Kernel", value: n.kernel || "—" },
            ]}
          />
          <div className="flex flex-col gap-4 px-2 md:px-0">
            <UsageRow
              label="CPU"
              used={n.cpu}
              total={1}
              text={`${Math.round(n.cpu * 100)}% · waiting on disks ${(n.io_wait * 100).toFixed(1)}%`}
            />
            <UsageRow label="Memory" used={n.mem} total={n.max_mem} />
            {n.swap_total > 0 && (
              <UsageRow label="Swap" used={n.swap_used} total={n.swap_total} />
            )}
            <UsageRow
              label="System disk"
              used={n.root_used}
              total={n.root_total}
            />
          </div>

          <div className="mt-6 mb-3 flex items-center gap-2 px-2 md:px-0">
            <h3 className="font-label text-[11px] tracking-label text-ash uppercase">
              History
            </h3>
            <div className="ms-auto max-md:overflow-x-auto">
              <TimeframePicker value={tf} onChange={setTf} />
            </div>
          </div>
          <div className="md:[&_section]:p-4">
            <RrdCharts
              points={rrd.data?.points ?? []}
              kind="node"
              loading={rrd.isPending}
            />
          </div>

          <SectionTitle>
            Machines · {n.running} of {n.guest_list.length} running
          </SectionTitle>
          {n.guest_list.length === 0 ? (
            <p className="px-2 text-body-sm text-muted-foreground md:px-0">
              Nothing runs on this node.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border max-md:rounded-none max-md:border-x-0">
              {n.guest_list
                .toSorted((a, b) => a.vmid - b.vmid)
                .map((g) => {
                  const st = guestStateMeta[guestState(g)]
                  return (
                    <li key={g.vmid}>
                      <Link
                        href={vmHref(g.cluster_id, g.vmid)}
                        onClick={() => onOpenChange(false)}
                        className="flex min-h-12 items-center gap-3 px-3 py-2 text-body-sm hover:bg-subtle active:bg-muted"
                      >
                        <GuestTile guest={g} className="size-8" />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {guestName(g)}
                          <span className="ms-2 font-normal text-ash tabular-nums">
                            {g.vmid}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
                          <StatusDot tone={st.dot} />
                          {st.label}
                        </span>
                      </Link>
                    </li>
                  )
                })}
            </ul>
          )}

          <SectionTitle>Storage</SectionTitle>
          <ul className="divide-y divide-border rounded-2xl border border-border max-md:rounded-none max-md:border-x-0">
            {n.storages.map((s) => (
              <li key={s.storage}>
                <button
                  type="button"
                  disabled={!onStorage}
                  onClick={() => onStorage?.(s)}
                  className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-start text-body-sm enabled:hover:bg-subtle enabled:active:bg-muted"
                >
                  <HardDrive className="size-4 shrink-0 text-ash" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {s.storage}
                    </span>
                    <span className="block truncate text-caption text-muted-foreground">
                      {s.type}
                      {s.shared && " · shared"}
                    </span>
                  </span>
                  <span className="w-28">
                    <Meter
                      value={s.total ? (s.used / s.total) * 100 : 0}
                      label={`${s.storage} used`}
                    />
                    <span className="mt-1 block text-end text-caption text-muted-foreground tabular-nums">
                      {formatSize(s.used)} of {formatSize(s.total)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {n.bridges.length > 0 && (
            <>
              <SectionTitle>Networks</SectionTitle>
              <ul className="divide-y divide-border rounded-2xl border border-border max-md:rounded-none max-md:border-x-0">
                {n.bridges.map((b) => (
                  <li
                    key={b.name}
                    className="flex min-h-12 items-center gap-3 px-3 py-2 text-body-sm"
                  >
                    <Network className="size-4 shrink-0 text-ash" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {b.name}
                      </span>
                      <span className="block truncate text-caption text-muted-foreground">
                        {[b.type, b.cidr, b.comment]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <StatusDot
                      tone={b.active ? "bg-success" : "bg-mist"}
                      className="me-1"
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </VmLayer>
  )
}

// ---- storage

const browsable: VolumeContent[] = [
  "iso",
  "vztmpl",
  "backup",
  "images",
  "rootdir",
  "snippets",
  "import",
]

const fileDate = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

// The file part of "local:iso/debian-12.iso".
const volumeName = (v: PVEVolume) =>
  v.name || v.volid.replace(/^[^:]+:/, "").replace(/^[^/]+\//, "")

export function StorageLayer({
  open,
  onOpenChange,
  storage,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  storage: PVEStorage | null
}) {
  const s = storage
  const kinds = browsable.filter((k) => s?.content.includes(k))
  const [picked, setPicked] = useState<VolumeContent | null>(null)
  const content = picked && kinds.includes(picked) ? picked : (kinds[0] ?? "")
  const can = useVmCan()
  const engineer = !!s && can(s.cluster_id, "engineer")
  const owner = !!s && can(s.cluster_id, "owner")
  const list = useStorageContent(
    s?.cluster_id ?? "",
    s?.node ?? "",
    s?.storage ?? "",
    content,
    open && !!s && kinds.length > 0,
  )
  const [downloadOpen, setDownloadOpen] = useOpen("pve-storage-download")
  const [deleteOpen, setDeleteOpen] = useOpen("pve-volume-delete")
  const [doomed, setDoomed] = useState<PVEVolume | null>(null)
  const [deleting, setDeleting] = useState(false)
  const jobs = useJobActions()
  const upload = useUpload(s)
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadable = content === "iso" || content === "vztmpl"

  if (!s) return null

  const remove = async () => {
    if (!doomed) return
    setDeleting(true)
    try {
      jobs.track(
        await api.virtualMachines.deletePveVolume(
          s.cluster_id,
          s.node,
          s.storage,
          {
            volid: doomed.volid,
          },
        ),
      )
      setDeleteOpen(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  const menu = (v: PVEVolume): Item[][] => [
    [
      {
        key: "copy",
        label: "Copy volume ID",
        icon: <Copy />,
        onSelect: () => copy(v.volid, "Volume ID"),
      },
    ],
    owner
      ? [
          {
            key: "delete",
            label: v.protected ? "Protected" : "Delete",
            icon: <Trash2 />,
            destructive: true,
            disabled: v.protected,
            onSelect: () => {
              setDoomed(v)
              setDeleteOpen(true)
            },
          },
        ]
      : [],
  ]

  const items = (list.data?.items ?? []).toSorted(
    (a, b) => (b.created ?? 0) - (a.created ?? 0),
  )

  return (
    <VmLayer
      open={open}
      onOpenChange={onOpenChange}
      title={s.storage}
      description={`${s.type}${s.shared ? " · shared by every node" : ` on ${s.node}`} · ${s.cluster_name}`}
    >
      <div className="px-2 md:px-0">
        <div className="mb-1.5 flex items-baseline justify-between text-body-sm">
          <span className="font-medium">Used</span>
          <span className="text-caption text-muted-foreground tabular-nums">
            {formatSize(s.used)} of {formatSize(s.total)}
          </span>
        </div>
        <Meter
          value={s.total ? (s.used / s.total) * 100 : 0}
          label="Storage used"
        />
        <p className="mt-2 text-caption text-muted-foreground">
          Holds{" "}
          {s.content.map((c) => contentLabels[c] ?? c).join(", ") || "nothing"}.
        </p>
      </div>

      {kinds.length === 0 ? (
        <p className="mt-6 px-2 text-body-sm text-muted-foreground md:px-0">
          Nothing on this storage can be browsed here.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2 px-2 md:px-0">
            <div className="max-w-full [scrollbar-width:none] overflow-x-auto">
              <Segmented
                label="Show"
                value={content}
                onChange={setPicked}
                items={kinds.map((k) => ({
                  value: k,
                  label: contentLabels[k] ?? k,
                }))}
              />
            </div>
            {engineer && uploadable && (
              <div className="flex gap-2 md:ms-auto">
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  accept={
                    content === "iso"
                      ? ".iso,.img"
                      : ".tar.gz,.tar.xz,.tar.zst,.tgz"
                  }
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ""
                    if (f) upload.start(f, content as "iso" | "vztmpl")
                  }}
                />
                <Button
                  variant="outline"
                  className="max-md:h-11"
                  disabled={!!upload.state}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload />
                  Upload
                </Button>
                <Button
                  variant="outline"
                  className="max-md:h-11"
                  onClick={() => setDownloadOpen(true)}
                >
                  <CloudDownload />
                  From a URL
                </Button>
              </div>
            )}
          </div>

          {upload.state && (
            <div className="mx-2 mt-3 rounded-2xl border border-border p-3 md:mx-0">
              <div className="flex items-center gap-2 text-body-sm">
                <Upload className="size-4 text-ash" />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {upload.state.name}
                </span>
                <span className="text-caption text-muted-foreground tabular-nums">
                  {formatSize(upload.state.loaded)} of{" "}
                  {formatSize(upload.state.total)}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Cancel the upload"
                  onClick={upload.cancel}
                >
                  <X />
                </Button>
              </div>
              <Meter
                value={(upload.state.loaded / upload.state.total) * 100}
                label="Upload progress"
                className="mt-2"
              />
              <p className="mt-1.5 text-caption text-muted-foreground">
                Keep this page open until it finishes; Proxmox then checks the
                file in the background.
              </p>
            </div>
          )}

          <div className="mt-3">
            {list.isPending ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-5 animate-spin text-ash" />
              </div>
            ) : list.isError ? (
              <p className="px-2 text-body-sm text-destructive md:px-0">
                {list.error.message}
              </p>
            ) : items.length === 0 ? (
              <p className="px-2 py-6 text-center text-body-sm text-muted-foreground md:px-0">
                No {contentLabels[content]?.toLowerCase() ?? "files"} here yet.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border max-md:rounded-none max-md:border-x-0">
                {items.map((v) => (
                  <li
                    key={v.volid}
                    className="flex min-h-14 items-center gap-3 py-2 ps-3 pe-1"
                  >
                    <FileArchive className="size-4 shrink-0 text-ash" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm font-medium">
                        {volumeName(v)}
                      </span>
                      <span className="block truncate text-caption text-muted-foreground">
                        {[
                          formatSize(v.size),
                          v.format,
                          v.vmid ? `machine ${v.vmid}` : "",
                          v.created ? fileDate.format(v.created * 1000) : "",
                          v.protected ? "protected" : "",
                          v.notes ?? "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <ItemMenu
                      groups={menu(v)}
                      label={`${volumeName(v)} actions`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {uploadable && (
        <DownloadDialog
          open={downloadOpen}
          onOpenChange={setDownloadOpen}
          storage={s}
          content={content as "iso" | "vztmpl"}
        />
      )}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${doomed ? volumeName(doomed) : "this file"}?`}
        description={
          doomed?.content === "backup"
            ? "This backup is gone for good; it can't be restored afterwards."
            : "The file is removed from the storage. Machines that still use it may not start."
        }
        confirmLabel="Delete"
        pending={deleting}
        onConfirm={remove}
      />
    </VmLayer>
  )
}

// Uploads one file at a time and hands the import to the jobs list.
function useUpload(s: PVEStorage | null) {
  const jobs = useJobActions()
  const [state, setState] = useState<{
    name: string
    loaded: number
    total: number
  } | null>(null)
  const abort = useRef<AbortController | null>(null)

  const start = async (file: File, content: "iso" | "vztmpl") => {
    if (!s) return
    const ctrl = new AbortController()
    abort.current = ctrl
    setState({ name: file.name, loaded: 0, total: file.size || 1 })
    try {
      const job = await uploadToStorage(s.cluster_id, s.node, s.storage, file, {
        content,
        filename: file.name,
        signal: ctrl.signal,
        onProgress: (loaded) => setState((st) => (st ? { ...st, loaded } : st)),
      })
      jobs.track(job)
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        toast.error("The upload failed", { description: (e as Error).message })
    } finally {
      abort.current = null
      setState(null)
    }
  }
  return { state, start, cancel: () => abort.current?.abort() }
}

const algorithms = [
  { value: "", label: "Don't check" },
  { value: "sha256", label: "SHA-256" },
  { value: "sha512", label: "SHA-512" },
  { value: "sha1", label: "SHA-1" },
  { value: "md5", label: "MD5" },
] as const

function DownloadDialog({
  open,
  onOpenChange,
  storage,
  content,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  storage: PVEStorage
  content: "iso" | "vztmpl"
}) {
  const jobs = useJobActions()
  const [url, setUrl] = useState("")
  const [filename, setFilename] = useState("")
  const [algorithm, setAlgorithm] =
    useState<(typeof algorithms)[number]["value"]>("")
  const [checksum, setChecksum] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  const guessed = (() => {
    try {
      return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "")
    } catch {
      return ""
    }
  })()
  const valid = /^https?:\/\/\S+$/i.test(url.trim())

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid) {
      setError("Enter an http(s) address.")
      return
    }
    setPending(true)
    setError("")
    try {
      jobs.track(
        await api.virtualMachines.downloadPveStorageUrl(
          storage.cluster_id,
          storage.node,
          storage.storage,
          {
            url: url.trim(),
            content,
            filename: (filename || guessed).trim() || undefined,
            algorithm: algorithm || undefined,
            checksum: algorithm ? checksum.trim() : undefined,
          },
        ),
      )
      onOpenChange(false)
      setUrl("")
      setFilename("")
      setChecksum("")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={content === "iso" ? "Download an ISO" : "Download a template"}
      description={`${storage.node} fetches the file itself and saves it on ${storage.storage}.`}
      className="sm:max-w-lg"
      footer={
        <>
          <Button
            variant="outline"
            className="max-md:h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="pve-download"
            disabled={pending}
            className="max-md:h-11"
          >
            {pending && <Loader2 className="animate-spin" />}
            Download
          </Button>
        </>
      }
    >
      <form id="pve-download" onSubmit={submit} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="pve-dl-url">Address</Label>
          <Input
            id="pve-dl-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder={
              content === "iso"
                ? "https://cdimage.debian.org/…/debian-12-netinst.iso"
                : "http://download.proxmox.com/images/system/…tar.zst"
            }
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-invalid={!!error || undefined}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pve-dl-name">File name</Label>
          <Input
            id="pve-dl-name"
            autoComplete="off"
            spellCheck={false}
            placeholder={guessed || "Taken from the address"}
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5 sm:grid-cols-[10rem_1fr] sm:gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="pve-dl-algo">Checksum</Label>
            <Pick
              id="pve-dl-algo"
              value={algorithm}
              onChange={setAlgorithm}
              items={algorithms.map((a) => ({ ...a }))}
            />
          </div>
          <div className={cn("grid gap-1.5", !algorithm && "opacity-60")}>
            <Label htmlFor="pve-dl-sum">Expected value</Label>
            <Input
              id="pve-dl-sum"
              autoComplete="off"
              spellCheck={false}
              disabled={!algorithm}
              className="font-mono"
              value={checksum}
              onChange={(e) => setChecksum(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-body-sm text-destructive">{error}</p>}
      </form>
    </ResponsiveDialog>
  )
}
