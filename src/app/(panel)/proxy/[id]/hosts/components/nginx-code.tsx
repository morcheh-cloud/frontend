"use client"

import { StreamLanguage } from "@codemirror/language"
import { nginx } from "@codemirror/legacy-modes/mode/nginx"
import CodeMirror, { EditorView } from "@uiw/react-codemirror"

import { editorTheme } from "@/app/(panel)/servers/[id]/components/ini-editor"
import { useCodeTheme } from "@/components/code-theme"
import { cn } from "@/lib/utils"

const language = StreamLanguage.define(nginx)
const editable = [editorTheme, EditorView.lineWrapping, language]
const readOnly = [
  editorTheme,
  language,
  EditorView.editable.of(false),
  EditorView.contentAttributes.of({ "aria-readonly": "true" }),
]

// nginx config in CodeMirror: the preview (read-only) or the Advanced box.
export function NginxCode({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  label: string
  className?: string
}) {
  const theme = useCodeTheme()
  return (
    <CodeMirror
      theme={theme}
      value={value}
      onChange={onChange}
      extensions={onChange ? editable : readOnly}
      basicSetup={{
        highlightActiveLine: !!onChange,
        highlightActiveLineGutter: !!onChange,
        foldGutter: false,
        lineNumbers: !onChange,
      }}
      placeholder={placeholder}
      aria-label={label}
      className={cn(
        "overflow-hidden rounded-lg border border-input text-caption",
        className,
      )}
    />
  )
}
