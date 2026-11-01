"use client"

import CodeMirror, {
  EditorSelection,
  EditorView,
  type ReactCodeMirrorRef,
} from "@uiw/react-codemirror"
import { TriangleAlert } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ApiError } from "@/lib/api"
import type { CronTable } from "@/lib/services"
import { useServerPage } from "../../components/server-page"
import { useEditTable } from "../api"
import { tableLabel } from "./meta"

const MONO =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace"

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
})

const extensions = [theme, EditorView.lineWrapping]

type Draft = { content: string; revision: string }
type Problem = { message: string; line?: number; conflict?: boolean }

// A whole table as text, for edits the form can't make (variables, comments,
// reordering). Stays mounted while the table is picked, so closing it keeps
// the draft until it's saved or discarded.
export function TableEditor({
  open,
  onOpenChange,
  table,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: CronTable
}) {
  const { server, phone } = useServerPage()
  const edit = useEditTable(server.id)
  const editor = useRef<ReactCodeMirrorRef>(null)
  // null until the first keystroke: until then, follow the table as fetched.
  const [draft, setDraft] = useState<Draft | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const content = draft?.content ?? table.content
  const dirty = draft !== null && draft.content !== table.content
  const title = tableLabel(table)
  const system = table.kind === "system"

  function goToLine(n: number) {
    const view = editor.current?.view
    if (!view || n < 1 || n > view.state.doc.lines) return
    const line = view.state.doc.line(n)
    view.dispatch({
      selection: EditorSelection.range(line.from, line.to),
      effects: EditorView.scrollIntoView(line.from, { y: "center" }),
    })
    view.focus()
  }

  function save(revision = draft?.revision ?? table.revision) {
    setProblem(null)
    edit.mutate(
      { kind: "save", table: table.id, revision, content },
      {
        onSuccess: () => {
          setDraft(null)
          toast.success("Crontab saved")
          onOpenChange(false)
        },
        onError: (err) => {
          if (err.status === 409) {
            setProblem({
              conflict: true,
              message: "This table changed on the server since you opened it.",
            })
            return
          }
          const e =
            err instanceof ApiError
              ? err.body?.errors?.find((x) => x.location === "body.content")
              : undefined
          const line = typeof e?.value === "number" ? e.value : undefined
          setProblem({ message: e?.message ?? err.message, line })
          if (line) goToLine(line)
        },
      },
    )
  }

  function discard() {
    setDraft(null)
    setProblem(null)
  }

  const notice = problem && (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-subtle px-4 py-2.5 text-body-sm md:px-6"
    >
      <TriangleAlert className="size-4 shrink-0 text-destructive" />
      <span className="min-w-0 flex-1">{problem.message}</span>
      {problem.line && (
        <Button
          variant="link"
          className="h-auto p-0 max-md:min-h-9"
          onClick={() => problem.line && goToLine(problem.line)}
        >
          Show line {problem.line}
        </Button>
      )}
      {problem.conflict && (
        <span className="flex gap-2">
          <Button variant="outline" size="sm" onClick={discard}>
            Load theirs
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => save(table.revision)}
          >
            Overwrite
          </Button>
        </span>
      )}
    </div>
  )

  const body = (
    <div className="flex min-h-0 flex-1 flex-col">
      {notice}
      <CodeMirror
        ref={editor}
        value={content}
        onChange={(value) =>
          setDraft((d) => ({
            content: value,
            revision: d?.revision ?? table.revision,
          }))
        }
        extensions={extensions}
        basicSetup={{ highlightActiveLine: true, foldGutter: false }}
        autoFocus={!phone}
        className="min-h-0 flex-1 overflow-hidden"
        height="100%"
      />
      <p className="shrink-0 border-t border-border px-4 py-2 font-mono text-caption text-ash md:px-6">
        {system
          ? "min hour day month weekday user command"
          : "min hour day month weekday command"}
        <span className="font-sans">
          {" "}
          · # starts a comment · NAME=value sets a variable
        </span>
      </p>
    </div>
  )

  if (phone) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        header={
          <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-2 pb-2">
            <Button
              variant="ghost"
              className="h-11 justify-self-start text-body"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <span className="truncate text-body font-medium">{title}</span>
            <Button
              variant="ghost"
              disabled={!dirty || edit.isPending}
              onClick={() => save()}
              className="h-11 justify-self-end text-body text-brand"
            >
              Save
            </Button>
          </div>
        }
        className="pb-[env(safe-area-inset-bottom)]"
      >
        {body}
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-3xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription className="font-mono text-caption">
            {table.path}
          </SheetDescription>
        </SheetHeader>
        {body}
        <div className="flex items-center gap-2 border-t border-border px-6 py-4">
          {dirty && (
            <>
              <span className="text-body-sm text-muted-foreground">
                Unsaved changes
              </span>
              <Button variant="ghost" size="sm" onClick={discard}>
                Discard
              </Button>
            </>
          )}
          <span className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button disabled={!dirty || edit.isPending} onClick={() => save()}>
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
