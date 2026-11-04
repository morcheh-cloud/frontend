"use client"

import { yaml } from "@codemirror/lang-yaml"
import { type Diagnostic, linter, lintGutter } from "@codemirror/lint"
import CodeMirror, { EditorView } from "@uiw/react-codemirror"
import { isMap, isSeq, parseDocument } from "yaml"

import { editorTheme } from "@/app/(panel)/servers/[id]/components/ini-editor"
import { cn } from "@/lib/utils"

export type YamlKind = "playbook" | "vars"

// What's wrong with the text, as Ansible would see it: YAML syntax errors,
// and the top level a playbook (a list of plays) or variables (a mapping)
// needs. Empty is fine for variables.
export function yamlProblems(text: string, kind: YamlKind) {
  const out: { from: number; to: number; message: string }[] = []
  if (!text.trim()) {
    if (kind === "playbook") {
      out.push({ from: 0, to: 0, message: "The playbook is empty." })
    }
    return out
  }
  const doc = parseDocument(text, { prettyErrors: false })
  for (const e of doc.errors) {
    out.push({ from: e.pos[0], to: e.pos[1], message: e.message })
  }
  if (out.length > 0) return out
  const c = doc.contents
  if (kind === "playbook" && !isSeq(c)) {
    out.push({
      from: 0,
      to: Math.min(text.length, 1),
      message:
        "A playbook is a list of plays: start each one with “- name:” and give it hosts.",
    })
  }
  if (kind === "playbook" && isSeq(c)) {
    for (const item of c.items) {
      if (
        isMap(item) &&
        !item.has("hosts") &&
        !item.has("import_playbook") &&
        !item.has("ansible.builtin.import_playbook")
      ) {
        const [from, to] = item.range ?? [0, 1]
        out.push({
          from,
          to: Math.min(to, from + 1),
          message: "This play has no hosts: add “hosts: all” (or a group).",
        })
      }
    }
  }
  if (kind === "vars" && c != null && !isMap(c)) {
    out.push({
      from: 0,
      to: Math.min(text.length, 1),
      message: "Variables are a mapping: one “name: value” per line.",
    })
  }
  return out
}

const lints = {
  playbook: linter(
    (view): Diagnostic[] =>
      yamlProblems(view.state.doc.toString(), "playbook").map((p) => ({
        ...p,
        to: Math.max(p.to, p.from),
        severity: "error",
      })),
    { delay: 400 },
  ),
  vars: linter(
    (view): Diagnostic[] =>
      yamlProblems(view.state.doc.toString(), "vars").map((p) => ({
        ...p,
        to: Math.max(p.to, p.from),
        severity: "error",
      })),
    { delay: 400 },
  ),
}

const base = [editorTheme, yaml()]
const extensionsFor = {
  playbook: [...base, lints.playbook, lintGutter()],
  vars: [...base, lints.vars, lintGutter()],
  readOnly: [...base, EditorView.editable.of(false), EditorView.lineWrapping],
}

export function YamlEditor({
  value,
  onChange,
  kind = "playbook",
  readOnly,
  autoFocus,
  placeholder,
  className,
  height = "100%",
}: {
  value: string
  onChange?: (value: string) => void
  kind?: YamlKind
  readOnly?: boolean
  autoFocus?: boolean
  placeholder?: string
  className?: string
  height?: string
}) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={readOnly ? extensionsFor.readOnly : extensionsFor[kind]}
      basicSetup={{
        highlightActiveLine: !readOnly,
        foldGutter: !readOnly,
        tabSize: 2,
      }}
      indentWithTab={!readOnly}
      autoFocus={autoFocus}
      placeholder={placeholder}
      className={cn("min-h-0 overflow-hidden", className)}
      height={height}
    />
  )
}
