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

// nginx config in CodeMirror: the preview (read-only), the Advanced box or
// a whole file written by hand.
export function NginxCode({
  value,
  onChange,
  placeholder,
  label,
  lineNumbers,
  className,
  onView,
}: {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  label: string
  // Shown always when read-only; an editor asks for them (a whole file).
  lineNumbers?: boolean
  className?: string
  // The editor itself, to move the cursor from outside (Go to line).
  onView?: (view: EditorView) => void
}) {
  const theme = useCodeTheme()
  return (
    <CodeMirror
      theme={theme}
      value={value}
      onChange={onChange}
      onCreateEditor={onView}
      extensions={onChange ? editable : readOnly}
      basicSetup={{
        highlightActiveLine: !!onChange,
        highlightActiveLineGutter: !!onChange,
        foldGutter: false,
        lineNumbers: lineNumbers ?? !onChange,
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
