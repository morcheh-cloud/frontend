"use client"

import { StreamLanguage } from "@codemirror/language"
import { properties } from "@codemirror/legacy-modes/mode/properties"
import CodeMirror, { EditorView } from "@uiw/react-codemirror"
import { Loader2, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useServerPage } from "./server-page"

const MONO =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace"

export const editorTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: MONO, lineHeight: "1.6" },
  ".cm-gutters": {
    backgroundColor: "var(--color-subtle)",
    borderInlineEnd: "1px solid var(--color-border)",
    color: "var(--color-ash)",
  },
  ".cm-activeLineGutter": { backgroundColor: "var(--color-muted)" },
  // Translucent: CodeMirror paints the selection behind the lines, so an
  // opaque active line would hide it.
  ".cm-activeLine": {
    backgroundColor: "color-mix(in oklab, var(--color-muted) 50%, transparent)",
  },
  ".cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "color-mix(in oklab, var(--color-brand) 14%, transparent)",
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    backgroundColor: "color-mix(in oklab, var(--color-brand) 24%, transparent)",
  },
})

// INI-like files: [section], key = value, # comments (fail2ban's
// configs, systemd units).
const extensions = [
  editorTheme,
  EditorView.lineWrapping,
  StreamLanguage.define(properties),
]
const readOnlyExtensions = [...extensions, EditorView.editable.of(false)]

export type Draft = { content: string; revision: string }
export type Problem = { message: string; conflict?: boolean }

// A config file in CodeMirror, filling its layer.
export function IniEditor({
  value,
  onChange,
  readOnly,
  placeholder,
}: {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  placeholder?: string
}) {
  const { phone } = useServerPage()
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={readOnly ? readOnlyExtensions : extensions}
      basicSetup={{ highlightActiveLine: !readOnly, foldGutter: false }}
      autoFocus={!phone && !readOnly}
      placeholder={placeholder}
      className="min-h-0 flex-1 overflow-hidden"
      height="100%"
    />
  )
}

export function EditorHint({ children }: { children: ReactNode }) {
  return (
    <p className="shrink-0 border-t border-border px-4 py-2 text-caption text-ash md:px-6">
      {children}
    </p>
  )
}

export function ProblemNotice({
  problem,
  onLoadTheirs,
  onOverwrite,
}: {
  problem: Problem | null
  onLoadTheirs: () => void
  onOverwrite: () => void
}) {
  if (!problem) return null
  return (
    <div
      role="alert"
      className="flex shrink-0 flex-wrap items-start gap-x-3 gap-y-2 border-b border-border bg-subtle px-4 py-2.5 text-body-sm md:px-6"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      <span className="max-h-40 min-w-0 flex-1 overflow-y-auto break-words whitespace-pre-wrap">
        {problem.message}
      </span>
      {problem.conflict && (
        <span className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onLoadTheirs}>
            Load theirs
          </Button>
          <Button variant="outline" size="sm" onClick={onOverwrite}>
            Overwrite
          </Button>
        </span>
      )}
    </div>
  )
}

// Full-height sheet with Close · title · Save on phones; a wide side sheet
// with the actions in its footer on desktop.
export function EditorLayer({
  open,
  onOpenChange,
  title,
  description,
  dirty,
  saving,
  onSave,
  onDiscard,
  extra,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  dirty: boolean
  saving: boolean
  onSave: () => void
  onDiscard: () => void
  extra?: ReactNode
  children: ReactNode
}) {
  const { phone } = useServerPage()
  const body = <div className="flex min-h-0 flex-1 flex-col">{children}</div>

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
              disabled={!dirty || saving}
              onClick={onSave}
              className="h-11 justify-self-end text-body text-brand"
            >
              {saving ? "Saving…" : "Save"}
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
            {description}
          </SheetDescription>
        </SheetHeader>
        {body}
        <div className="flex items-center gap-2 border-t border-border px-6 py-4">
          {extra}
          {dirty && (
            <>
              <span className="text-body-sm text-muted-foreground">
                Unsaved changes
              </span>
              <Button variant="ghost" size="sm" onClick={onDiscard}>
                Discard
              </Button>
            </>
          )}
          <span className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button disabled={!dirty || saving} onClick={onSave}>
            {saving && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
