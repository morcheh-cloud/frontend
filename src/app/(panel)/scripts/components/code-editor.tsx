"use client"

import { StreamLanguage } from "@codemirror/language"
import { python } from "@codemirror/legacy-modes/mode/python"
import { shell } from "@codemirror/legacy-modes/mode/shell"
import CodeMirror, { EditorView } from "@uiw/react-codemirror"

import { editorTheme } from "@/app/(panel)/servers/[id]/components/ini-editor"
import { useCodeTheme } from "@/components/code-theme"
import { cn } from "@/lib/utils"
import type { Interpreter } from "./meta"

const languages = {
  shell: StreamLanguage.define(shell),
  python: StreamLanguage.define(python),
}

const extensionsFor = (lang: "shell" | "python", readOnly: boolean) =>
  readOnly
    ? [
        editorTheme,
        languages[lang],
        EditorView.editable.of(false),
        EditorView.lineWrapping,
      ]
    : [editorTheme, languages[lang]]

const built = {
  shell: extensionsFor("shell", false),
  python: extensionsFor("python", false),
  shellRead: extensionsFor("shell", true),
  pythonRead: extensionsFor("python", true),
}

// A script's text, highlighted for its interpreter.
export function CodeEditor({
  value,
  onChange,
  interpreter,
  readOnly,
  className,
  height = "100%",
}: {
  value: string
  onChange?: (value: string) => void
  interpreter: Interpreter | string
  readOnly?: boolean
  className?: string
  height?: string
}) {
  const codeTheme = useCodeTheme()
  const lang = interpreter === "python3" ? "python" : "shell"
  return (
    <CodeMirror
      theme={codeTheme}
      value={value}
      onChange={onChange}
      extensions={built[readOnly ? (`${lang}Read` as const) : lang]}
      basicSetup={{
        highlightActiveLine: !readOnly,
        foldGutter: !readOnly,
        tabSize: lang === "python" ? 4 : 2,
      }}
      indentWithTab={!readOnly}
      className={cn("min-h-0 overflow-hidden", className)}
      height={height}
    />
  )
}
