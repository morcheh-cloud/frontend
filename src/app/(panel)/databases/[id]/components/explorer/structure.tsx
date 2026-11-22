"use client"

import { javascript } from "@codemirror/lang-javascript"
import { MSSQL, MySQL, PostgreSQL, sql } from "@codemirror/lang-sql"
import CodeMirror, { EditorView } from "@uiw/react-codemirror"

import { editorTheme } from "@/app/(panel)/servers/[id]/components/ini-editor"
import { useCodeTheme } from "@/components/code-theme"
import { ClickHouseSQL } from "./clickhouse-dialect"
import type { Engine } from "./meta"

const read = [
  editorTheme,
  EditorView.editable.of(false),
  EditorView.lineWrapping,
]
const langs = {
  postgres: [...read, sql({ dialect: PostgreSQL })],
  mysql: [...read, sql({ dialect: MySQL })],
  mssql: [...read, sql({ dialect: MSSQL })],
  mongodb: [...read, javascript()],
  redis: read,
  clickhouse: [...read, sql({ dialect: ClickHouseSQL })],
}

// A read-only, highlighted piece of code (a CREATE statement, a view).
export function CodeBlock({ text, engine }: { text: string; engine: Engine }) {
  const theme = useCodeTheme()
  return (
    <div className="overflow-hidden rounded-2xl border border-border [contain:inline-size]">
      <CodeMirror
        theme={theme}
        value={text}
        extensions={langs[engine]}
        basicSetup={{ highlightActiveLine: false, foldGutter: false }}
        maxHeight="28rem"
      />
    </div>
  )
}
