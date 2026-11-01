"use client"

import { LanguageDescription } from "@codemirror/language"
import { languages } from "@codemirror/language-data"
import { openSearchPanel } from "@codemirror/search"
import { useQueryClient } from "@tanstack/react-query"
import CodeMirror, {
  EditorView,
  type Extension,
  type ReactCodeMirrorRef,
} from "@uiw/react-codemirror"
import {
  Download,
  Ellipsis,
  FileWarning,
  Loader2,
  RotateCw,
  Search,
  WrapText,
  X,
} from "lucide-react"
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { useOpen } from "@/hooks/useOpen"
import type { FileContent } from "@/lib/services"
import { cn } from "@/lib/utils"
import { download, fileKeys, useFileContent, useFileOps } from "../api"
import { basename, dirname, formatSize, shortcut } from "./meta"

const MONO =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace"

const WRAP_KEY = "morcheh.editor.wrap"

const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: MONO, lineHeight: "1.6" },
  ".cm-gutters": {
    backgroundColor: "var(--color-subtle)",
    borderInlineEnd: "1px solid var(--color-border)",
    color: "var(--color-ash)",
  },
  ".cm-activeLineGutter": { backgroundColor: "var(--color-muted)" },
  ".cm-activeLine": { backgroundColor: "var(--color-subtle)" },
  ".cm-panels": {
    backgroundColor: "var(--color-subtle)",
    fontFamily: "var(--font-sans)",
  },
  ".cm-panels.cm-panels-top": { borderBottom: "1px solid var(--color-border)" },
  ".cm-panels.cm-panels-bottom": { borderTop: "1px solid var(--color-border)" },
  ".cm-textfield": {
    borderRadius: "6px",
    border: "1px solid var(--color-input)",
    padding: "2px 6px",
  },
  ".cm-button": {
    borderRadius: "6px",
    backgroundImage: "none",
    backgroundColor: "var(--color-card)",
    border: "1px solid var(--color-input)",
  },
})

function readWrap() {
  try {
    return localStorage.getItem(WRAP_KEY) !== "false"
  } catch {
    return true
  }
}

// Full-screen text editor over the file manager. Stays mounted while `path`
// is set, so closing it with unsaved edits (X, Esc or Back) can ask first and
// reopen it with the edits intact.
export function FileEditor({
  serverId,
  path,
  open,
  setOpen,
  onClosed,
  phone,
}: {
  serverId: string
  path: string
  open: boolean
  setOpen: (open: boolean) => void
  onClosed: () => void
  phone: boolean
}) {
  const queryClient = useQueryClient()
  const query = useFileContent(serverId, path)
  const { write } = useFileOps(serverId)
  const file = query.data
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? file?.content ?? ""
  const dirty = file !== undefined && draft !== null && draft !== file.content

  const [wrap, setWrap] = useState(readWrap)
  const [lang, setLang] = useState<{ name: string; ext: Extension } | null>(
    null,
  )
  const [cursor, setCursor] = useState({ line: 1, col: 1, lines: 1 })
  const viewRef = useRef<ReactCodeMirrorRef>(null)

  const [discardOpen, setDiscardOpen] = useOpen("file-editor-discard")
  const [conflictOpen, setConflictOpen] = useOpen("file-editor-conflict")
  const [menuOpen, setMenuOpen] = useOpen("file-editor-menu")
  // Back already closed the editor: "Keep editing" reopens it.
  const reopen = useRef(false)
  const discarding = useRef(false)

  const name = basename(path)

  useEffect(() => {
    let live = true
    const desc = LanguageDescription.matchFilename(languages, name)
    setLang(null)
    desc
      ?.load()
      .then((support) => live && setLang({ name: desc.name, ext: support }))
    return () => {
      live = false
    }
  }, [name])

  // A ref, not isPending: two quick ⌘S presses land before a re-render.
  const inFlight = useRef(false)
  const save = useEffectEvent((force = false) => {
    if (!file || inFlight.current) return
    if (!dirty && !force) return
    const content = value
    inFlight.current = true
    write.mutate(
      {
        path,
        content,
        expected_modified: force ? undefined : file.modified,
      },
      {
        onSuccess: (entry) => {
          queryClient.setQueryData<FileContent>(
            fileKeys.content(serverId, path),
            { ...file, content, modified: entry.modified, size: entry.size },
          )
          setDraft((d) => (d === content ? null : d))
          setConflictOpen(false)
          toast.success(`Saved ${name}`)
        },
        onError: (err) => {
          if (err.status === 409) setConflictOpen(true)
          else toast.error(err.message)
        },
        onSettled: () => {
          inFlight.current = false
        },
      },
    )
  })

  const extensions = useMemo(() => {
    // ⌘S is handled on the editor's wrapper, which also sees CodeMirror's keys.
    const list: Extension[] = [theme]
    if (wrap) list.push(EditorView.lineWrapping)
    if (lang) list.push(lang.ext)
    return list
  }, [wrap, lang])

  const toggleWrap = () => {
    setWrap((w) => {
      try {
        localStorage.setItem(WRAP_KEY, String(!w))
      } catch {}
      return !w
    })
  }

  // The layer closed (Back, or X with nothing to lose).
  const onClose = useEffectEvent(() => {
    if (dirty && !discarding.current) {
      reopen.current = true
      setDiscardOpen(true)
    } else onClosed()
  })
  useEffect(() => {
    if (!open) onClose()
  }, [open])

  // Unsaved edits also guard reloading or leaving the tab.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const requestClose = () => {
    if (dirty) {
      reopen.current = false
      setDiscardOpen(true)
    } else setOpen(false)
  }

  const afterPop = (fn: () => void) =>
    window.addEventListener("popstate", fn, { once: true })

  const keepEditing = () => {
    if (reopen.current) afterPop(() => setOpen(true))
    reopen.current = false
    setDiscardOpen(false)
  }

  const discard = () => {
    discarding.current = true
    if (open) afterPop(() => setOpen(false))
    else afterPop(onClosed)
    setDiscardOpen(false)
  }

  const reload = () => {
    setDraft(null)
    setConflictOpen(false)
    query.refetch()
  }

  const search = () => {
    const view = viewRef.current?.view
    if (view) openSearchPanel(view)
  }

  const tooBig = query.error?.status === 413
  const binary = query.error?.status === 415

  const body = query.isPending ? (
    <div className="flex flex-1 items-center justify-center text-ash">
      <Loader2 className="size-5 animate-spin" />
    </div>
  ) : query.error ? (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted">
        <FileWarning className="size-6 text-ash" />
      </span>
      <div className="max-w-sm">
        <p className="font-medium">
          {tooBig
            ? "This file is too large to edit here"
            : binary
              ? "This isn't a text file"
              : "Couldn't open the file"}
        </p>
        <p className="mt-1 text-body-sm text-muted-foreground">
          {tooBig || binary
            ? "Download it to open it on your computer."
            : query.error.message}
        </p>
      </div>
      <div className="flex gap-2">
        {!tooBig && !binary && (
          <Button variant="outline" onClick={() => query.refetch()}>
            <RotateCw /> Try again
          </Button>
        )}
        <Button onClick={() => download(serverId, [path])}>
          <Download /> Download
        </Button>
      </div>
    </div>
  ) : (
    <CodeMirror
      ref={viewRef}
      value={value}
      onChange={(next) => setDraft(next)}
      // Fires on every render: only store real changes, or it loops.
      onStatistics={(s) => {
        const next = {
          line: s.line.number,
          col: s.selectionAsSingle.head - s.line.from + 1,
          lines: s.lineCount,
        }
        setCursor((c) =>
          c.line === next.line && c.col === next.col && c.lines === next.lines
            ? c
            : next,
        )
      }}
      extensions={extensions}
      autoFocus={
        typeof window !== "undefined" && matchMedia("(pointer: fine)").matches
      }
      basicSetup={{ highlightActiveLine: true, foldGutter: true }}
      className="min-h-0 flex-1 overflow-hidden"
      height="100%"
    />
  )

  const saving = write.isPending
  const ready = file !== undefined

  return (
    <>
      <div
        role="dialog"
        aria-modal
        aria-label={`Edit ${name}`}
        hidden={!open}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
            e.preventDefault()
            save()
          } else if (e.key === "Escape" && !e.defaultPrevented) {
            // CodeMirror's own Escape (closing search) prevents default.
            if (!(e.target as HTMLElement).closest(".cm-panels")) {
              requestClose()
            }
          }
        }}
        className="fixed inset-0 z-50 flex flex-col bg-background pt-[env(safe-area-inset-top)]"
      >
        {phone ? (
          <header className="flex h-14 shrink-0 items-center gap-1 border-b px-1">
            <button
              type="button"
              aria-label="Close"
              onClick={requestClose}
              className="flex size-11 items-center justify-center rounded-full active:bg-muted"
            >
              <X className="size-5" />
            </button>
            <div className="min-w-0 flex-1 px-1">
              <p className="truncate text-body font-medium">{name}</p>
              <p className="truncate text-caption text-ash">
                {dirty ? "Edited" : dirname(path)}
              </p>
            </div>
            <button
              type="button"
              aria-label="More"
              onClick={() => setMenuOpen(true)}
              className="flex size-11 items-center justify-center rounded-full active:bg-muted"
            >
              <Ellipsis className="size-5" />
            </button>
            <Button
              className="me-2 h-9"
              disabled={!ready || !dirty || saving}
              onClick={() => save()}
            >
              {saving ? <Loader2 className="animate-spin" /> : "Save"}
            </Button>
          </header>
        ) : (
          <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <p className="truncate font-medium">{name}</p>
              <p className="truncate text-body-sm text-ash">{dirname(path)}</p>
              {dirty && (
                <span className="flex shrink-0 items-center gap-1.5 text-caption text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-brand" />
                  Unsaved changes
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Find"
              title="Find (Ctrl F)"
              disabled={!ready}
              onClick={search}
            >
              <Search />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Wrap lines"
              aria-pressed={wrap}
              title="Wrap lines"
              onClick={toggleWrap}
              className={cn(wrap && "bg-muted")}
            >
              <WrapText />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Download"
              title="Download"
              onClick={() => download(serverId, [path])}
            >
              <Download />
            </Button>
            <Button
              disabled={!ready || !dirty || saving}
              onClick={() => save()}
            >
              {saving && <Loader2 className="animate-spin" />}
              Save
              <Kbd className="bg-primary-foreground/20 text-primary-foreground">
                {shortcut("S")}
              </Kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close"
              title="Close (Esc)"
              onClick={requestClose}
            >
              <X />
            </Button>
          </header>
        )}

        {body}

        {ready && (
          <footer className="flex h-8 shrink-0 items-center gap-4 border-t bg-subtle px-4 pb-[env(safe-area-inset-bottom)] text-caption text-ash max-md:box-content">
            <span>
              Ln {cursor.line}, Col {cursor.col}
            </span>
            <span className="max-md:hidden">{cursor.lines} lines</span>
            <span className="ms-auto">{lang?.name ?? "Plain text"}</span>
            <span>{formatSize(new Blob([value]).size)}</span>
          </footer>
        )}
      </div>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={(next) => (next ? setDiscardOpen(true) : keepEditing())}
        title="Discard unsaved changes?"
        description={`Your edits to ${name} haven't been saved.`}
        confirmLabel="Discard"
        onConfirm={discard}
      />

      <ConfirmDialog
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        title="The file changed on the server"
        description={
          <>
            Someone saved {name} after you opened it. Overwrite their version
            with yours, or reload it and lose your edits.
            <Button
              variant="link"
              className="mt-2 block h-auto p-0"
              onClick={reload}
            >
              Reload from server
            </Button>
          </>
        }
        confirmLabel="Overwrite"
        pending={saving}
        onConfirm={() => save(true)}
      />

      {phone && (
        <BottomSheet open={menuOpen} onOpenChange={setMenuOpen} title={name}>
          <SheetAction
            icon={<Search />}
            label="Find and replace"
            disabled={!ready}
            onClick={() => {
              afterPop(search)
              setMenuOpen(false)
            }}
          />
          <SheetAction
            icon={<WrapText />}
            label={wrap ? "Don't wrap lines" : "Wrap lines"}
            onClick={() => {
              toggleWrap()
              setMenuOpen(false)
            }}
          />
          <SheetAction
            icon={<RotateCw />}
            label="Reload from server"
            description={dirty ? "Drops your unsaved edits" : undefined}
            onClick={() => {
              reload()
              setMenuOpen(false)
            }}
          />
          <SheetAction
            icon={<Download />}
            label="Download"
            onClick={() => {
              download(serverId, [path])
              setMenuOpen(false)
            }}
          />
        </BottomSheet>
      )}
    </>
  )
}
