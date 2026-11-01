"use client"

import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileWarning,
  X,
} from "lucide-react"
import { useEffect, useEffectEvent, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { download } from "./api"
import { FileLayer } from "./file-layer"
import { FileIcon, formatSize, kindOf } from "./meta"
import { type FileEntry, useSource } from "./source"

const navButton =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none hover:bg-muted active:bg-muted disabled:opacity-30 [&_svg]:size-5"

// Viewer (a large modal on desktop, full screen on phones) for images, video, audio and PDFs, streamed straight
// from the source. ← / → (or a swipe on phones) step through the other
// previewable files in the folder.
export function FilePreview({
  entry,
  siblings,
  open,
  setOpen,
  onNavigate,
  phone,
}: {
  entry: FileEntry
  siblings: FileEntry[]
  open: boolean
  setOpen: (open: boolean) => void
  onNavigate: (entry: FileEntry) => void
  phone: boolean
}) {
  const source = useSource()
  const index = siblings.findIndex((s) => s.path === entry.path)
  const prev = index > 0 ? siblings[index - 1] : undefined
  const next = index >= 0 ? siblings[index + 1] : undefined
  const url = source.downloadUrl([entry.path], { inline: true })
  const kind = kindOf(entry)
  const [failed, setFailed] = useState<string | null>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false)
    else if (e.key === "ArrowLeft" && prev && kind === "image") onNavigate(prev)
    else if (e.key === "ArrowRight" && next && kind === "image")
      onNavigate(next)
  })
  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => onKey(e)
    window.addEventListener("keydown", fn)
    return () => window.removeEventListener("keydown", fn)
  }, [open])

  if (!open) return null

  const media =
    failed === entry.path ? (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted">
          <FileWarning className="size-6 text-ash" />
        </span>
        <p className="font-medium">Couldn't show this file</p>
        <Button onClick={() => download(source, [entry.path])}>
          <Download /> Download
        </Button>
      </div>
    ) : kind === "image" ? (
      // biome-ignore lint/performance/noImgElement: streamed from the source, not optimisable
      <img
        key={entry.path}
        src={url}
        alt={entry.name}
        onError={() => setFailed(entry.path)}
        className="max-h-full max-w-full rounded-lg object-contain shadow-sm"
      />
    ) : kind === "video" ? (
      // biome-ignore lint/a11y/useMediaCaption: remote files have no captions
      <video
        key={entry.path}
        src={url}
        controls
        autoPlay
        playsInline
        onError={() => setFailed(entry.path)}
        className="max-h-full max-w-full rounded-lg bg-foreground"
      />
    ) : kind === "audio" ? (
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border bg-card p-8">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <FileIcon entry={entry} className="size-8" />
        </span>
        <p className="max-w-full truncate font-medium">{entry.name}</p>
        {/* biome-ignore lint/a11y/useMediaCaption: remote files have no captions */}
        <audio
          key={entry.path}
          src={url}
          controls
          autoPlay
          onError={() => setFailed(entry.path)}
          className="w-full"
        />
      </div>
    ) : (
      <iframe
        key={entry.path}
        src={url}
        title={entry.name}
        className="size-full rounded-lg border bg-card"
      />
    )

  return (
    <FileLayer
      phone={phone}
      label={entry.name}
      onDismiss={() => setOpen(false)}
      className="bg-subtle pb-[env(safe-area-inset-bottom)]"
    >
      <header
        className={cn(
          "flex shrink-0 items-center gap-1 border-b bg-background",
          phone ? "h-14 px-1" : "h-14 gap-2 px-4",
        )}
      >
        {phone && (
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className={navButton}
          >
            <X />
          </button>
        )}
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate font-medium">{entry.name}</p>
          <p className="truncate text-caption text-ash">
            {formatSize(entry.size)}
            {siblings.length > 1 &&
              index >= 0 &&
              ` · ${index + 1} of ${siblings.length}`}
          </p>
        </div>
        {!phone && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open in a new tab"
            title="Open in a new tab"
            nativeButton={false}
            render={<a href={url} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLink />
          </Button>
        )}
        {phone ? (
          <button
            type="button"
            aria-label="Download"
            onClick={() => download(source, [entry.path])}
            className={navButton}
          >
            <Download />
          </button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Download"
            title="Download"
            onClick={() => download(source, [entry.path])}
          >
            <Download />
          </Button>
        )}
        {!phone && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            title="Close (Esc)"
            onClick={() => setOpen(false)}
          >
            <X />
          </Button>
        )}
      </header>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center p-4 md:p-8"
        onTouchStart={(e) => {
          const t = e.touches[0]
          touch.current =
            e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null
        }}
        onTouchEnd={(e) => {
          const start = touch.current
          touch.current = null
          if (!start || kind !== "image") return
          const t = e.changedTouches[0]
          const dx = t.clientX - start.x
          if (Math.abs(dx) < 60 || Math.abs(t.clientY - start.y) > 80) return
          const to = dx < 0 ? next : prev
          if (to) onNavigate(to)
        }}
      >
        {media}
        {siblings.length > 1 && !phone && (
          <>
            <button
              type="button"
              aria-label="Previous"
              disabled={!prev}
              onClick={() => prev && onNavigate(prev)}
              className={cn(
                navButton,
                "absolute start-4 top-1/2 -translate-y-1/2 border bg-background shadow-sm",
              )}
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              aria-label="Next"
              disabled={!next}
              onClick={() => next && onNavigate(next)}
              className={cn(
                navButton,
                "absolute end-4 top-1/2 -translate-y-1/2 border bg-background shadow-sm",
              )}
            >
              <ChevronRight />
            </button>
          </>
        )}
      </div>

      {siblings.length > 1 && phone && (
        <nav className="flex h-14 shrink-0 items-center justify-between border-t bg-background px-2">
          <button
            type="button"
            aria-label="Previous"
            disabled={!prev}
            onClick={() => prev && onNavigate(prev)}
            className={navButton}
          >
            <ChevronLeft />
          </button>
          {kind === "pdf" && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 items-center gap-2 px-3 text-body-sm font-medium text-brand"
            >
              <ExternalLink className="size-4" /> Open
            </a>
          )}
          <button
            type="button"
            aria-label="Next"
            disabled={!next}
            onClick={() => next && onNavigate(next)}
            className={navButton}
          >
            <ChevronRight />
          </button>
        </nav>
      )}
    </FileLayer>
  )
}
