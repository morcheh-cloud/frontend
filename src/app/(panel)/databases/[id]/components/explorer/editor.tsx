"use client"

import { javascript } from "@codemirror/lang-javascript"
import {
  MSSQL,
  MySQL,
  PostgreSQL,
  type SQLNamespace,
  sql,
} from "@codemirror/lang-sql"
import CodeMirror, { EditorView, keymap, Prec } from "@uiw/react-codemirror"
import { useLayoutEffect, useMemo, useRef } from "react"

import { editorTheme } from "@/app/(panel)/servers/[id]/components/ini-editor"
import { useCodeTheme } from "@/components/code-theme"
import { cn } from "@/lib/utils"
import type { Engine } from "./meta"

const dialects = { postgres: PostgreSQL, mysql: MySQL, mssql: MSSQL }

function language(engine: Engine, schema: SQLNamespace) {
  if (engine === "mongodb") return [javascript()]
  if (engine === "redis") return []
  return [
    sql({
      dialect: dialects[engine],
      schema,
      upperCaseKeywords: true,
    }),
  ]
}

// The text a run sends: the selection when there is one, else everything.
export function pickText(view: EditorView | null, all: string) {
  if (!view) return all
  const sel = view.state.selection.main
  if (sel.empty) return all
  return view.state.sliceDoc(sel.from, sel.to)
}

export function QueryEditor({
  engine,
  value,
  onChange,
  onRun,
  onSave,
  schema,
  viewRef,
  className,
  placeholder,
}: {
  engine: Engine
  value: string
  onChange: (v: string) => void
  onRun: () => void
  onSave?: () => void
  // Table names for completion: {table: [columns]} or {schema: {table: []}}.
  schema: SQLNamespace
  viewRef?: { current: EditorView | null }
  className?: string
  placeholder?: string
}) {
  const theme = useCodeTheme()
  // The keymap is built once; it calls whatever onRun/onSave are now.
  const handlers = useRef({ onRun, onSave })
  useLayoutEffect(() => {
    handlers.current = { onRun, onSave }
  })
  const keys = useMemo(
    () =>
      Prec.highest(
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              handlers.current.onRun()
              return true
            },
          },
          {
            key: "Shift-Enter",
            run: () => {
              handlers.current.onRun()
              return true
            },
          },
          {
            key: "Mod-s",
            run: () => {
              handlers.current.onSave?.()
              return true
            },
          },
        ]),
      ),
    [],
  )
  const schemaKey = JSON.stringify(schema)
  // biome-ignore lint/correctness/useExhaustiveDependencies: schemaKey stands for schema.
  const lang = useMemo(() => language(engine, schema), [engine, schemaKey])

  return (
    <CodeMirror
      theme={theme}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onCreateEditor={(view) => {
        if (viewRef) viewRef.current = view
      }}
      extensions={[editorTheme, EditorView.lineWrapping, keys, ...lang]}
      basicSetup={{ tabSize: 2, foldGutter: false }}
      indentWithTab
      className={cn("min-h-0 overflow-hidden", className)}
      height="100%"
    />
  )
}
