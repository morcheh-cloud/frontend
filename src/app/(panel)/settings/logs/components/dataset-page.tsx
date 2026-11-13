"use client"

import {
  Archive,
  CalendarClock,
  CircleAlert,
  Copy,
  FileDown,
  Info,
  Play,
  RotateCcw,
  ScrollText,
  Settings2,
  Shrink,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode, use, useEffect, useState } from "react"
import { toast } from "sonner"
import { Tag } from "@/app/(panel)/containers/components/kit"
import { usePreview } from "@/app/(panel)/cronjobs/api"
import {
  browserZone,
  cronText,
  formatInZone,
} from "@/app/(panel)/cronjobs/components/meta"
import {
  Choice,
  ScheduleField,
} from "@/app/(panel)/cronjobs/components/schedule-field"
import { schedulePresets } from "@/app/(panel)/databases/[id]/components/backups/meta"
import { AppBar } from "@/app/(panel)/dns/components/parts"
import {
  Empty,
  type Item,
  ItemMenu,
  Loading,
  Segmented,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import {
  type Builder,
  fromBuilder,
  toBuilder,
} from "@/app/(panel)/servers/[id]/cron/components/schedule"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { fieldErrors } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type { LogDatasetView, LogOverview, LogPolicyBody } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useLogOverview,
  usePeriods,
  usePolicyPreview,
  useResetPolicy,
  useSavePolicy,
} from "../api"
import { ArchiveList } from "./archive-list"
import { useDatasetMenu, useLogActions } from "./log-actions"
import {
  copyTooLate,
  DEFAULT_FOLDER,
  datasetHref,
  formatCount,
  formatDay,
  LOGS_HOME,
  modeMeta,
  periodMeta,
  useDatasetFilters,
  windowLabel,
} from "./meta"
import { FieldError, PlacesEditor } from "./places"

type Mode = LogPolicyBody["mode"]
type Period = LogPolicyBody["period"]

export function DatasetView({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params)
  const phone = useIsPhone()
  const overview = useLogOverview()
  const back = useBack(LOGS_HOME)
  if (phone === null) return null
  if (overview.isPending)
    return (
      <div className={cn(!phone && "px-6 pt-5")}>
        <Loading phone={phone} />
      </div>
    )
  if (overview.isError)
    return (
      <div className="px-4 py-5 md:px-6">
        <p className="text-body-sm text-destructive">
          Couldn't load the logs: {overview.error.message}
        </p>
        <Button
          variant="outline"
          className="mt-3 max-md:h-11"
          onClick={() => overview.refetch()}
        >
          Try again
        </Button>
      </div>
    )
  const d = overview.data.items.find((v) => v.key === key)
  if (!d)
    return (
      <>
        {phone && (
          <AppBar
            title="Logs & archives"
            path={`${LOGS_HOME}/${key}`}
            onBack={back}
          />
        )}
        <div className="px-4 pt-10 md:px-6">
          <Empty
            icon={ScrollText}
            title="No such kind of log"
            body={`Nothing is called "${key}".`}
            action={
              <Button
                variant="outline"
                className="h-11 w-full md:h-9 md:w-auto"
                render={<Link href={LOGS_HOME} />}
                nativeButton={false}
              >
                Back to logs
              </Button>
            }
          />
        </div>
      </>
    )
  return <DatasetPage d={d} o={overview.data} phone={phone} onBack={back} />
}

function DatasetPage({
  d,
  o,
  phone,
  onBack,
}: {
  d: LogDatasetView
  o: LogOverview
  phone: boolean
  onBack: () => void
}) {
  usePageCrumbs([{ href: datasetHref(d.key), label: d.title }])
  const [f, setF] = useDatasetFilters()
  const act = useLogActions()
  const menu = useDatasetMenu(d)
  const reset = useResetPolicy(d.key)
  const [resetOpen, setResetOpen] = useOpen(`log-policy-reset-${d.key}`)
  const [sheet, setSheet] = useOpen(`log-dataset-sheet-${d.key}`)

  const groups: Item[][] = [
    ...menu,
    [
      {
        key: "reset",
        label: d.is_default ? "Default policy in use" : "Reset to default…",
        icon: <RotateCcw />,
        disabled: d.is_default,
        onSelect: () => setResetOpen(true),
      },
    ],
  ]

  const tabs = (
    <Segmented
      label="Show"
      value={f.tab}
      onChange={(tab) => setF({ tab, page: null })}
      items={[
        { value: "policy", label: "Policy" },
        {
          value: "archives",
          label: (
            <>
              Files
              {d.archives.files > 0 && (
                <span className="ms-1.5 text-ash tabular-nums">
                  {formatCount(d.archives.files)}
                </span>
              )}
            </>
          ),
        },
      ]}
    />
  )

  const body =
    f.tab === "policy" ? (
      <PolicyEditor
        key={d.policy?.updated_at ?? "new"}
        d={d}
        o={o}
        phone={phone}
        onReset={() => setResetOpen(true)}
      />
    ) : (
      <div className={cn(phone && "pt-1")}>
        <ArchiveList
          phone={phone}
          filters={{ dataset: d.key, ...f }}
          onFilters={({ dataset: _, ...patch }) => setF(patch)}
          datasets={o.items}
          fixedDataset={d.key}
        />
      </div>
    )

  return (
    <>
      {phone ? (
        <div className="flex flex-col pb-6">
          <AppBar
            title={d.title}
            subtitle={d.group}
            path={`${LOGS_HOME}/${d.key}`}
            onBack={onBack}
            onMenu={() => setSheet(true)}
            menuLabel="More actions"
          />
          <div className="flex flex-col gap-1 px-4 py-3">
            <p className="text-caption text-muted-foreground">{d.about}</p>
            <p className="text-caption text-ash">
              {formatCount(d.rows)} rows · {formatSize(d.bytes)} · oldest{" "}
              {formatDay(d.oldest)}
            </p>
          </div>
          <div className="px-4 pb-3">{tabs}</div>
          {d.error && <ReadError text={d.error} phone />}
          {body}
          <BottomSheet open={sheet} onOpenChange={setSheet} title={d.title}>
            <SheetItems groups={groups} onOpenChange={setSheet} />
          </BottomSheet>
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-6 pt-5 pb-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {tabs}
            <p className="min-w-0 truncate text-caption text-muted-foreground">
              {d.about}
              <span className="text-ash">
                {" "}
                · {formatCount(d.rows)} rows · {formatSize(d.bytes)} · oldest{" "}
                {formatDay(d.oldest)}
              </span>
            </p>
            <div className="ms-auto flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={d.rows === 0}
                onClick={() => act.exportLogs(d)}
              >
                <FileDown />
                Export…
              </Button>
              <ItemMenu groups={groups} label="More actions" />
            </div>
          </div>
          {d.error && <ReadError text={d.error} />}
          {body}
        </div>
      )}
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={`Reset the policy for ${d.title}?`}
        description={
          <>
            It goes back to the default: {defaultText(d)}. Your changes to
            places, schedule and limits are dropped. Files already made stay
            where they are.
          </>
        }
        confirmLabel="Reset to default"
        pending={reset.isPending}
        onConfirm={() =>
          reset.mutate(undefined, {
            onSuccess: () => {
              setResetOpen(false)
              toast("Default policy put back")
            },
            onError: (err) => toast.error(err.message),
          })
        }
      />
    </>
  )
}

function ReadError({ text, phone }: { text: string; phone?: boolean }) {
  return (
    <div className={cn(phone && "px-4 pb-3")}>
      <Callout tone="warning" icon={TriangleAlert}>
        <p className="font-medium">Couldn't read this kind of log</p>
        <p className="text-muted-foreground">{text}</p>
      </Callout>
    </div>
  )
}

// ---- Policy ----

type Draft = {
  enabled: boolean
  mode: Mode
  afterDays: string
  maxMb: string
  period: Period
  keepLocal: boolean
  storageIds: string[]
  folder: string
  keepDays: string
  cron: string
  timezone: string
  builder: Builder
}

const DEFAULT_CRON = "0 3 * * *"

// What the form starts from: the saved policy, else the kind's default
// (every kind gets one when Morche starts, so that's rare).
function draftOf(d: LogDatasetView): Draft {
  const p = d.policy ?? {
    ...d.default,
    folder: d.default.folder ?? "",
    timezone: d.default.timezone || browserZone(),
  }
  return {
    enabled: p.enabled,
    mode: p.mode,
    afterDays: String(p.after_days),
    maxMb: p.max_mb ? String(p.max_mb) : "",
    period: p.period,
    keepLocal: p.keep_local,
    storageIds: p.storage_ids,
    folder: p.folder === DEFAULT_FOLDER ? "" : p.folder,
    keepDays: p.keep_days ? String(p.keep_days) : "",
    cron: p.cron,
    timezone: p.timezone || "UTC",
    builder: toBuilder(p.cron),
  }
}

const num = (s: string) => {
  const n = Number(s.trim())
  return Number.isFinite(n) ? Math.round(n) : 0
}

function toBody(v: Draft): LogPolicyBody {
  const del = v.mode === "delete"
  return {
    enabled: v.enabled,
    mode: v.mode,
    after_days: num(v.afterDays),
    max_mb: num(v.maxMb),
    period: v.period,
    keep_local: del ? false : v.keepLocal,
    storage_ids: del ? [] : v.storageIds,
    folder:
      del || !v.storageIds.length ? "" : v.folder.trim() || DEFAULT_FOLDER,
    keep_days: del ? 0 : num(v.keepDays),
    cron: v.cron,
    timezone: v.timezone,
  }
}

// What the form shows is what the backend would store, so comparing bodies
// tells real changes from formatting.
const same = (a: LogPolicyBody, b: LogPolicyBody) =>
  JSON.stringify(a) === JSON.stringify(b)

const dayChoices = [7, 30, 90, 180, 365]

function PolicyEditor({
  d,
  o,
  phone,
  onReset,
}: {
  d: LogDatasetView
  o: LogOverview
  phone: boolean
  onReset: () => void
}) {
  const [draft, setDraft] = useState(() => draftOf(d))
  const [start] = useState(() => toBody(draftOf(d)))
  const [builderOpen, setBuilderOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const save = useSavePolicy(d.key)
  const set = (patch: Partial<Draft>) => {
    setDraft((v) => ({ ...v, ...patch }))
    const touched = Object.keys(patch).map(errorKey)
    if (touched.some((k) => errors[k])) {
      setErrors((e) =>
        Object.fromEntries(
          Object.entries(e).filter(([k]) => !touched.includes(k)),
        ),
      )
    }
  }

  const body = toBody(draft)
  const fresh = !d.policy
  const dirty = fresh || !same(body, start)
  const changed = !same(body, start)
  const valid = body.after_days >= 1 && body.after_days <= 3650
  // The preview only reads age, size, period and time zone: fixed places and
  // schedule keep a half-filled form from failing it (and from refetching).
  const preview = usePolicyPreview(
    d.key,
    valid
      ? {
          ...body,
          keep_local: body.mode !== "delete",
          storage_ids: [],
          folder: "",
          keep_days: 0,
          cron: "0 3 * * *",
          enabled: true,
        }
      : null,
  )
  const del = draft.mode === "delete"

  function onSave() {
    save.mutate(body, {
      onSuccess: () => {
        setErrors({})
        toast(fresh ? "Policy created" : "Policy saved")
      },
      onError: (err) => {
        const fe = fieldErrors(err)
        const mapped: Record<string, string> = {}
        for (const [k, msg] of Object.entries(fe)) mapped[errorKey(k)] ??= msg
        if (Object.keys(mapped).length) {
          setErrors(mapped)
          toast.error("Check the fields marked in red")
        } else {
          toast.error(err.message)
        }
      },
    })
  }

  const form = (
    <div className={cn("flex min-w-0 flex-col", !phone && "gap-4")}>
      <div className={cn(phone && "px-4 pb-4")}>
        <DefaultState d={d} fresh={fresh} onReset={onReset} />
      </div>

      <Section
        phone={phone}
        title="What happens to old rows"
        hint="Archive keeps them in files you can put back; delete is for rows nobody will need."
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(modeMeta) as Mode[]).map((m) => (
            <OptionCard
              key={m}
              icon={
                m === "archive" ? (
                  <Archive />
                ) : m === "copy" ? (
                  <Copy />
                ) : (
                  <Trash2 />
                )
              }
              title={modeMeta[m].label}
              hint={modeMeta[m].hint}
              selected={draft.mode === m}
              onSelect={() => set({ mode: m })}
            />
          ))}
        </div>
        {draft.mode === "copy" && copyTooLate(d, num(draft.afterDays)) && (
          <Callout tone="warning" icon={TriangleAlert}>
            The built-in clean-up deletes these rows after {d.suggested_days}{" "}
            days, so a copy after {num(draft.afterDays)} days finds nothing. Use
            fewer than {d.suggested_days} days, or Archive instead.
          </Callout>
        )}
        {del && (
          <Callout tone="danger" icon={CircleAlert}>
            Deleted rows can't be brought back. Export them first if a report
            might need them.
          </Callout>
        )}
        {draft.mode !== "copy" && d.builtin && (
          <Note icon={<Info />}>
            While this policy is on, the built-in clean-up (
            {d.builtin.toLowerCase()}) stops: the policy decides alone.
          </Note>
        )}
      </Section>

      <Section
        phone={phone}
        title="Which rows"
        hint="By age, and optionally by size: older periods also go until the tables fit."
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${d.key}-after`}
            className="text-body-sm font-medium"
          >
            Rows older than
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-32">
              <Input
                id={`${d.key}-after`}
                type="number"
                inputMode="numeric"
                min={1}
                max={3650}
                value={draft.afterDays}
                aria-invalid={errors.after_days ? true : undefined}
                className="pe-12 tabular-nums"
                onChange={(e) => set({ afterDays: e.target.value })}
              />
              <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-caption text-muted-foreground">
                days
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set([...dayChoices, d.suggested_days].filter(Boolean))]
                .sort((a, b) => a - b)
                .map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={num(draft.afterDays) === n}
                    onClick={() => set({ afterDays: String(n) })}
                    className="inline-flex h-11 items-center rounded-full border border-border px-3 text-body-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-brand-soft aria-pressed:text-brand-strong md:h-8"
                  >
                    {n === 365 ? "1 year" : `${n} days`}
                  </button>
                ))}
            </div>
          </div>
          {d.suggested_days > 0 && (
            <p className="text-caption text-muted-foreground">
              The built-in clean-up uses {d.suggested_days} days.
            </p>
          )}
          <FieldError text={errors.after_days} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${d.key}-max`} className="text-body-sm font-medium">
            Keep the tables under{" "}
            <span className="font-normal text-muted-foreground">optional</span>
          </label>
          <div className="relative w-40">
            <Input
              id={`${d.key}-max`}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="No limit"
              value={draft.maxMb}
              aria-invalid={errors.max_mb ? true : undefined}
              className="pe-12 tabular-nums"
              onChange={(e) => set({ maxMb: e.target.value })}
            />
            <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-caption text-muted-foreground">
              MB
            </span>
          </div>
          <p className="text-caption text-muted-foreground">
            Now {formatSize(d.bytes)}. Whole periods go, oldest first, until the
            tables fit; the newest stay whatever the size.
          </p>
          <FieldError text={errors.max_mb} />
        </div>
      </Section>

      {!del && (
        <Section
          phone={phone}
          title="Files"
          hint="Zip files with one CSV per table, one file per period."
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium">One file per</span>
            <Segmented
              label="One file per"
              value={draft.period}
              onChange={(period) => set({ period })}
              items={(Object.keys(periodMeta) as Period[]).map((p) => ({
                value: p,
                label: periodMeta[p].label,
              }))}
            />
            <p className="text-caption text-muted-foreground">
              Smaller periods mean more files, but putting back one day is
              quicker.
            </p>
          </div>
          <PlacesEditor
            id={`log-policy-${d.key}`}
            keepLocal={draft.keepLocal}
            onKeepLocal={(keepLocal) => set({ keepLocal })}
            storageIds={draft.storageIds}
            onStorages={(storageIds) => set({ storageIds })}
            folder={draft.folder}
            onFolder={(folder) => set({ folder })}
            errors={errors}
            localDir={o.local_dir}
            localFree={o.local_free}
          />
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${d.key}-keep`}
              className="text-body-sm font-medium"
            >
              Delete the files after{" "}
              <span className="font-normal text-muted-foreground">
                optional
              </span>
            </label>
            <div className="relative w-40">
              <Input
                id={`${d.key}-keep`}
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Keep them"
                value={draft.keepDays}
                aria-invalid={errors.keep_days ? true : undefined}
                className="pe-12 tabular-nums"
                onChange={(e) => set({ keepDays: e.target.value })}
              />
              <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-caption text-muted-foreground">
                days
              </span>
            </div>
            <p className="text-caption text-muted-foreground">
              Counted from when a file was made. Files someone holds or whose
              rows are back are never deleted.
            </p>
            <FieldError text={errors.keep_days} />
          </div>
        </Section>
      )}

      <Section
        phone={phone}
        title="When it runs"
        hint="Each run takes whatever is old enough by then."
      >
        <ScheduleChoice
          draft={draft}
          phone={phone}
          builderOpen={builderOpen}
          onBuilder={setBuilderOpen}
          onChange={set}
          error={errors.cron || errors.timezone}
        />
        <SwitchRow
          label="Policy on"
          hint={
            draft.enabled
              ? "Runs on its schedule."
              : "Saved but doesn't run; the built-in clean-up runs instead."
          }
          checked={draft.enabled}
          onChange={(enabled) => set({ enabled })}
        />
      </Section>
    </div>
  )

  const aside = (
    <div className={cn("flex min-w-0 flex-col", !phone && "gap-4")}>
      <PreviewCard
        phone={phone}
        mode={draft.mode}
        valid={valid}
        dirty={changed && !fresh}
        preview={preview}
      />
      {d.policy && <RunCard d={d} phone={phone} />}
      <PeriodsCard
        d={d}
        phone={phone}
        period={draft.period}
        tz={draft.timezone}
        next={new Set(preview.data?.periods.map((p) => p.from) ?? [])}
      />
      <TablesCard d={d} phone={phone} />
    </div>
  )

  return (
    <div className="flex flex-col">
      {phone ? (
        <>
          {form}
          {aside}
        </>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          {form}
          <div className="xl:sticky xl:top-[calc(3rem+1px+1.25rem)]">
            {aside}
          </div>
        </div>
      )}
      <SaveBar
        dirty={dirty}
        warn={changed}
        fresh={fresh}
        pending={save.isPending}
        onSave={onSave}
        onDiscard={() => {
          setDraft(draftOf(d))
          setErrors({})
          setBuilderOpen(false)
        }}
      />
    </div>
  )
}

// Field names in the draft → the backend's error keys.
function errorKey(k: string) {
  if (k.startsWith("storage_ids") || k === "storageIds") return "storage_ids"
  const map: Record<string, string> = {
    afterDays: "after_days",
    maxMb: "max_mb",
    keepDays: "keep_days",
    keepLocal: "storage_ids",
    builder: "cron",
  }
  return map[k] ?? k
}

function ScheduleChoice({
  draft,
  phone,
  builderOpen,
  onBuilder,
  onChange,
  error,
}: {
  draft: Draft
  phone: boolean
  builderOpen: boolean
  onBuilder: (open: boolean) => void
  onChange: (patch: Partial<Draft>) => void
  error?: string
}) {
  const preset = schedulePresets.find((p) => p.cron === draft.cron)
  const daily = draft.cron === DEFAULT_CRON
  const value = preset ? draft.cron : daily ? DEFAULT_CRON : "custom"
  const items = [
    { value: DEFAULT_CRON, label: `Every night at 03:00 — ${DEFAULT_CRON}` },
    ...schedulePresets.map((p) => ({
      value: p.cron,
      label: `${p.label} — ${p.cron}`,
    })),
    {
      value: "custom",
      label: value === "custom" ? `Custom — ${draft.cron}` : "Custom…",
    },
  ]
  const preview = usePreview(builderOpen ? "" : draft.cron, draft.timezone)
  const next = preview.data?.next?.[0]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-body-sm font-medium">Schedule</span>
          <Choice
            phone={phone}
            value={value}
            onChange={(v) => {
              if (v === "custom") {
                onChange({ cron: fromBuilder(draft.builder) || draft.cron })
                onBuilder(true)
              } else {
                onChange({ cron: v, builder: toBuilder(v) })
              }
            }}
            items={items}
          />
        </div>
        <Button
          type="button"
          variant={builderOpen ? "secondary" : "outline"}
          size="icon"
          aria-label="Build a schedule"
          aria-pressed={builderOpen}
          title="Build a schedule"
          className="size-11 md:size-10"
          onClick={() => {
            if (!builderOpen) onChange({ builder: toBuilder(draft.cron) })
            onBuilder(!builderOpen)
          }}
        >
          <Settings2 />
        </Button>
      </div>
      {builderOpen ? (
        <ScheduleField
          builder={draft.builder}
          onChange={(builder) =>
            onChange({ builder, cron: fromBuilder(builder) })
          }
          timezone={draft.timezone}
          onTimezone={(timezone) => onChange({ timezone })}
          error={error}
          phone={phone}
        />
      ) : (
        <>
          <p className="text-caption text-muted-foreground">
            {cronText(draft.cron)} · {draft.timezone}
            {next && ` · next ${formatInZone(next, draft.timezone)}`}
          </p>
          <FieldError text={error} />
        </>
      )}
    </div>
  )
}

// ---- Side cards ----

function PreviewCard({
  phone,
  mode,
  valid,
  dirty,
  preview,
}: {
  phone: boolean
  mode: Mode
  valid: boolean
  dirty: boolean
  preview: ReturnType<typeof usePolicyPreview>
}) {
  const p = preview.data
  let body: ReactNode
  if (!valid) {
    body = (
      <p className="text-body-sm text-muted-foreground">
        Pick an age between 1 and 3650 days to see what a run would take.
      </p>
    )
  } else if (preview.isPending) {
    body = <Skeleton className="h-16 w-full rounded-lg" />
  } else if (preview.isError) {
    body = (
      <p className="text-body-sm text-destructive">{preview.error.message}</p>
    )
  } else if (!p || p.rows === 0) {
    body = (
      <p className="text-body-sm text-muted-foreground">
        Nothing is old enough yet: a run now would leave everything as it is.
      </p>
    )
  } else {
    body = (
      <div
        className={cn(
          "flex flex-col gap-3 transition-opacity",
          preview.isFetching && "opacity-60",
        )}
      >
        <p>
          <span className="text-heading font-light tabular-nums">
            {formatCount(p.rows)}
          </span>{" "}
          <span className="text-body-sm text-muted-foreground">
            rows · about {formatSize(p.bytes)}
          </span>
        </p>
        <p className="text-body-sm text-muted-foreground">
          {modeMeta[mode].verb}: {p.periods.length}{" "}
          {p.periods.length === 1 ? "period" : "periods"}
          {p.periods.length > 0 &&
            `, ${windowLabel(p.periods[0].from, p.periods[0].to)}${
              p.periods.length > 1
                ? ` to ${windowLabel(
                    p.periods[p.periods.length - 1].from,
                    p.periods[p.periods.length - 1].to,
                  )}`
                : ""
            }`}
          .
        </p>
        {p.over && (
          <Note icon={<Info />}>
            The size limit takes newer periods than the age alone would.
          </Note>
        )}
        {p.note && <Note icon={<Info />}>{p.note}</Note>}
        {p.skipped.length > 0 && (
          <Note icon={<CircleAlert />}>Left out: {p.skipped.join("; ")}</Note>
        )}
      </div>
    )
  }
  return (
    <Card
      phone={phone}
      title="If it ran now"
      aside={dirty ? <Tag tone="brand">With your changes</Tag> : undefined}
    >
      {body}
    </Card>
  )
}

function RunCard({ d, phone }: { d: LogDatasetView; phone: boolean }) {
  const act = useLogActions()
  const p = d.policy
  if (!p) return null
  const failed = p.last_state === "failed"
  return (
    <Card
      phone={phone}
      title="Runs"
      aside={
        <Button
          variant="outline"
          size="sm"
          className="max-md:h-11"
          disabled={act.running === d.key}
          onClick={() => act.runNow(d)}
        >
          <Play />
          Run now
        </Button>
      }
    >
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-body-sm">
        <dt className="text-muted-foreground">Last run</dt>
        <dd className={cn(failed && "text-warning")}>
          {p.last_run_at
            ? `${failed ? "Failed" : "Done"} ${timeAgo(p.last_run_at)}`
            : "Hasn't run yet"}
        </dd>
        {p.last_note && (
          <>
            <dt className="text-muted-foreground">Result</dt>
            <dd className="break-words">{p.last_note}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Next run</dt>
        <dd>
          {!p.enabled
            ? "Off"
            : p.next_run_at
              ? formatInZone(p.next_run_at, p.timezone || "UTC")
              : "—"}
        </dd>
      </dl>
    </Card>
  )
}

const PERIODS_SHOWN = 8

function PeriodsCard({
  d,
  phone,
  period,
  tz,
  next,
}: {
  d: LogDatasetView
  phone: boolean
  period: Period
  tz: string
  next: Set<string>
}) {
  const act = useLogActions()
  const periods = usePeriods(d.key, period, tz)
  const [all, setAll] = useState(false)
  const items = [...(periods.data?.periods ?? [])].reverse()
  const shown = all ? items : items.slice(0, PERIODS_SHOWN)
  const max = Math.max(1, ...items.map((p) => p.rows))
  return (
    <Card
      phone={phone}
      title={`Rows by ${periodMeta[period].label.toLowerCase()}`}
      hint="Newest first. Pick one to export it."
    >
      {periods.isPending ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : periods.isError ? (
        <p className="text-body-sm text-destructive">{periods.error.message}</p>
      ) : items.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">No rows yet.</p>
      ) : (
        <div className="flex flex-col">
          <ul className="-mx-2 flex flex-col">
            {shown.map((p) => (
              <li key={p.from}>
                <button
                  type="button"
                  onClick={() => act.exportLogs(d, { from: p.from, to: p.to })}
                  className="flex min-h-11 w-full flex-col gap-1 rounded-lg px-2 py-1.5 text-start outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-0"
                >
                  <span className="flex w-full items-center gap-2 text-body-sm">
                    <span className="min-w-0 flex-1 truncate">
                      {windowLabel(p.from, p.to)}
                    </span>
                    {p.held && <Tag tone="brand">Rows back</Tag>}
                    {!p.held && p.archived && <Tag>In a file</Tag>}
                    {next.has(p.from) && <Tag tone="warning">Goes next</Tag>}
                    <span className="w-16 shrink-0 text-end text-muted-foreground tabular-nums">
                      {formatCount(p.rows)}
                    </span>
                  </span>
                  <span className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        next.has(p.from) ? "bg-warning" : "bg-brand/60",
                      )}
                      style={{ width: `${(p.rows / max) * 100}%` }}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {items.length > PERIODS_SHOWN && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 self-start max-md:h-11"
              onClick={() => setAll(!all)}
            >
              {all ? "Show fewer" : `Show all ${items.length}`}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

function TablesCard({ d, phone }: { d: LogDatasetView; phone: boolean }) {
  const act = useLogActions()
  const dead = d.tables.reduce((n, t) => n + t.dead_rows, 0)
  return (
    <Card
      phone={phone}
      title="Tables"
      hint="PostgreSQL reuses the space of removed rows; Free up space gives it back to the disk."
      aside={
        <Button
          variant="outline"
          size="sm"
          className="max-md:h-11"
          onClick={() => act.compact(d)}
        >
          <Shrink />
          Free up space
        </Button>
      }
    >
      <ul className="flex flex-col gap-2">
        {d.tables.map((t) => (
          <li key={t.name} className="flex flex-col text-body-sm">
            <span className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-mono text-caption">
                {t.name}
              </span>
              <span className="tabular-nums">{formatSize(t.bytes)}</span>
            </span>
            <span className="text-caption text-muted-foreground">
              {formatCount(t.rows)} rows
              {t.dead_rows > 0 &&
                ` · ${formatCount(t.dead_rows)} removed, space not reused yet`}
              {t.vacuumed && ` · cleaned ${timeAgo(t.vacuumed)}`}
            </span>
          </li>
        ))}
      </ul>
      {dead > 0 && d.rows > 0 && dead > d.rows / 5 && (
        <Note icon={<CalendarClock />}>
          Many removed rows still take space. PostgreSQL reuses it by itself;
          Free up space gives it back now.
        </Note>
      )}
    </Card>
  )
}

// ---- Pieces ----

function Section({
  title,
  hint,
  phone,
  children,
}: {
  title: string
  hint?: string
  phone: boolean
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4",
        phone
          ? "border-b border-border px-4 py-5"
          : "rounded-2xl border border-border p-6 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8",
      )}
    >
      <div>
        <h2 className="text-body font-medium">{title}</h2>
        {hint && (
          <p className="mt-0.5 text-caption text-muted-foreground">{hint}</p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  )
}

function Card({
  title,
  hint,
  aside,
  phone,
  children,
}: {
  title: string
  hint?: string
  aside?: ReactNode
  phone: boolean
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3",
        phone
          ? "border-b border-border px-4 py-5"
          : "rounded-2xl border border-border bg-card p-5",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-body-sm font-medium">{title}</h2>
          {hint && (
            <p className="mt-0.5 text-caption text-muted-foreground">{hint}</p>
          )}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

function OptionCard({
  icon,
  title,
  hint,
  selected,
  onSelect,
}: {
  icon: ReactNode
  title: string
  hint: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 items-start gap-3 rounded-2xl border border-border bg-card p-4 text-start transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        "hover:bg-subtle aria-pressed:border-primary aria-pressed:bg-brand-soft",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&>svg]:size-4",
          selected && "bg-card text-brand-strong",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-body-sm font-medium",
            selected && "text-brand-strong",
          )}
        >
          {title}
        </span>
        <span className="block text-caption text-muted-foreground">{hint}</span>
      </span>
    </button>
  )
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (on: boolean) => void
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the Switch inside is the control
    <label className="flex min-h-11 cursor-pointer items-center gap-3">
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-medium">{label}</span>
        <span className="block text-caption text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

function Callout({
  tone,
  icon: Icon,
  children,
}: {
  tone: "warning" | "danger" | "info"
  icon: typeof Info
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-body-sm",
        tone === "warning" && "border-warning/30 bg-warning/10",
        tone === "danger" && "border-destructive/30 bg-destructive/10",
        tone === "info" && "border-border bg-subtle",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-destructive",
          tone === "info" && "text-muted-foreground",
        )}
      />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function Note({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-lg bg-subtle px-3 py-2.5 text-caption text-muted-foreground [&>svg]:mt-px [&>svg]:size-4 [&>svg]:shrink-0">
      {icon}
      <p>{children}</p>
    </div>
  )
}

function SaveBar({
  dirty,
  warn,
  fresh,
  pending,
  onSave,
  onDiscard,
}: {
  dirty: boolean
  warn: boolean
  fresh: boolean
  pending: boolean
  onSave: () => void
  onDiscard: () => void
}) {
  useEffect(() => {
    if (!warn) return
    const stop = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", stop)
    return () => window.removeEventListener("beforeunload", stop)
  }, [warn])

  if (!dirty) return null
  return (
    <div className="sticky bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] z-30 mt-4 flex items-center gap-2 border-t border-border bg-background px-4 py-2 md:bottom-6 md:mx-auto md:w-fit md:rounded-2xl md:border md:bg-card md:p-1.5 md:ps-4 md:shadow-md">
      <p
        role="status"
        className="min-w-0 flex-1 truncate text-body-sm text-muted-foreground"
      >
        {fresh ? "Not saved yet" : "Unsaved changes"}
      </p>
      {warn && (
        <Button
          variant="ghost"
          className="max-md:h-11"
          disabled={pending}
          onClick={onDiscard}
        >
          {fresh ? "Start over" : "Discard"}
        </Button>
      )}
      <Button className="max-md:h-11" disabled={pending} onClick={onSave}>
        {pending ? "Saving…" : fresh ? "Create policy" : "Save"}
      </Button>
    </div>
  )
}

// "Archive after 90 days into monthly files on Morche's disk, nightly at
// 03:00 (Asia/Tehran)"
function defaultText(d: LogDatasetView) {
  const p = d.default
  const files = { day: "daily", week: "weekly", month: "monthly" }[p.period]
  const zone = p.timezone ? ` (${p.timezone})` : ""
  return `${modeMeta[p.mode].label.toLowerCase()} rows after ${p.after_days} days into ${files} files on Morche's disk, every night at 03:00${zone}`
}

// Says whether the kind still runs its default policy, with the way back.
function DefaultState({
  d,
  fresh,
  onReset,
}: {
  d: LogDatasetView
  fresh: boolean
  onReset: () => void
}) {
  if (fresh || d.is_default)
    return (
      <Note icon={<Info />}>
        <span className="font-medium text-foreground">
          {fresh ? "Default policy (not saved yet)" : "Default policy"}
        </span>
        {" · "}
        {defaultText(d).replace(/^./, (c) => c.toUpperCase())}. Change anything
        below and save; you can always come back to it.
      </Note>
    )
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-subtle px-3 py-2.5 text-caption text-muted-foreground">
      <Settings2 className="size-4 shrink-0" />
      <p className="min-w-0 flex-1">
        <span className="font-medium text-foreground">Changed by an admin</span>
        {d.policy?.enabled === false && d.builtin
          ? ` · The policy is off, so the built-in clean-up runs instead. ${d.builtin}`
          : ` · The default is to ${defaultText(d)}.`}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="max-md:h-11"
        onClick={onReset}
      >
        <RotateCcw />
        Reset to default
      </Button>
    </div>
  )
}
