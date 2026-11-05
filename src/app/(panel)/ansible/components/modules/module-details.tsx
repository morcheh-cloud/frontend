"use client"

import {
  Check,
  ChevronDown,
  Copy,
  FilePlus2,
  Puzzle,
  TriangleAlert,
} from "lucide-react"
import { type ReactNode, useDeferredValue, useState } from "react"
import { toast } from "sonner"

import { Empty, SearchBox } from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import type { ModuleDoc, ModuleOption } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useModuleDoc } from "../../api"
import { newPlaybookHref } from "../meta"
import { YamlEditor } from "../yaml-editor"
import { categoryOf, DocText, ModuleIcon, plain } from "./meta"

// A module's page: a side sheet on desktop, a full bottom sheet on phones.
// Drive `open` with useOpen.
export function ModuleDetailsLayer({
  name,
  open,
  onOpenChange,
  phone,
  action,
}: {
  name: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  phone: boolean
  /** e.g. "Use in a new playbook" / "Add to the play". */
  action?: (doc: ModuleDoc) => ReactNode
}) {
  const doc = useModuleDoc(open ? name : undefined)
  const d = doc.data
  const title = d?.short_name ?? name?.split(".").pop() ?? "Module"
  const subtitle = d ? plain(d.description) : (name ?? "")
  const body = doc.isError ? (
    <Empty
      icon={Puzzle}
      title="Couldn't read this module"
      body={doc.error.message}
      className="md:border-0"
    />
  ) : !d ? (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  ) : (
    <ModuleDocView doc={d} />
  )
  const footer = d && action?.(d)

  if (phone) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        full
        header={
          <div className="px-6 pt-1 pb-3">
            <p className="truncate text-subheading font-medium">{title}</p>
            <p className="line-clamp-2 text-body-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>
        }
        footer={footer || undefined}
      >
        <div className="px-2 pb-2">{body}</div>
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="flex-row items-center gap-3 border-b border-border px-6 py-4">
          {d && <ModuleIcon category={d.category} />}
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate pe-6 text-body">{title}</SheetTitle>
            <SheetDescription className="truncate">{subtitle}</SheetDescription>
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{body}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border px-6 py-3">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export function ModuleDocView({ doc }: { doc: ModuleDoc }) {
  const required = doc.options.filter((o) => o.required)
  const main = doc.main
    .map((n) => doc.options.find((o) => o.name === n))
    .filter((o): o is ModuleOption => !!o && !o.required)
  const shown = new Set([...required, ...main].map((o) => o.name))
  const rest = doc.options.filter((o) => !shown.has(o.name))

  return (
    <div className="flex flex-col gap-6">
      {doc.deprecated && (
        <p className="flex gap-2 rounded-2xl bg-subtle p-4 text-body-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            <span className="font-medium">On its way out. </span>
            <DocText text={doc.deprecated} />
          </span>
        </p>
      )}
      <div className="flex flex-col gap-2 text-body-sm text-muted-foreground">
        {doc.details.map((p) => (
          <p key={p}>
            <DocText text={p} />
          </p>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-subtle p-4 text-body-sm sm:grid-cols-3">
        <Fact label="Full name" mono>
          {doc.name}
        </Fact>
        <Fact label="Category">{categoryOf(doc.category).label}</Fact>
        <Fact label="Dry run">
          {doc.check_mode === "full"
            ? "Supported"
            : doc.check_mode === "partial"
              ? "Partly"
              : doc.check_mode === "none"
                ? "Skipped"
                : "Unknown"}
        </Fact>
        {doc.requirements.length > 0 && (
          <Fact label="Needs on the server" wide>
            {doc.requirements.map((r) => (
              <span key={r} className="block">
                <DocText text={r} />
              </span>
            ))}
          </Fact>
        )}
      </dl>

      {doc.free_form && (
        <p className="text-body-sm text-muted-foreground">
          Takes its command as a bare string:{" "}
          <code className="rounded bg-muted px-1 font-mono text-caption">
            {doc.short_name}: …
          </code>
        </p>
      )}

      {required.length > 0 && (
        <OptionGroup title="Required" options={required} />
      )}
      {main.length > 0 && <OptionGroup title="Most used" options={main} />}
      {rest.length > 0 && <MoreOptions options={rest} />}
      {doc.options.length === 0 && !doc.free_form && (
        <p className="text-body-sm text-muted-foreground">
          It takes no options.
        </p>
      )}

      {doc.examples && <Examples text={doc.examples} />}

      {doc.notes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-body-sm font-medium">Notes</h3>
          <ul className="flex list-disc flex-col gap-1.5 ps-5 text-body-sm text-muted-foreground">
            {doc.notes.map((n) => (
              <li key={n}>
                <DocText text={n} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Fact({
  label,
  children,
  mono,
  wide,
}: {
  label: string
  children: ReactNode
  mono?: boolean
  wide?: boolean
}) {
  return (
    <div className={cn("min-w-0", wide && "col-span-full")}>
      <dt className="text-caption text-ash">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 break-words",
          mono ? "font-mono text-caption break-all" : "font-medium",
        )}
      >
        {children}
      </dd>
    </div>
  )
}

function OptionGroup({
  title,
  options,
}: {
  title: string
  options: ModuleOption[]
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-body-sm font-medium">{title}</h3>
      <ul className="divide-y divide-border rounded-2xl border border-border">
        {options.map((o) => (
          <OptionDoc key={o.name} option={o} />
        ))}
      </ul>
    </section>
  )
}

function MoreOptions({ options }: { options: ModuleOption[] }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const needle = useDeferredValue(q.trim().toLowerCase())
  const shown = needle
    ? options.filter(
        (o) =>
          o.name.includes(needle) ||
          o.aliases?.some((a) => a.includes(needle)) ||
          o.description.some((d) => d.toLowerCase().includes(needle)),
      )
    : options
  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-2 self-start rounded-lg text-body-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8"
      >
        <ChevronDown
          className={cn("size-4 transition-transform", !open && "-rotate-90")}
        />
        Other options ({options.length})
      </button>
      {open && (
        <>
          {options.length > 8 && (
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder="Search options"
              label="Search options"
              className="md:w-full"
            />
          )}
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {shown.map((o) => (
              <OptionDoc key={o.name} option={o} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export function typeLabel(o: ModuleOption) {
  if (o.type === "list") return `list of ${o.elements || "str"}`
  return o.type
}

export const valueText = (v: unknown) =>
  typeof v === "string" ? v : JSON.stringify(v)

function OptionDoc({
  option: o,
  nested,
}: {
  option: ModuleOption
  nested?: boolean
}) {
  return (
    <li className={cn("flex flex-col gap-1.5 py-3", nested ? "ps-3" : "px-4")}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <code className="font-mono text-body-sm font-medium">{o.name}</code>
        <span className="text-caption text-ash">{typeLabel(o)}</span>
        {o.required && (
          <span className="rounded-full bg-brand-soft px-2 text-caption text-brand-strong">
            required
          </span>
        )}
        {o.default !== undefined && o.default !== null && (
          <span className="text-caption text-ash">
            default{" "}
            <code className="font-mono text-muted-foreground">
              {valueText(o.default)}
            </code>
          </span>
        )}
      </div>
      {o.description.map((p) => (
        <p key={p} className="text-body-sm text-muted-foreground">
          <DocText text={p} />
        </p>
      ))}
      {o.choices && o.choices.length > 0 && (
        <p className="flex flex-wrap gap-1 text-caption">
          <span className="text-ash">One of</span>
          {o.choices.map((c) => (
            <code
              key={valueText(c)}
              className="rounded bg-muted px-1 font-mono text-foreground"
            >
              {valueText(c)}
            </code>
          ))}
        </p>
      )}
      {o.aliases && o.aliases.length > 0 && (
        <p className="text-caption text-ash">
          Also written as {o.aliases.join(", ")}
        </p>
      )}
      {o.suboptions && o.suboptions.length > 0 && (
        <ul className="mt-1 divide-y divide-border border-s-2 border-border">
          {o.suboptions.map((s) => (
            <OptionDoc key={s.name} option={s} nested />
          ))}
        </ul>
      )}
    </li>
  )
}

function Examples({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (!navigator.clipboard?.writeText) {
      toast.error("Copying isn't available on this connection.")
      return
    }
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      },
      () => toast.error("Couldn't copy."),
    )
  }
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center">
        <h3 className="text-body-sm font-medium">Examples</h3>
        <Button
          variant="ghost"
          size="sm"
          className="ms-auto h-11 md:h-7"
          onClick={copy}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border">
        <YamlEditor value={text} readOnly height="auto" />
      </div>
    </section>
  )
}

// "Use in a new playbook": the new playbook page reads ?module=.
export const newPlaybookWith = (module: string) =>
  newPlaybookHref("/ansible/playbooks/new", { module })

export const UseIcon = FilePlus2
