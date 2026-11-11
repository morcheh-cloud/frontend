"use client"

import {
  Activity,
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  ArrowRightLeft,
  ArrowUp,
  ArrowUpToLine,
  Check,
  CircleCheck,
  Copy,
  Download,
  Ellipsis,
  Filter,
  FlaskConical,
  ListChecks,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Repeat,
  Route,
  Signpost,
  Trash2,
  TriangleAlert,
  Unlink,
  Upload,
  X,
} from "lucide-react"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import {
  Callout,
  FieldError,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ChoiceSelect } from "@/app/(panel)/dns/components/fields"
import {
  type Item,
  ItemMenu,
  SearchBox,
  Segmented,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { Field } from "@/components/field"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import type {
  ProxyHost,
  RedirectTargetCheck,
  Proxy as ReverseProxy,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  type RedirectRange,
  useCheckTargets,
  useRedirectStats,
} from "../../../api"
import { useProxyCan } from "../../../components/permissions"
import { type Draft, domainList, type Errors } from "./draft"
import { EditorCard as Card } from "./editor-card"
import { MigrateLayer } from "./migrate-layer"
import { ImportLayer } from "./redirect-import"
import { UsageCard } from "./redirect-usage"
import { VisitorFields, WhenFields } from "./redirect-when"
import {
  checkRedirects,
  codeMeta,
  compileRedirects,
  findChains,
  followAddress,
  freshRedirect,
  hasWhen,
  localTime,
  MAX_REDIRECTS,
  matchMeta,
  quickRule,
  type RedirectDraft,
  type RedirectMatch,
  type RuleCode,
  type RuleProblem,
  type RuleUse,
  redirectCodes,
  redirectsCsv,
  ruleMatches,
  ruleUse,
  shortenChains,
  type TargetState,
  targetState,
  targetUrl,
  type Visitor,
  whenText,
} from "./redirects"

type Props = {
  proxy: ReverseProxy
  // The saved site; undefined while it's new (no log to read yet).
  host?: ProxyHost
  geo: "" | "ready" | "off" | undefined
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
  readOnly: boolean
}

type Show = "all" | "problems" | "off" | "unused" | "broken"
const PAGE = 100
const MAX_CHECKS = 500
const CHECK_BATCH = 100

export const codeItems = redirectCodes.map((c) => ({
  value: String(c),
  label: codeMeta[c].label,
}))

const matchItems = (Object.keys(matchMeta) as RedirectMatch[]).map((m) => ({
  value: m,
  label: matchMeta[m].short,
}))

// Old addresses of the site sent to new ones: a list that can hold
// thousands, so it's searchable, paged and filled by import.
export function RedirectsTab(props: Props) {
  const { proxy, host, geo, draft, set, errors, phone, readOnly } = props
  const rows = draft.redirects
  const domains = domainList(draft.domains)
  const strict = draft.redirectStrictSlash
  const can = useProxyCan()
  // The log is read for a saved site only, by Operators and up.
  const logged = !!host && proxy.capabilities.traffic && can(proxy, "operator")
  const engineer = can(proxy, "engineer")
  const [q, setQ] = useState("")
  const [show, setShow] = useState<Show>("all")
  const [limit, setLimit] = useState(PAGE)
  const [editing, setEditing] = useState<RedirectDraft | null>(null)
  const [editorOpen, setEditorOpen] = useOpen("redirect-editor")
  const [importOpen, setImportOpen] = useOpen("redirect-import")
  const [migrateOpen, setMigrateOpen] = useOpen("redirect-migrate")
  const [clearOpen, setClearOpen] = useOpen("redirects-clear")
  const [menuOpen, setMenuOpen] = useOpen("redirects-menu")
  const [bulkOpen, setBulkOpen] = useOpen("redirects-bulk")
  const [range, setRange] = useState<RedirectRange>("7d")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // Phones pick rules in a mode of their own; desktop rows have boxes.
  const [selecting, setSelecting] = useState(false)
  const [checks, setChecks] = useState<Map<string, RedirectTargetCheck>>(
    new Map(),
  )
  const [checking, setChecking] = useState<{
    done: number
    total: number
  } | null>(null)
  const checkTargets = useCheckTargets()
  const stats = useRedirectStats(proxy.id, host?.id ?? "", range, logged)
  const use =
    stats.data && !stats.data.missing
      ? ruleUse(rows, stats.data.answered, domains, strict)
      : undefined

  // Targets on this site are asked at its main name.
  const mainName = domains.find((d) => !d.startsWith("*") && !d.startsWith("~"))
  const base = mainName
    ? `${draft.tls ? "https" : "http"}://${mainName}`
    : undefined
  const targetOf = (r: RedirectDraft) => {
    const url = targetUrl(r, base)
    const check = url ? checks.get(url) : undefined
    return check ? { state: targetState(check.status), check } : undefined
  }

  const local = checkRedirects(rows, domains, strict)
  const problemOf = (r: RedirectDraft): RuleProblem | undefined => {
    for (const field of ["from", "to", "when"] as const) {
      const message = errors[`redirects.${r.key}.${field}`]
      if (message) return { field, message }
    }
    return local.get(r.key)
  }
  const chains = findChains(rows, domains, strict)
  const shortenable = [...chains.values()].filter((c) => !c.loop).length
  const problems = rows.filter((r) => problemOf(r)).length
  const off = rows.filter((r) => r.off).length
  const isUnused = (r: RedirectDraft) => !!use && !r.off && !use.has(r.key)
  const unused = rows.filter(isUnused).length
  const broken = rows.filter((r) => targetOf(r)?.state === "broken").length
  const shown = rows.filter(
    (r) =>
      ruleMatches(r, q) &&
      (show === "all" ||
        (show === "problems" && (problemOf(r) || chains.get(r.key)?.loop)) ||
        (show === "off" && r.off) ||
        (show === "unused" && isUnused(r)) ||
        (show === "broken" && targetOf(r)?.state === "broken")),
  )
  const picked = rows.filter((r) => selected.has(r.key))
  const allShownPicked =
    shown.length > 0 && shown.every((r) => selected.has(r.key))

  const put = (redirects: RedirectDraft[]) => set({ redirects })
  const patch = (key: string, p: Partial<RedirectDraft>) =>
    put(rows.map((r) => (r.key === key ? { ...r, ...p } : r)))
  const move = (key: string, to: "top" | "up" | "down" | "bottom") => {
    const i = rows.findIndex((r) => r.key === key)
    const next = [...rows]
    const [r] = next.splice(i, 1)
    const at =
      to === "top"
        ? 0
        : to === "bottom"
          ? next.length
          : Math.max(0, Math.min(next.length, i + (to === "up" ? -1 : 1)))
    next.splice(at, 0, r)
    put(next)
  }
  const edit = (r: RedirectDraft | null) => {
    setEditing(r)
    setEditorOpen(true)
  }
  const filter = (v: Show) => {
    setShow(v)
    setLimit(PAGE)
  }
  const download = (list: RedirectDraft[], suffix = "") => {
    const blob = new Blob([redirectsCsv(list)], { type: "text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `redirects-${domains[0] ?? "site"}${suffix}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const exportCsv = () => download(rows)

  const shorten = () => {
    const r = shortenChains(rows, domains, strict)
    if (!r.changed) {
      toast.info(
        "Nothing to shorten: the chains left go through patterns or end in a 410.",
      )
      return
    }
    put(r.rows)
    toast.success(
      `${r.changed} ${r.changed === 1 ? "rule now points" : "rules now point"} straight at the last address. Save to put it on the server.`,
    )
  }

  const runCheck = async () => {
    const urls = [
      ...new Set(
        rows.map((r) => targetUrl(r, base)).filter((u): u is string => !!u),
      ),
    ]
    if (!urls.length) {
      toast.info(
        base
          ? "No targets to check: patterns with $1, starts-with rules and 410s are left out."
          : "Give the site a name first: paths are checked at it.",
      )
      return
    }
    const list = urls.slice(0, MAX_CHECKS)
    const next = new Map<string, RedirectTargetCheck>()
    setChecking({ done: 0, total: list.length })
    try {
      for (let i = 0; i < list.length; i += CHECK_BATCH) {
        const r = await checkTargets.mutateAsync({
          id: proxy.id,
          urls: list.slice(i, i + CHECK_BATCH),
        })
        for (const c of r.results) next.set(c.url, c)
        setChecks(new Map(next))
        setChecking({
          done: Math.min(list.length, i + CHECK_BATCH),
          total: list.length,
        })
      }
      const bad = [...next.values()].filter(
        (c) => targetState(c.status) === "broken",
      ).length
      const more =
        urls.length > list.length
          ? ` Checked the first ${MAX_CHECKS} of ${urls.length}.`
          : ""
      if (bad) {
        toast.warning(
          `${bad} of ${next.size} targets don't answer well.${more}`,
        )
        filter("broken")
      } else toast.success(`All ${next.size} targets answer.${more}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setChecking(null)
    }
  }

  const pick = (key: string) => {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setSelected(next)
  }
  const pickShown = (on: boolean) => {
    const next = new Set(selected)
    for (const r of shown) {
      if (on) next.add(r.key)
      else next.delete(r.key)
    }
    setSelected(next)
  }
  const endSelect = () => {
    setSelected(new Set())
    setSelecting(false)
  }
  const bulk = (fn: (r: RedirectDraft) => RedirectDraft, done: string) => {
    put(rows.map((r) => (selected.has(r.key) ? fn(r) : r)))
    toast.success(done)
  }
  const n = picked.length
  const rules = (k: number) => `${k} ${k === 1 ? "rule" : "rules"}`
  const setCode = (code: RuleCode) => {
    // A 410 has no target: making it a redirect would leave it empty.
    const skipped = code === 410 ? 0 : picked.filter((r) => !r.to.trim()).length
    put(
      rows.map((r) =>
        selected.has(r.key) && (code === 410 || r.to.trim())
          ? { ...r, code }
          : r,
      ),
    )
    toast.success(
      `${rules(n - skipped)} now answer ${codeMeta[code].label}.${skipped ? ` ${skipped} without a target were left as they were.` : ""}`,
    )
  }
  const removePicked = () => {
    const before = rows
    put(rows.filter((r) => !selected.has(r.key)))
    setSelected(new Set())
    toast(`${rules(n)} removed.`, {
      action: { label: "Undo", onClick: () => put(before) },
    })
  }

  const bulkMenu: Item[][] = [
    [
      {
        key: "on",
        label: "Turn on",
        icon: <Power />,
        disabled: readOnly,
        onSelect: () =>
          bulk((r) => ({ ...r, off: false }), `${rules(n)} turned on.`),
      },
      {
        key: "off",
        label: "Turn off",
        icon: <PowerOff />,
        disabled: readOnly,
        onSelect: () =>
          bulk((r) => ({ ...r, off: true }), `${rules(n)} turned off.`),
      },
    ],
    redirectCodes.map((c) => ({
      key: `code-${c}`,
      label: `Answer ${codeMeta[c].label}`,
      icon: <Signpost />,
      disabled: readOnly,
      onSelect: () => setCode(c),
    })),
    [
      {
        key: "keep",
        label: "Keep the query string",
        icon: <ArrowRight />,
        disabled: readOnly,
        onSelect: () =>
          bulk(
            (r) => ({ ...r, keepQuery: true }),
            `${rules(n)} keep the query string.`,
          ),
      },
      {
        key: "drop",
        label: "Drop the query string",
        icon: <X />,
        disabled: readOnly,
        onSelect: () =>
          bulk(
            (r) => ({ ...r, keepQuery: false }),
            `${rules(n)} drop the query string.`,
          ),
      },
    ],
    [
      {
        key: "export",
        label: "Export as CSV",
        icon: <Download />,
        onSelect: () => download(picked, "-selected"),
      },
      {
        key: "remove",
        label: `Remove ${rules(n)}`,
        icon: <Trash2 />,
        destructive: true,
        disabled: readOnly,
        onSelect: removePicked,
      },
    ],
  ]

  const menu: Item[][] = [
    [
      {
        key: "import",
        label: "Import a list…",
        icon: <Upload />,
        disabled: readOnly,
        onSelect: () => setImportOpen(true),
      },
      {
        key: "migrate",
        label: "Moving to a new site…",
        icon: <ArrowRightLeft />,
        disabled: readOnly,
        onSelect: () => setMigrateOpen(true),
      },
      {
        key: "export",
        label: "Export as CSV",
        icon: <Download />,
        disabled: !rows.length,
        onSelect: exportCsv,
      },
    ],
    [
      ...(phone
        ? [
            {
              key: "select",
              label: "Select rules",
              icon: <ListChecks />,
              disabled: !rows.length,
              onSelect: () => setSelecting(true),
            },
          ]
        : []),
      {
        key: "check",
        label: checking ? "Checking targets…" : "Check the targets",
        icon: <Activity />,
        disabled: !engineer || !rows.length || !!checking,
        onSelect: runCheck,
      },
      {
        key: "shorten",
        label: `Shorten chains${shortenable ? ` (${shortenable})` : ""}`,
        icon: <Route />,
        disabled: readOnly || !shortenable,
        onSelect: shorten,
      },
    ],
    [
      {
        key: "drop-off",
        label: `Remove the rules that are off${off ? ` (${off})` : ""}`,
        icon: <PowerOff />,
        disabled: readOnly || !off,
        onSelect: () => put(rows.filter((r) => !r.off)),
      },
      {
        key: "clear",
        label: "Remove every rule…",
        icon: <Trash2 />,
        destructive: true,
        disabled: readOnly || !rows.length,
        onSelect: () => setClearOpen(true),
      },
    ],
  ]

  const ruleMenu = (r: RedirectDraft, i: number): Item[][] => [
    [
      {
        key: "edit",
        label: readOnly ? "Details" : "Edit",
        icon: <Pencil />,
        onSelect: () => edit(r),
      },
      {
        key: "off",
        label: r.off ? "Turn on" : "Turn off",
        icon: r.off ? <Power /> : <PowerOff />,
        disabled: readOnly,
        onSelect: () => patch(r.key, { off: !r.off }),
      },
      {
        key: "copy",
        label: "Duplicate",
        icon: <Copy />,
        disabled: readOnly,
        onSelect: () => {
          const next = [...rows]
          next.splice(i + 1, 0, { ...r, key: freshRedirect().key, off: true })
          put(next)
        },
      },
    ],
    [
      {
        key: "top",
        label: "Move to top",
        icon: <ArrowUpToLine />,
        disabled: readOnly || i === 0,
        onSelect: () => move(r.key, "top"),
      },
      {
        key: "up",
        label: "Move up",
        icon: <ArrowUp />,
        disabled: readOnly || i === 0,
        onSelect: () => move(r.key, "up"),
      },
      {
        key: "down",
        label: "Move down",
        icon: <ArrowDown />,
        disabled: readOnly || i === rows.length - 1,
        onSelect: () => move(r.key, "down"),
      },
      {
        key: "bottom",
        label: "Move to bottom",
        icon: <ArrowDownToLine />,
        disabled: readOnly || i === rows.length - 1,
        onSelect: () => move(r.key, "bottom"),
      },
    ],
    [
      {
        key: "remove",
        label: "Remove",
        icon: <Trash2 />,
        destructive: true,
        disabled: readOnly,
        onSelect: () => put(rows.filter((x) => x.key !== r.key)),
      },
    ],
  ]

  const full = rows.length >= MAX_REDIRECTS
  const index = new Map(rows.map((r, i) => [r.key, i]))
  const boxes = !phone && !readOnly
  const filters: { value: Show; label: string }[] = [
    { value: "all", label: `All ${rows.length}` },
    { value: "problems", label: `Problems ${problems}` },
    { value: "off", label: `Off ${off}` },
    ...(use ? [{ value: "unused" as const, label: `Unused ${unused}` }] : []),
    ...(broken || show === "broken"
      ? [{ value: "broken" as const, label: `Broken ${broken}` }]
      : []),
  ]

  return (
    <>
      <Card
        title="Redirects"
        count={rows.length}
        hint="Old addresses of this site sent to new ones, before anything else answers. Exact addresses win; then the first starts-with or pattern rule in the list."
        phone={phone}
        action={
          phone ? (
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Redirect options"
              onClick={() => setMenuOpen(true)}
            >
              <Ellipsis />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={readOnly}
                onClick={() => setImportOpen(true)}
              >
                <Upload />
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={readOnly}
                onClick={() => setMigrateOpen(true)}
              >
                <ArrowRightLeft />
                Migrate
              </Button>
              <ItemMenu
                label="Redirect options"
                groups={[menu[0].slice(2), ...menu.slice(1)]}
              />
            </div>
          )
        }
      >
        <FieldError text={errors.redirects ?? errors["redirects.rules"]} />
        {rows.length === 0 ? (
          <EmptyState
            phone={phone}
            readOnly={readOnly}
            onAdd={() => edit(null)}
            onImport={() => setImportOpen(true)}
            onMigrate={() => setMigrateOpen(true)}
          />
        ) : (
          <>
            {phone && selecting ? (
              <div className="flex min-h-11 items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label="Done selecting"
                  onClick={endSelect}
                >
                  <X />
                </Button>
                <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
                  {n ? `${n} selected` : "Tap rules to select"}
                </span>
                <Button
                  variant="ghost"
                  className="h-11"
                  onClick={() => pickShown(!allShownPicked)}
                >
                  {allShownPicked ? "None" : "All"}
                </Button>
                <Button
                  className="h-11"
                  disabled={!n}
                  onClick={() => setBulkOpen(true)}
                >
                  Actions
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <div className="flex items-center gap-2 md:contents">
                  <SearchBox
                    value={q}
                    onChange={(v) => {
                      setQ(v)
                      setLimit(PAGE)
                    }}
                    placeholder="Search addresses and notes"
                    label="Search redirects"
                    className="min-w-0 flex-1 md:flex-none"
                  />
                  {phone && !readOnly && (
                    <Button
                      size="icon-lg"
                      aria-label="Add a redirect"
                      disabled={full}
                      onClick={() => edit(null)}
                    >
                      <Plus />
                    </Button>
                  )}
                </div>
                {(problems > 0 ||
                  off > 0 ||
                  unused > 0 ||
                  broken > 0 ||
                  show !== "all") && (
                  <div className="no-scrollbar overflow-x-auto">
                    <Segmented<Show>
                      label="Show"
                      value={show}
                      onChange={filter}
                      items={filters}
                    />
                  </div>
                )}
                {checking && (
                  <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
                    <LoaderCircle className="size-3.5 animate-spin" />
                    Checking targets {checking.done}/{checking.total}
                  </span>
                )}
                {!phone && !readOnly && (
                  <Button
                    className="ms-auto"
                    disabled={full}
                    onClick={() => edit(null)}
                  >
                    <Plus />
                    Add redirect
                  </Button>
                )}
              </div>
            )}
            {full && (
              <Callout icon={<TriangleAlert />} tone="warning">
                A site holds up to {MAX_REDIRECTS.toLocaleString()} rules.
                Starts-with and pattern rules can cover many addresses at once.
              </Callout>
            )}
            {shortenable > 0 && !readOnly && !selecting && (
              <Callout icon={<Route />} tone="warning">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>
                    {shortenable === 1
                      ? "1 rule sends visitors into another redirect."
                      : `${shortenable} rules send visitors into another redirect.`}{" "}
                    Each extra hop costs a round trip and some search ranking.
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 md:h-8"
                    onClick={shorten}
                  >
                    Shorten chains
                  </Button>
                </span>
              </Callout>
            )}
            {boxes && n > 0 && (
              <BulkBar
                count={n}
                menu={bulkMenu}
                onRemove={removePicked}
                onClear={() => setSelected(new Set())}
                onTurn={(on) =>
                  bulk(
                    (r) => ({ ...r, off: !on }),
                    `${rules(n)} turned ${on ? "on" : "off"}.`,
                  )
                }
              />
            )}
            {shown.length === 0 ? (
              <p className="py-6 text-center text-body-sm text-muted-foreground">
                No rules match.
              </p>
            ) : (
              <div
                className={cn(
                  phone
                    ? "-mx-4 border-y border-border"
                    : "overflow-hidden rounded-xl border border-border",
                )}
              >
                {!phone && (
                  <div className="flex h-9 items-center gap-3 border-b border-border bg-subtle px-3 text-caption text-muted-foreground">
                    {boxes && (
                      <Checkbox
                        aria-label="Select all shown"
                        checked={allShownPicked}
                        indeterminate={!allShownPicked && n > 0}
                        onCheckedChange={(v) => pickShown(!!v)}
                      />
                    )}
                    <span className="flex-1">Old address → new address</span>
                    {use && <span className="w-24 text-end">Used</span>}
                    <span className="w-[4.75rem]" />
                  </div>
                )}
                <ul className="flex flex-col divide-y divide-border">
                  {shown.slice(0, limit).map((r) => {
                    const i = index.get(r.key) ?? 0
                    const row: RowProps = {
                      rule: r,
                      problem: problemOf(r),
                      chain: chains.get(r.key),
                      target: targetOf(r),
                      use: use ? (use.get(r.key) ?? null) : undefined,
                      menu: ruleMenu(r, i),
                      onOpen: () => edit(r),
                    }
                    return phone ? (
                      <PhoneRow
                        key={r.key}
                        {...row}
                        selecting={selecting}
                        selected={selected.has(r.key)}
                        onPick={() => pick(r.key)}
                      />
                    ) : (
                      <DesktopRow
                        key={r.key}
                        {...row}
                        readOnly={readOnly}
                        selected={boxes ? selected.has(r.key) : undefined}
                        onPick={() => pick(r.key)}
                        onToggle={(on) => patch(r.key, { off: !on })}
                      />
                    )
                  })}
                </ul>
              </div>
            )}
            {shown.length > limit && (
              <Button
                variant="outline"
                className="self-center"
                onClick={() => setLimit(limit + PAGE * 4)}
              >
                Show more ({(shown.length - limit).toLocaleString()} left)
              </Button>
            )}
            {!phone && !readOnly && !full && (
              <QuickAdd
                rows={rows}
                domains={domains}
                strict={strict}
                onAdd={(r) => put([...rows, r])}
              />
            )}
          </>
        )}
        <ToggleRow
          id="redirect-strict"
          label="Tell /page and /page/ apart"
          hint={
            strict
              ? "An exact rule takes only the address as written."
              : "Off: an exact rule for /page also takes /page/ (and the other way round)."
          }
          checked={strict}
          disabled={readOnly}
          onChange={(redirectStrictSlash) => set({ redirectStrictSlash })}
        />
      </Card>

      {logged && host && (
        <UsageCard
          phone={phone}
          readOnly={readOnly}
          range={range}
          onRange={setRange}
          stats={stats.data}
          loading={stats.isPending}
          error={stats.error?.message}
          use={use ?? new Map()}
          rows={rows}
          domains={domains}
          strict={strict}
          hostId={host.id}
          onShowUnused={() => {
            setQ("")
            filter("unused")
          }}
          onAdd={(fresh) => put([...rows, ...fresh])}
        />
      )}

      {rows.length > 0 && (
        <Tester rows={rows} domains={domains} strict={strict} phone={phone} />
      )}

      <RuleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        rule={editing}
        rows={rows}
        domains={domains}
        strict={strict}
        readOnly={readOnly}
        geo={geo}
        onSave={(r) => {
          if (rows.some((x) => x.key === r.key)) patch(r.key, r)
          else put([...draft.redirects, r])
        }}
      />
      <ImportLayer
        open={importOpen}
        onOpenChange={setImportOpen}
        rows={rows}
        domains={domains}
        strict={strict}
        onImport={(redirects) => {
          put(redirects)
          setShow("all")
          setQ("")
        }}
      />
      <MigrateLayer
        open={migrateOpen}
        onOpenChange={setMigrateOpen}
        proxyId={proxy.id}
        rows={rows}
        domains={domains}
        strict={strict}
        pages={stats.data?.pages.map((p) => p.path) ?? []}
        onImport={(redirects) => {
          put(redirects)
          setShow("all")
          setQ("")
        }}
      />
      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title={`Remove all ${rows.length} redirects?`}
        description="Nothing changes on the server until you save; Cancel at the top brings them back."
        confirmLabel="Remove all"
        onConfirm={() => {
          put([])
          setClearOpen(false)
        }}
      />
      {phone && (
        <>
          <BottomSheet
            open={menuOpen}
            onOpenChange={setMenuOpen}
            title="Redirects"
          >
            <SheetItems groups={menu} onOpenChange={setMenuOpen} />
          </BottomSheet>
          <BottomSheet
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            title={`${n} selected`}
          >
            <SheetItems groups={bulkMenu} onOpenChange={setBulkOpen} />
          </BottomSheet>
        </>
      )}
    </>
  )
}

// Actions for the ticked rules, above the list.
function BulkBar({
  count,
  menu,
  onTurn,
  onRemove,
  onClear,
}: {
  count: number
  menu: Item[][]
  onTurn: (on: boolean) => void
  onRemove: () => void
  onClear: () => void
}) {
  return (
    <div className="sticky top-[calc(3rem+1px+2.75rem+0.5rem)] z-10 flex flex-wrap items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-brand-strong">
      <span className="text-body-sm font-medium">{count} selected</span>
      <div className="ms-auto flex flex-wrap items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={() => onTurn(true)}>
          <Power />
          Turn on
        </Button>
        <Button variant="outline" size="sm" onClick={() => onTurn(false)}>
          <PowerOff />
          Turn off
        </Button>
        <ItemMenu
          label="Answer"
          groups={[menu[1]]}
          trigger={
            <Button variant="outline" size="sm">
              <Signpost />
              Answer
            </Button>
          }
        />
        <ItemMenu
          label="More for the selected rules"
          groups={[menu[2], [menu[3][0]]]}
          trigger={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="More for the selected rules"
            >
              <Ellipsis />
            </Button>
          }
        />
        <Button variant="outline" size="sm" onClick={onRemove}>
          <Trash2 />
          Remove
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Clear the selection"
          title="Clear the selection"
          onClick={onClear}
        >
          <X />
        </Button>
      </div>
    </div>
  )
}

function EmptyState({
  phone,
  readOnly,
  onAdd,
  onImport,
  onMigrate,
}: {
  phone: boolean
  readOnly: boolean
  onAdd: () => void
  onImport: () => void
  onMigrate: () => void
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-6 py-10 text-center",
        !phone && "rounded-xl border border-dashed border-border",
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Signpost className="size-5" />
      </span>
      <div>
        <p className="text-body-sm font-medium">No redirects yet</p>
        <p className="mt-1 max-w-md text-caption text-muted-foreground">
          Moved a page, renamed a section or rebuilt the site? Send the old
          addresses to the new ones so links and search results keep working.
          Paste a whole list from a spreadsheet, .htaccess, nginx or Netlify, or
          compare the old and new sitemaps.
        </p>
      </div>
      {!readOnly && (
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
          <Button className="h-11 md:h-9" onClick={onAdd}>
            <Plus />
            Add redirect
          </Button>
          <Button variant="outline" className="h-11 md:h-9" onClick={onImport}>
            <Upload />
            Import a list
          </Button>
          <Button variant="outline" className="h-11 md:h-9" onClick={onMigrate}>
            <ArrowRightLeft />
            Moving to a new site
          </Button>
        </div>
      )}
    </div>
  )
}

type RowProps = {
  rule: RedirectDraft
  problem?: RuleProblem
  chain?: { loop: boolean; hops: { target: string; code: number }[] }
  // The last target check; absent until one ran.
  target?: { state: TargetState; check: RedirectTargetCheck }
  // From the access log: null = never met, undefined = no counts.
  use?: RuleUse | null
  menu: Item[][]
  onOpen: () => void
}

const shortTime = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString()
}

function Target({ rule }: { rule: RedirectDraft }) {
  if (rule.code === 410)
    return <span className="text-muted-foreground">Gone (410)</span>
  return (
    <>
      {rule.to || <span className="text-ash">—</span>}
      {rule.match === "prefix" && rule.to && (
        <span className="text-ash">{rule.to.endsWith("/") ? "" : "/"}…</span>
      )}
    </>
  )
}

function Tag({
  children,
  tone,
  title,
}: {
  children: ReactNode
  tone?: "warning" | "destructive"
  title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 text-caption whitespace-nowrap text-muted-foreground [&_svg]:size-3",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "destructive" && "bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </span>
  )
}

function ChainTag({ chain }: { chain: NonNullable<RowProps["chain"]> }) {
  return chain.loop ? (
    <Tag
      tone="destructive"
      title="The target is redirected back again: visitors never arrive."
    >
      <Repeat />
      Loop
    </Tag>
  ) : (
    <Tag
      tone="warning"
      title={`The target is redirected again${chain.hops[0] ? ` to ${chain.hops.at(-1)?.target || "Gone"}` : ""}: point this rule straight there.`}
    >
      <ArrowRight />
      Chain
    </Tag>
  )
}

function TargetTag({ target }: { target: NonNullable<RowProps["target"]> }) {
  const { state, check } = target
  if (state === "broken")
    return (
      <Tag
        tone="destructive"
        title={
          check.error ||
          `${check.url} answered ${check.status}: visitors land on an error.`
        }
      >
        <Unlink />
        {check.status ? `Broken ${check.status}` : "No answer"}
      </Tag>
    )
  if (state === "redirects")
    return (
      <Tag
        tone="warning"
        title={`${check.url} answers ${check.status}${check.location ? ` and sends visitors on to ${check.location}` : ""}: point the rule straight there.`}
      >
        <ArrowRight />
        Redirects again
      </Tag>
    )
  return null
}

function WhenTag({ rule }: { rule: RedirectDraft }) {
  if (!hasWhen(rule.when)) return null
  return (
    <Tag title={`Only for: ${whenText(rule.when)}`}>
      <Filter />
      Some visitors
    </Tag>
  )
}

function UseCount({ use }: { use: RuleUse | null }) {
  if (!use)
    return (
      <span
        className="text-caption text-ash"
        title="No visitor met this rule in the chosen period."
      >
        Unused
      </span>
    )
  return (
    <span
      className="text-caption text-muted-foreground tabular-nums"
      title={use.last ? `Last on ${shortTime(use.last)}` : undefined}
    >
      {use.count.toLocaleString()}×
    </span>
  )
}

function DesktopRow({
  rule: r,
  problem,
  chain,
  target,
  use,
  menu,
  onOpen,
  readOnly,
  selected,
  onPick,
  onToggle,
}: RowProps & {
  readOnly: boolean
  // undefined = the list has no boxes.
  selected?: boolean
  onPick: () => void
  onToggle: (on: boolean) => void
}) {
  return (
    <li
      className={cn(
        "flex flex-col gap-1 px-3 py-2",
        r.off && "bg-subtle",
        selected && "bg-brand-soft/50",
      )}
    >
      <div className="flex min-h-9 items-center gap-3">
        {selected !== undefined && (
          <Checkbox
            aria-label={`Select ${r.from}`}
            checked={selected}
            onCheckedChange={onPick}
          />
        )}
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            "grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-md text-start font-mono text-body-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            r.off && "opacity-60",
          )}
        >
          <span
            className={cn(
              "truncate",
              problem?.field === "from" && "text-destructive",
            )}
            title={r.from}
          >
            {r.from || <span className="text-ash">—</span>}
          </span>
          <ArrowRight className="size-4 text-ash" />
          <span
            className={cn(
              "truncate",
              (problem?.field === "to" || target?.state === "broken") &&
                "text-destructive",
            )}
            title={r.to}
          >
            <Target rule={r} />
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          {r.match !== "exact" && <Tag>{matchMeta[r.match].short}</Tag>}
          <WhenTag rule={r} />
          {r.keepQuery && r.code !== 410 && <Tag>Keeps ?query</Tag>}
          {chain && <ChainTag chain={chain} />}
          {target && <TargetTag target={target} />}
          {r.code !== 410 && <Tag>{r.code}</Tag>}
          {r.note && (
            <span
              className="hidden max-w-40 truncate text-caption text-ash xl:inline"
              title={r.note}
            >
              {r.note}
            </span>
          )}
        </div>
        {use !== undefined && (
          <span className="w-24 shrink-0 text-end">
            {r.off ? (
              <span className="text-caption text-ash">Off</span>
            ) : (
              <UseCount use={use} />
            )}
          </span>
        )}
        <Switch
          checked={!r.off}
          disabled={readOnly}
          onCheckedChange={onToggle}
          aria-label={r.off ? "Turn on" : "Turn off"}
        />
        <ItemMenu label="Rule actions" groups={menu} />
      </div>
      {problem && (
        <p className="flex items-center gap-1.5 text-caption text-destructive">
          <TriangleAlert className="size-3.5 shrink-0" />
          {problem.message}
        </p>
      )}
    </li>
  )
}

function PhoneRow({
  rule: r,
  problem,
  chain,
  target,
  use,
  menu,
  selecting,
  selected,
  onPick,
}: RowProps & { selecting: boolean; selected: boolean; onPick: () => void }) {
  const [open, setOpen] = useOpen(`redirect-${r.key}`)
  const when = hasWhen(r.when) ? whenText(r.when) : ""
  return (
    <li>
      <button
        type="button"
        aria-pressed={selecting ? selected : undefined}
        onClick={() => (selecting ? onPick() : setOpen(true))}
        className={cn(
          "flex min-h-14 w-full items-center gap-3 px-4 py-2 text-start select-none active:bg-muted",
          selecting && selected && "bg-brand-soft/50",
        )}
      >
        {selecting && (
          <span
            aria-hidden
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-md border border-input",
              selected && "border-primary bg-primary text-primary-foreground",
            )}
          >
            {selected && <Check className="size-3.5" />}
          </span>
        )}
        <span className={cn("min-w-0 flex-1", r.off && "opacity-60")}>
          <span className="block truncate font-mono text-body-sm">
            {r.from}
          </span>
          <span
            className={cn(
              "flex items-center gap-1 truncate font-mono text-caption text-muted-foreground",
              target?.state === "broken" && "text-destructive",
            )}
          >
            <ArrowRight className="size-3 shrink-0" />
            <span className="truncate">
              <Target rule={r} />
            </span>
          </span>
          {when && (
            <span className="flex items-center gap-1 truncate text-caption text-ash">
              <Filter className="size-3 shrink-0" />
              <span className="truncate">{when}</span>
            </span>
          )}
          {problem && (
            <span className="block truncate text-caption text-destructive">
              {problem.message}
            </span>
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="flex items-center gap-1">
            {chain && <ChainTag chain={chain} />}
            {target && <TargetTag target={target} />}
            {r.off ? <Tag>Off</Tag> : r.code !== 410 && <Tag>{r.code}</Tag>}
          </span>
          {use !== undefined && !r.off && <UseCount use={use} />}
        </span>
      </button>
      <BottomSheet open={open} onOpenChange={setOpen} title={r.from}>
        <p className="-mt-1 mb-3 px-2 font-mono text-body-sm break-all text-muted-foreground">
          → <Target rule={r} />
        </p>
        {when && (
          <p className="-mt-2 mb-3 px-2 text-caption text-muted-foreground">
            Only for: {when}
          </p>
        )}
        <SheetItems groups={menu} onOpenChange={setOpen} />
      </BottomSheet>
    </li>
  )
}

// One line at the end of the list for typing rules in quickly.
function QuickAdd({
  rows,
  domains,
  strict,
  onAdd,
}: {
  rows: RedirectDraft[]
  domains: string[]
  strict: boolean
  onAdd: (r: RedirectDraft) => void
}) {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [code, setCode] = useState<RuleCode>(301)
  const [error, setError] = useState("")
  const submit = (e: { preventDefault(): void; stopPropagation(): void }) => {
    e.preventDefault()
    e.stopPropagation()
    const r = quickRule(from, to, code)
    const problem = checkRedirects([...rows, r], domains, strict).get(r.key)
    if (problem) return setError(problem.message)
    onAdd(r)
    setFrom("")
    setTo("")
    setError("")
    document.getElementById("redirect-quick-from")?.focus()
  }
  return (
    // A form inside the editor's form would nest; a div with Enter handling
    // keeps the page's Save out of it.
    <fieldset
      className="flex min-w-0 flex-col gap-1"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT")
          submit(e)
      }}
    >
      <legend className="sr-only">Add a redirect</legend>
      <div className="flex items-center gap-2">
        <Input
          id="redirect-quick-from"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value)
            setError("")
          }}
          placeholder="/old-page, /blog/* or ^/item/(\d+)$"
          aria-label="Old address"
          className="min-w-0 flex-1 font-mono"
        />
        <ArrowRight className="size-4 shrink-0 text-ash" />
        <Input
          value={code === 410 ? "" : to}
          disabled={code === 410}
          onChange={(e) => {
            setTo(e.target.value)
            setError("")
          }}
          placeholder={code === 410 ? "Gone" : "/new-page"}
          aria-label="New address"
          className="min-w-0 flex-1 font-mono"
        />
        <div className="w-40 shrink-0">
          <ChoiceSelect
            value={String(code)}
            onChange={(v) => setCode(Number(v) as RuleCode)}
            items={codeItems}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!from.trim()}
          onClick={submit}
        >
          <Plus />
          Add
        </Button>
      </div>
      {error ? (
        <FieldError text={error} />
      ) : (
        <p className="text-caption text-ash">
          Enter adds it. End with /* for everything under a path; start with ^
          for a pattern.
        </p>
      )}
    </fieldset>
  )
}

// Try an address against the rules as nginx would read them.
function Tester({
  rows,
  domains,
  strict,
  phone,
}: {
  rows: RedirectDraft[]
  domains: string[]
  strict: boolean
  phone: boolean
}) {
  const [address, setAddress] = useState("")
  const [visitor, setVisitor] = useState<Visitor>(() => ({
    country: "",
    language: "",
    device: "desktop",
    time: localTime(),
  }))
  // Asked only when some rule depends on who's visiting.
  const conditional = rows.some((r) => !r.off && hasWhen(r.when))
  const a = address.trim()
  const compiled = a ? compileRedirects(rows, domains, strict) : undefined
  const result =
    compiled &&
    followAddress(
      compiled,
      a,
      domains,
      strict,
      conditional ? visitor : undefined,
    )
  return (
    <Card
      title="Try an address"
      hint="See which rule an address meets and where visitors end up. Uses the rules above, saved or not."
      phone={phone}
    >
      <Input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder={`/old-page?id=7 or https://${domains[0] ?? "example.com"}/blog/post`}
        aria-label="Address to try"
        className="font-mono"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      {conditional && (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-muted-foreground">
            Some rules are only for some visitors. Who's asking:
          </p>
          <VisitorFields value={visitor} onChange={setVisitor} />
        </div>
      )}
      {result &&
        (result.hops.length === 0 ? (
          <Callout icon={<CircleCheck />}>
            No rule takes it: the site answers this address as usual.
          </Callout>
        ) : (
          <div className="flex flex-col gap-2">
            <ol className="flex flex-col gap-1.5">
              {result.hops.map((h, i) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: hops are fixed
                  key={i}
                  className="flex flex-wrap items-center gap-2 text-body-sm"
                >
                  <Tag>{h.code}</Tag>
                  {h.code === 410 ? (
                    <span>Gone: the page was removed.</span>
                  ) : (
                    <span className="min-w-0 font-mono break-all">
                      → {h.target}
                    </span>
                  )}
                  <span className="text-caption text-ash">
                    by {matchMeta[h.rule.match].short.toLowerCase()} rule{" "}
                    <span className="font-mono">{h.rule.from}</span>
                  </span>
                </li>
              ))}
            </ol>
            {result.loop ? (
              <Callout icon={<Repeat />} tone="warning">
                This goes round in a loop: the browser gives up with “too many
                redirects”.
              </Callout>
            ) : (
              result.hops.length > 1 && (
                <Callout icon={<TriangleAlert />} tone="warning">
                  Visitors are redirected {result.hops.length} times. Point the
                  first rule straight at the last address to save them the extra
                  trips.
                </Callout>
              )
            )}
          </div>
        ))}
    </Card>
  )
}

// Adds or edits one rule.
function RuleEditor({
  open,
  onOpenChange,
  rule,
  rows,
  domains,
  strict,
  readOnly,
  geo,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule: RedirectDraft | null
  rows: RedirectDraft[]
  domains: string[]
  strict: boolean
  readOnly: boolean
  geo: Props["geo"]
  onSave: (r: RedirectDraft) => void
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={rule ? (readOnly ? "Redirect" : "Edit redirect") : "Add redirect"}
      className="sm:max-w-xl"
    >
      {open && (
        <RuleForm
          // A fresh form for each rule opened.
          key={rule?.key ?? "new"}
          rule={rule}
          rows={rows}
          domains={domains}
          strict={strict}
          readOnly={readOnly}
          geo={geo}
          onCancel={() => onOpenChange(false)}
          onSave={(r, again) => {
            onSave(r)
            if (!again) onOpenChange(false)
          }}
        />
      )}
    </ResponsiveDialog>
  )
}

function RuleForm({
  rule,
  rows,
  domains,
  strict,
  readOnly,
  geo,
  onCancel,
  onSave,
}: {
  rule: RedirectDraft | null
  rows: RedirectDraft[]
  domains: string[]
  strict: boolean
  readOnly: boolean
  geo: Props["geo"]
  onCancel: () => void
  onSave: (r: RedirectDraft, again: boolean) => void
}) {
  const [r, setR] = useState<RedirectDraft>(() => rule ?? freshRedirect())
  const [tried, setTried] = useState(false)
  const [sample, setSample] = useState("")
  const p = (x: Partial<RedirectDraft>) => setR({ ...r, ...x })
  const others = rows.filter((x) => x.key !== r.key)
  const problem = checkRedirects([...others, r], domains, strict).get(r.key)
  const shownProblem = tried ? problem : undefined
  const gone = r.code === 410
  const meta = matchMeta[r.match]

  const save = (again: boolean) => {
    setTried(true)
    if (problem) return
    onSave(r, again)
    if (again) {
      setR(freshRedirect({ match: r.match, code: r.code }))
      setTried(false)
      setSample("")
    }
  }

  // Try the pattern on an example while it's being written.
  const s = sample.trim()
  const hit =
    s && !problem
      ? followAddress(
          compileRedirects([r], domains, strict),
          s,
          domains,
          strict,
          "any",
        ).hops[0]
      : undefined

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        save(false)
      }}
    >
      <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-body-sm font-medium">Match</span>
          <Segmented<RedirectMatch>
            label="Match"
            value={r.match}
            onChange={(match) => p({ match })}
            items={matchItems}
          />
          <p className="text-caption text-muted-foreground">{meta.hint}</p>
        </div>
        <Field
          label={r.match === "regex" ? "Pattern" : "Old address"}
          error={shownProblem?.field === "from" ? shownProblem.message : ""}
          hint={
            r.match === "regex"
              ? "Matched against the path without the query; (?i) at the start ignores case."
              : "A path on this site, or its full address. Case doesn't matter."
          }
        >
          {(f) => (
            <Input
              {...f}
              value={r.from}
              onChange={(e) => p({ from: e.target.value })}
              placeholder={meta.placeholder}
              className="font-mono"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          )}
        </Field>
        <Field label="Answer" hint={codeMeta[r.code].hint}>
          {(f) => (
            <ChoiceSelect
              id={f.id}
              value={String(r.code)}
              onChange={(v) => p({ code: Number(v) as RuleCode })}
              items={codeItems}
            />
          )}
        </Field>
        {!gone && (
          <>
            <Field
              label="New address"
              error={shownProblem?.field === "to" ? shownProblem.message : ""}
              hint={
                r.match === "prefix"
                  ? "The rest of the old path is added after it."
                  : r.match === "regex"
                    ? "$1 … $9 put in what the pattern's ( ) caught."
                    : "A path on this site, or a full address on any site."
              }
            >
              {(f) => (
                <Input
                  {...f}
                  value={r.to}
                  onChange={(e) => p({ to: e.target.value })}
                  placeholder={r.match === "regex" ? "/items/$1" : "/new-page"}
                  className="font-mono"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              )}
            </Field>
            <ToggleRow
              id="redirect-keep-query"
              label="Keep the query string"
              hint="/old?ref=mail goes to /new?ref=mail. Off: the query is dropped."
              checked={r.keepQuery}
              onChange={(keepQuery) => p({ keepQuery })}
            />
          </>
        )}
        {r.match !== "exact" && (
          <Field label="Try it" hint="An address to test this rule on.">
            {(f) => (
              <div className="flex flex-col gap-1.5">
                <Input
                  {...f}
                  value={sample}
                  onChange={(e) => setSample(e.target.value)}
                  placeholder={
                    r.match === "prefix"
                      ? `${r.from || "/blog"}/my-post`
                      : "/item/42.html"
                  }
                  className="font-mono"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {s && (
                  <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
                    <FlaskConical className="size-3.5 shrink-0" />
                    {hit ? (
                      <span className="font-mono break-all text-foreground">
                        {hit.code === 410
                          ? "410 Gone"
                          : `${hit.code} → ${hit.target}`}
                      </span>
                    ) : problem ? (
                      "Fix the rule first."
                    ) : (
                      "Doesn't match."
                    )}
                  </p>
                )}
              </div>
            )}
          </Field>
        )}
        <WhenFields
          value={r.when}
          onChange={(when) => p({ when })}
          error={shownProblem?.field === "when" ? shownProblem.message : ""}
          geo={geo}
        />
        <Field label="Note" hint="Why it's there; only you see it.">
          {(f) => (
            <Input
              {...f}
              value={r.note}
              onChange={(e) => p({ note: e.target.value })}
              placeholder="Old shop, moved in 2025"
              maxLength={200}
            />
          )}
        </Field>
        <ToggleRow
          id="redirect-off"
          label="Turned off"
          hint="Kept in the list but not used."
          checked={r.off}
          onChange={(off) => p({ off })}
        />
      </fieldset>
      <div className="sticky bottom-0 flex flex-col-reverse gap-2 bg-background pt-2 md:flex-row md:justify-end">
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-9"
          onClick={onCancel}
        >
          {readOnly ? "Close" : "Cancel"}
        </Button>
        {!readOnly && !rule && (
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-9"
            onClick={() => save(true)}
          >
            Add and next
          </Button>
        )}
        {!readOnly && (
          <Button type="submit" className="h-11 md:h-9">
            {rule ? "Done" : "Add"}
          </Button>
        )}
      </div>
    </form>
  )
}
