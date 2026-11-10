"use client"

import { yaml } from "@codemirror/lang-yaml"
import { type Diagnostic, linter, lintGutter } from "@codemirror/lint"
import CodeMirror, { EditorView } from "@uiw/react-codemirror"
import { isMap, isSeq, parseDocument } from "yaml"

import { editorTheme } from "@/app/(panel)/servers/[id]/components/ini-editor"
import { useCodeTheme } from "@/components/code-theme"
import { cn } from "@/lib/utils"

export type YamlKind = "playbook" | "vars" | "compose" | "recipe"

// What's wrong with the text, as Ansible would see it: YAML syntax errors,
// and the top level a playbook (a list of plays) or variables (a mapping)
// needs. Empty is fine for variables.
export function yamlProblems(text: string, kind: YamlKind) {
  const out: { from: number; to: number; message: string }[] = []
  if (!text.trim()) {
    if (kind !== "vars") {
      const what = {
        compose: "compose file",
        recipe: "application",
        playbook: "playbook",
      }[kind]
      out.push({ from: 0, to: 0, message: `The ${what} is empty.` })
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
  if (kind === "compose" && !(isMap(c) && c.has("services"))) {
    out.push({
      from: 0,
      to: Math.min(text.length, 1),
      message: "A compose file is a mapping with “services:” at the top.",
    })
  }
  if (kind === "recipe" && !isMap(c)) {
    out.push({
      from: 0,
      to: Math.min(text.length, 1),
      message:
        "An application is a mapping: “id:”, “name:”, “kind:” and the rest.",
    })
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

const lintFor = (kind: YamlKind) =>
  linter(
    (view): Diagnostic[] =>
      yamlProblems(view.state.doc.toString(), kind).map((p) => ({
        ...p,
        to: Math.max(p.to, p.from),
        severity: "error",
      })),
    { delay: 400 },
  )

const lints = {
  playbook: lintFor("playbook"),
  vars: lintFor("vars"),
  compose: lintFor("compose"),
  recipe: lintFor("recipe"),
}

const base = [editorTheme, yaml()]
const extensionsFor = {
  playbook: [...base, lints.playbook, lintGutter()],
  vars: [...base, lints.vars, lintGutter()],
  compose: [...base, lints.compose, lintGutter()],
  recipe: [...base, lints.recipe, lintGutter()],
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
  const codeTheme = useCodeTheme()
  return (
    <CodeMirror
      theme={codeTheme}
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
