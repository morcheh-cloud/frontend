"use client"

import type { EditorView } from "@uiw/react-codemirror"
import { Braces, ChevronDown } from "lucide-react"
import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { envVars, templateVars } from "./meta"

// {{…}} chips that insert at the cursor of the step's last focused field
// (title, text, body, a header value, the unit). Each step card is a scope.

type Insert = (text: string) => void
type Scope = {
  targets: Map<string, Insert>
  active: { current: string | null }
}

const ScopeContext = createContext<Scope | null>(null)

export function InsertScope({ children }: { children: ReactNode }) {
  const [scope] = useState<Scope>(() => ({
    targets: new Map(),
    active: { current: null },
  }))
  return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>
}

// Text into an input at its selection, then the caret after it.
function insertInto(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
  onChange: (v: string) => void,
  text: string,
) {
  const start = el?.selectionStart ?? value.length
  const end = el?.selectionEnd ?? value.length
  onChange(value.slice(0, start) + text + value.slice(end))
  requestAnimationFrame(() => {
    if (!el) return
    el.focus()
    el.setSelectionRange(start + text.length, start + text.length)
  })
}

function useTarget(
  id: string,
  ref: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  value: string,
  onChange: (v: string) => void,
) {
  const scope = useContext(ScopeContext)
  // Always the newest value: the chip may be pressed after more typing.
  const latest = useRef({ value, onChange })
  useEffect(() => {
    latest.current = { value, onChange }
  })
  useEffect(() => {
    if (!scope) return
    scope.targets.set(id, (text) =>
      insertInto(
        ref.current,
        latest.current.value,
        latest.current.onChange,
        text,
      ),
    )
    return () => {
      scope.targets.delete(id)
    }
  }, [scope, id, ref])
  return {
    onFocus: () => {
      if (scope) scope.active.current = id
    },
  }
}

type FieldProps = {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

export function TemplateInput(props: FieldProps & { mono?: boolean }) {
  const { id, value, onChange, mono, className, ...rest } = props
  const ref = useRef<HTMLInputElement>(null)
  const t = useTarget(id, ref, value, onChange)
  return (
    <Input
      {...rest}
      id={id}
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={t.onFocus}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      className={cn(
        "placeholder:text-ash",
        mono && "font-mono placeholder:font-sans",
        className,
      )}
    />
  )
}

export function TemplateTextarea(
  props: FieldProps & { rows?: number; mono?: boolean },
) {
  const { id, value, onChange, rows = 3, mono, className, ...rest } = props
  const ref = useRef<HTMLTextAreaElement>(null)
  const t = useTarget(id, ref, value, onChange)
  return (
    <Textarea
      {...rest}
      id={id}
      ref={ref}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={t.onFocus}
      spellCheck={false}
      className={cn(
        "placeholder:text-ash",
        mono && "font-mono text-caption placeholder:font-sans",
        className,
      )}
    />
  )
}

const quick = [
  "event.title",
  "event.text",
  "server.name",
  "subject.name",
  "event.url",
  "data.detail",
]

const chipClass =
  "inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2.5 text-caption text-muted-foreground outline-none hover:border-mist hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 max-md:h-9"

// The chips row. `noData`: {{data.…}} isn't offered (a service unit with an
// incoming URL).
export function VarChips({ noData }: { noData?: boolean }) {
  const scope = useContext(ScopeContext)
  const insert = (key: string) => {
    if (!scope) return
    const id =
      scope.active.current && scope.targets.has(scope.active.current)
        ? scope.active.current
        : scope.targets.keys().next().value
    if (id) scope.targets.get(id)?.(`{{${key}}}`)
  }
  const vars = templateVars.filter(
    (v) => !(noData && v.key.startsWith("data.")),
  )
  const first = vars.filter((v) => quick.includes(v.key))
  const rest = vars.filter((v) => !quick.includes(v.key))
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="me-0.5 inline-flex items-center gap-1 text-caption text-ash">
        <Braces className="size-3.5" />
        Insert
      </span>
      {first.map((v) => (
        <button
          key={v.key}
          type="button"
          title={`{{${v.key}}}: ${v.hint}`}
          // Keep the field's focus and selection.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insert(v.key)}
          className={chipClass}
        >
          {v.label}
        </button>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              className={chipClass}
            />
          }
        >
          More
          <ChevronDown className="size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Values from the event</DropdownMenuLabel>
            {rest.map((v) => (
              <DropdownMenuItem key={v.key} onClick={() => insert(v.key)}>
                <span className="font-mono text-caption">{`{{${v.key}}}`}</span>
                <span className="ms-auto ps-4 text-caption text-ash">
                  {v.hint}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// The command's MORCHE_* variables, inserted at the editor's cursor.
export function EnvChips({ view }: { view: RefObject<EditorView | null> }) {
  const insert = (name: string) => {
    const v = view.current
    if (!v) return
    v.dispatch(v.state.replaceSelection(`"$${name}"`))
    v.focus()
  }
  const first = [
    "MORCHE_SERVER_NAME",
    "MORCHE_EVENT_TITLE",
    "MORCHE_EVENT_TEXT",
    "MORCHE_SUBJECT_NAME",
  ]
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="me-0.5 inline-flex items-center gap-1 text-caption text-ash">
        <Braces className="size-3.5" />
        Insert
      </span>
      {first.map((name) => (
        <button
          key={name}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insert(name)}
          title={envVars.find((x) => x.name === name)?.hint}
          className={cn(chipClass, "font-mono")}
        >
          ${name.replace("MORCHE_", "")}
        </button>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              className={chipClass}
            />
          }
        >
          More
          <ChevronDown className="size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Environment variables</DropdownMenuLabel>
            {envVars
              .filter((x) => !first.includes(x.name))
              .map((x) => (
                <DropdownMenuItem key={x.name} onClick={() => insert(x.name)}>
                  <span className="font-mono text-caption">${x.name}</span>
                  <span className="ms-auto ps-4 text-caption text-ash">
                    {x.hint}
                  </span>
                </DropdownMenuItem>
              ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
