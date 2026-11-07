"use client"

import {
  ChevronLeft,
  Download,
  Ellipsis,
  MonitorPlay,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Callout } from "@/app/(panel)/ansible/components/run-layer"
import {
  Empty,
  type Item,
  ItemMenu,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBackOr } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type { TerminalRecording } from "@/lib/services"
import { cn } from "@/lib/utils"
import { downloadCast, useRecording } from "../api"
import { CastPlayer } from "./cast-player"
import {
  clock,
  endText,
  LiveBadge,
  recordingHref,
  useRecordingMenu,
} from "./recording-list"

export function RecordingFromRoute() {
  const { id } = useParams<{ id: string }>()
  const phone = useIsPhone()
  if (phone === null) return null
  return <RecordingPage key={id} id={id} phone={phone} />
}

const when = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})

function RecordingPage({ id, phone }: { id: string; phone: boolean }) {
  const query = useRecording(id)
  const r = query.data
  usePageCrumbs([
    {
      href: recordingHref(id),
      label: r ? `${r.server_name} · ${r.title}` : "Recording",
    },
  ])
  if (query.isPending) return <Loading phone={phone} />
  if (!r) {
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={MonitorPlay}
          title={
            gone ? "This recording isn't here" : "Couldn't load the recording"
          }
          body={
            gone
              ? "It was deleted (or passed its keep time), or it isn't yours to watch."
              : query.error?.message
          }
          action={
            <Button
              variant="outline"
              className="h-11 w-full md:h-9 md:w-auto"
              render={<Link href="/recordings" />}
              nativeButton={false}
            >
              All recordings
            </Button>
          }
        />
      </div>
    )
  }
  return <Recording r={r} phone={phone} />
}

function Recording({ r, phone }: { r: TerminalRecording; phone: boolean }) {
  const router = useRouter()
  const back = useBackOr("/recordings")
  const menu = useRecordingMenu(r, () => router.replace("/recordings"))
  // A live recording is loaded as far as it has got; Reload fetches more.
  const [loads, setLoads] = useState(0)
  const version = r.live ? `live-${loads}` : `done-${r.ended_at ?? ""}`

  const meta = [
    r.mine ? "You" : r.user_name,
    when.format(new Date(r.started_at)),
    clock(r.duration_ms),
    endText(r),
    formatSize(r.size),
  ]

  const notes = (
    <>
      {r.live && (
        <Callout title="The shell is still open">
          This replay goes up to the moment you opened it. Press Reload for what
          came since.
        </Callout>
      )}
      {r.truncated && (
        <Callout warn title="Cut at 50 MiB">
          The shell printed more than a recording keeps; the replay ends where
          the limit was reached.
        </Callout>
      )}
      {r.interrupted && (
        <Callout title="The end is missing">
          Morcheh restarted while this shell was open, so up to the last 30
          seconds weren't saved.
        </Callout>
      )}
    </>
  )

  const reload = r.live && (
    <Button
      variant="outline"
      className={cn(phone && "h-11 flex-1")}
      onClick={() => setLoads((n) => n + 1)}
    >
      <RefreshCw />
      Reload
    </Button>
  )
  const download = (
    <Button
      variant="outline"
      className={cn(phone && "h-11 flex-1")}
      onClick={() =>
        void downloadCast(r).catch((e: Error) => toast.error(e.message))
      }
    >
      <Download />
      Download
    </Button>
  )

  if (phone) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col">
        <header className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-1 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={back}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {r.server_name}
          </h1>
          <PhoneMenu groups={menu} />
        </header>
        <div className="flex flex-col gap-1 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="truncate text-body-sm font-medium">{r.title}</span>
            {r.live && <LiveBadge />}
          </div>
          <p className="text-caption text-ash">{meta.join(" · ")}</p>
        </div>
        <CastPlayer
          id={r.id}
          version={version}
          phone
          className="min-h-48 border-y border-border bg-background"
        />
        <div className="flex flex-col gap-3 px-4 pt-4">{notes}</div>
        <div className="mt-auto flex gap-2 border-t border-border p-3">
          {reload}
          {download}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-3rem-1px)] flex-col gap-4 px-6 pt-5 pb-6">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-subheading font-medium">
              {r.server_id ? (
                <Link
                  href={`/servers/${r.server_id}`}
                  className="hover:text-brand"
                >
                  {r.server_name}
                </Link>
              ) : (
                r.server_name
              )}
              <span className="text-muted-foreground"> · {r.title}</span>
            </h1>
            {r.live && <LiveBadge />}
          </div>
          <p className="mt-0.5 text-caption text-ash">{meta.join(" · ")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {reload}
          {download}
          <ItemMenu groups={menu} label="Recording actions" />
        </div>
      </div>
      {notes}
      <CastPlayer
        id={r.id}
        version={version}
        phone={false}
        className="min-h-0 flex-1 rounded-2xl border border-border bg-background"
      />
    </div>
  )
}

function PhoneMenu({ groups }: { groups: Item[][] }) {
  const [open, setOpen] = useOpen("recording-menu")
  return (
    <>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="More"
        onClick={() => setOpen(true)}
      >
        <Ellipsis className="size-5" />
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title="Recording">
        <SheetItems groups={groups} onOpenChange={setOpen} />
      </BottomSheet>
    </>
  )
}

function Loading({ phone }: { phone: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4 pt-5", phone ? "px-4" : "px-6")}>
      <Skeleton className="h-9 w-64 rounded-lg" />
      <Skeleton className="h-[50dvh] rounded-2xl" />
    </div>
  )
}
