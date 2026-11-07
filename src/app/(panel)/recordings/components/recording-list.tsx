"use client"

import { Download, Ellipsis, Play, SquareTerminal, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Th } from "@/app/(panel)/scripts/components/scripts-view"
import {
  type Item,
  ItemMenu,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type { TerminalRecording } from "@/lib/services"
import { cn } from "@/lib/utils"
import { downloadCast } from "../api"
import { useRecordingsActions } from "./recordings-actions"

export const recordingHref = (id: string) => `/recordings/${id}`

// "4:07", "1:02:33".
export function clock(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = `${total % 60}`.padStart(2, "0")
  return h ? `${h}:${`${m}`.padStart(2, "0")}:${s}` : `${m}:${s}`
}

// How the shell ended, in a few words.
export function endText(r: TerminalRecording) {
  if (r.live) return "Still open"
  if (r.interrupted) return "Morcheh restarted"
  if (r.exit_code === undefined || r.exit_code === null) return "Closed"
  return r.exit_code === 0 ? "Exited" : `Exited with ${r.exit_code}`
}

export function LiveBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2 text-caption font-medium text-destructive",
        className,
      )}
    >
      <span className="size-1.5 animate-pulse rounded-full bg-destructive" />
      Live
    </span>
  )
}

export function useRecordingMenu(r: TerminalRecording, after?: () => void) {
  const router = useRouter()
  const a = useRecordingsActions()
  const groups: Item[][] = [
    [
      {
        key: "play",
        label: "Play",
        icon: <Play />,
        onSelect: () => router.push(recordingHref(r.id)),
      },
      {
        key: "download",
        label: "Download (.cast)",
        icon: <Download />,
        onSelect: () =>
          void downloadCast(r).catch((e: Error) => toast.error(e.message)),
      },
      ...(r.server_id
        ? [
            {
              key: "terminal",
              label: "Open the server's terminal",
              icon: <SquareTerminal />,
              onSelect: () => router.push(`/servers/${r.server_id}/terminal`),
            },
          ]
        : []),
    ],
    r.can_delete
      ? [
          {
            key: "delete",
            label: "Delete",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => a.remove(r, after),
          },
        ]
      : [],
  ]
  return groups
}

export function RecordingTable({
  items,
  showServer = true,
}: {
  items: TerminalRecording[]
  showServer?: boolean
}) {
  return (
    <div className="@container overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <Th>Shell</Th>
            {showServer && <Th>Server</Th>}
            <Th>Opened by</Th>
            <Th>Started</Th>
            <Th>Length</Th>
            <Th className="hidden @3xl:table-cell">Ended</Th>
            <Th className="hidden @4xl:table-cell">Size</Th>
            <th scope="col" className="w-12">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((r) => (
            <Row key={r.id} r={r} showServer={showServer} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Row({ r, showServer }: { r: TerminalRecording; showServer: boolean }) {
  const router = useRouter()
  const menu = useRecordingMenu(r)
  const href = recordingHref(r.id)
  return (
    <tr
      className="h-14 cursor-pointer hover:bg-subtle"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a,button,[role=menu]")) return
        router.push(href)
      }}
    >
      <td className="max-w-72 px-3">
        <span className="flex min-w-0 items-center gap-2">
          <Link
            href={href}
            className="truncate font-medium outline-none hover:text-brand focus-visible:text-brand"
          >
            {r.title}
          </Link>
          {r.live && <LiveBadge />}
        </span>
      </td>
      {showServer && (
        <td className="max-w-48 truncate px-3 text-muted-foreground">
          {r.server_name}
        </td>
      )}
      <td className="max-w-40 truncate px-3 text-muted-foreground">
        {r.mine ? "You" : r.user_name}
      </td>
      <td className="px-3 whitespace-nowrap" title={r.started_at}>
        {timeAgo(r.started_at)}
      </td>
      <td className="px-3 whitespace-nowrap tabular-nums">
        {clock(r.duration_ms)}
      </td>
      <td
        className={cn(
          "hidden px-3 whitespace-nowrap text-muted-foreground @3xl:table-cell",
          !r.live && r.exit_code && "text-destructive",
        )}
      >
        {endText(r)}
      </td>
      <td className="hidden px-3 whitespace-nowrap text-muted-foreground tabular-nums @4xl:table-cell">
        {formatSize(r.size)}
        {r.truncated && <span className="text-ash"> · cut</span>}
      </td>
      <td className="pe-2">
        <ItemMenu groups={menu} label="Recording actions" />
      </td>
    </tr>
  )
}

export function RecordingRows({
  items,
  showServer = true,
}: {
  items: TerminalRecording[]
  showServer?: boolean
}) {
  const [open, setOpen] = useOpen("recording-sheet")
  const [id, setId] = useState<string | null>(null)
  const last = useRef<TerminalRecording | null>(null)
  const current = items.find((r) => r.id === id) ?? last.current
  if (current) last.current = current
  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((r) => (
          <li key={r.id} className="flex items-center">
            <Link
              href={recordingHref(r.id)}
              className="flex min-h-[4.5rem] min-w-0 flex-1 flex-col justify-center gap-0.5 py-3 ps-4 pe-1 outline-none active:bg-muted"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-body font-medium">
                  {showServer ? r.server_name : r.title}
                </span>
                {r.live && <LiveBadge />}
              </span>
              <span className="truncate text-caption text-ash">
                {[
                  showServer ? r.title : "",
                  r.mine ? "You" : r.user_name,
                  timeAgo(r.started_at),
                  clock(r.duration_ms),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </Link>
            <button
              type="button"
              aria-label="Recording actions"
              className="flex size-12 shrink-0 items-center justify-center text-muted-foreground active:bg-muted"
              onClick={() => {
                setId(r.id)
                setOpen(true)
              }}
            >
              <Ellipsis className="size-5" />
            </button>
          </li>
        ))}
      </ul>
      {current && (
        <RecordingSheet r={current} open={open} onOpenChange={setOpen} />
      )}
    </>
  )
}

function RecordingSheet({
  r,
  open,
  onOpenChange,
}: {
  r: TerminalRecording
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useRecordingMenu(r)
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${r.server_name} · ${r.title}`}
    >
      <div className="mx-2 mb-3 flex flex-col gap-1 rounded-2xl bg-subtle p-4 text-body-sm">
        <span>
          {r.mine ? "You" : r.user_name} · {timeAgo(r.started_at)}
        </span>
        <span className="text-caption text-ash">
          {clock(r.duration_ms)} · {endText(r)} · {formatSize(r.size)}
        </span>
      </div>
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}
