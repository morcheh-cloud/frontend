"use client"

import { StreamLanguage } from "@codemirror/language"
import { properties } from "@codemirror/legacy-modes/mode/properties"
import CodeMirror, { EditorView } from "@uiw/react-codemirror"
import { useState } from "react"

import { YamlEditor } from "@/app/(panel)/ansible/components/yaml-editor"
import { editorTheme } from "@/app/(panel)/servers/[id]/components/ini-editor"
import { useCodeTheme } from "@/components/code-theme"
import { cn } from "@/lib/utils"
import { Segmented } from "../../servers/[id]/components/parts"

const envExtensions = [editorTheme, StreamLanguage.define(properties)]
const envReadOnly = [
  ...envExtensions,
  EditorView.editable.of(false),
  EditorView.lineWrapping,
]

function EnvEditor({
  value,
  onChange,
  readOnly,
  height,
}: {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  height: string
}) {
  const codeTheme = useCodeTheme()
  return (
    <CodeMirror
      theme={codeTheme}
      value={value}
      onChange={onChange}
      extensions={readOnly ? envReadOnly : envExtensions}
      basicSetup={{ highlightActiveLine: !readOnly, foldGutter: false }}
      placeholder={
        "# One NAME=value per line, read by the compose file\nTZ=UTC"
      }
      height={height}
      className="min-h-0 overflow-hidden"
    />
  )
}

// A project's two files: compose.yaml and the .env beside it, one at a time
// under a switch so the editor keeps the whole height.
export function ComposeFiles({
  compose,
  env,
  onCompose,
  onEnv,
  readOnly,
  height = "60vh",
  className,
  aside,
}: {
  compose: string
  env: string
  onCompose?: (v: string) => void
  onEnv?: (v: string) => void
  readOnly?: boolean
  height?: string
  className?: string
  aside?: React.ReactNode
}) {
  const [file, setFile] = useState<"compose" | "env">("compose")
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border [contain:inline-size]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-subtle px-2 py-1.5">
        <Segmented
          label="File"
          value={file}
          onChange={setFile}
          items={[
            { value: "compose", label: "compose.yaml" },
            { value: "env", label: env.trim() ? ".env •" : ".env" },
          ]}
        />
        {aside && (
          <div className="ms-auto flex items-center gap-2">{aside}</div>
        )}
      </div>
      {file === "compose" ? (
        <YamlEditor
          kind="compose"
          value={compose}
          onChange={onCompose}
          readOnly={readOnly}
          height={height}
          placeholder={"services:\n  app:\n    image: nginx:alpine"}
        />
      ) : (
        <EnvEditor
          value={env}
          onChange={onEnv}
          readOnly={readOnly}
          height={height}
        />
      )}
    </div>
  )
}
