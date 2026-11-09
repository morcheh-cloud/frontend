"use client"

import {
  ChevronDown,
  Info,
  List,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  Callout,
  FieldError,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ListInput } from "@/app/(panel)/dns/components/fields"
import { Empty, Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useOpen } from "@/hooks/useOpen"
import type {
  ProxyHost,
  ProxyInspection,
  Proxy as ReverseProxy,
  WAFEvent,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useWafEvents } from "../../../api"
import { useProxyCan } from "../../../components/permissions"
import {
  type Draft,
  type Errors,
  splitList,
  typeUses,
  type WafMode,
} from "./draft"
import { EditorCard as Card } from "./editor-card"
import { ModuleInstall } from "./module-install"

// The Security tab's web application firewall: ModSecurity with the OWASP
// Core Rule Set, in Log only or Block mode, its paranoia level, and the
// requests it flagged (where a false alarm's rule is turned off).

const modes: { value: WafMode; label: string }[] = [
  { value: "", label: "Off" },
  { value: "detect", label: "Log only" },
  { value: "block", label: "Block" },
]

const levels = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
] as const

const levelHints: Record<string, string> = {
  "1": "Catches the common attacks with very few false alarms. Right for most sites.",
  "2": "Catches more, like encoded and less common attacks. Expect a few false alarms to turn off.",
  "3": "Strict: for sites holding sensitive data, after a while in Log only.",
  "4": "Very strict: many false alarms. Only with careful tuning.",
}

export function WafCard({
  proxy: p,
  host,
  draft: d,
  set,
  errors,
  phone,
  inspection,
}: {
  proxy: ReverseProxy
  host?: ProxyHost
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
  inspection?: ProxyInspection
}) {
  const can = useProxyCan()
  const [more, setMore] = useState(false)
  const [eventsOpen, setEventsOpen] = useOpen("proxy-waf-events")
  if (!typeUses(d.type).waf) return null
  const on = d.wafMode !== ""
  const missing = !!inspection && !inspection.waf
  const savedOn = !!host?.config.waf?.mode
  const moreError =
    errors["waf.threshold"] ||
    errors["waf.skip_paths"] ||
    errors["waf.skip_rules"]
  const open = more || !!moreError
  const tuned =
    d.wafThreshold !== 5 || !!d.wafSkipPaths.trim() || !!d.wafSkipRules.trim()

  return (
    <Card
      title="Web application firewall"
      hint="Checks every request against the OWASP Core Rule Set and stops common attacks before they reach the app: SQL injection, cross-site scripting, path tricks, known scanners."
      phone={phone}
      action={
        host && can(p, "operator") ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 md:h-8"
            disabled={!savedOn}
            title={savedOn ? undefined : "The saved site has the firewall off"}
            onClick={() => setEventsOpen(true)}
          >
            <List />
            Flagged requests
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        {missing && (
          <ModuleInstall
            proxy={p}
            module="waf"
            icon={<ShieldCheck />}
            busy="Adding the firewall…"
            button="Add the firewall"
            warn={on}
          >
            <p className="font-medium text-foreground">
              {on
                ? "The firewall isn't on this proxy yet, so this site can't be saved with it on."
                : "The firewall isn't on this proxy yet."}
            </p>
            <p>
              Adding it installs ModSecurity and the OWASP Core Rule Set from
              the server's packages (Debian and Ubuntu), writes Morcheh's base
              settings and reloads {p.kind_label}. Sites without the firewall
              aren't touched.
            </p>
          </ModuleInstall>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-body-sm font-medium">Mode</span>
          <div className="flex">
            <Segmented
              label="Firewall mode"
              items={modes}
              value={d.wafMode}
              onChange={(v) => set({ wafMode: v })}
            />
          </div>
          <p className="text-caption text-muted-foreground">
            {d.wafMode === "detect"
              ? "Nothing is refused: requests the firewall would stop are only listed under Flagged requests."
              : d.wafMode === "block"
                ? "Requests that look like attacks get 403 Forbidden."
                : "Requests reach the app unchecked."}
          </p>
          <FieldError text={errors["waf.mode"]} />
        </div>

        {d.wafMode === "block" && !savedOn && (
          <Callout icon={<Info />}>
            Start with <span className="font-medium">Log only</span> for a few
            days, turn off the rules behind any false alarm, then switch to
            Block. Otherwise real visitors may get refused.
          </Callout>
        )}

        {on && (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-body-sm font-medium">Paranoia level</span>
              <div className="flex">
                <Segmented
                  label="Paranoia level"
                  items={levels}
                  value={String(d.wafParanoia) as "1" | "2" | "3" | "4"}
                  onChange={(v) => set({ wafParanoia: Number(v) })}
                />
              </div>
              <p className="text-caption text-muted-foreground">
                {levelHints[String(d.wafParanoia)]}
              </p>
              <FieldError text={errors["waf.paranoia"]} />
            </div>

            <div className="flex flex-col gap-4">
              <button
                type="button"
                className="-my-2 flex min-h-11 items-center gap-1.5 self-start text-body-sm font-medium text-muted-foreground hover:text-foreground md:min-h-8"
                aria-expanded={open}
                onClick={() => setMore(!open)}
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    open && "rotate-180",
                  )}
                />
                More options
                {tuned && !open && (
                  <span className="size-1.5 rounded-full bg-brand" />
                )}
              </button>
              {open && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Refuse at score"
                    hint="Each matching rule adds to a request's score; this many refuses it. Lower is stricter. The rule set's default is 5."
                    error={errors["waf.threshold"]}
                    className="md:col-span-2 md:max-w-xs"
                  >
                    {(f) => (
                      <Input
                        {...f}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={100}
                        value={d.wafThreshold || ""}
                        onChange={(e) =>
                          set({ wafThreshold: Number(e.target.value) || 0 })
                        }
                      />
                    )}
                  </Field>
                  <Field
                    label="Paths it leaves alone"
                    hint="One path prefix per line, like an upload endpoint or an admin area that trips rules."
                    error={errors["waf.skip_paths"]}
                  >
                    {(f) => (
                      <ListInput
                        {...f}
                        value={d.wafSkipPaths}
                        onChange={(v) => set({ wafSkipPaths: v })}
                        placeholder={"/api/upload\n/wp-admin"}
                      />
                    )}
                  </Field>
                  <Field
                    label="Rules turned off"
                    hint="Rule ids, one per line. Flagged requests shows which rule caught a request and turns it off here."
                    error={errors["waf.skip_rules"]}
                  >
                    {(f) => (
                      <ListInput
                        {...f}
                        value={d.wafSkipRules}
                        onChange={(v) => set({ wafSkipRules: v })}
                        placeholder={"942100\n920350"}
                      />
                    )}
                  </Field>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {host && (
        <WafEventsLayer
          proxy={p}
          host={host}
          open={eventsOpen}
          onOpenChange={setEventsOpen}
          phone={phone}
          skipped={splitList(d.wafSkipRules)}
          onSkip={(id) => {
            set({
              wafSkipRules: [...splitList(d.wafSkipRules), id].join("\n"),
            })
            toast.success(`Rule ${id} turned off for this site`, {
              description: "Save the site to apply it.",
            })
          }}
        />
      )}
    </Card>
  )
}

// What the firewall flagged on this site, newest first. Side sheet on
// desktop, bottom sheet on phones.
function WafEventsLayer({
  proxy: p,
  host,
  open,
  onOpenChange,
  phone,
  skipped,
  onSkip,
}: {
  proxy: ReverseProxy
  host: ProxyHost
  open: boolean
  onOpenChange: (open: boolean) => void
  phone: boolean
  skipped: string[]
  onSkip: (id: string) => void
}) {
  const can = useProxyCan()
  const query = useWafEvents(p.id, host.id, open)
  const events = query.data?.events ?? []
  const engineer = can(p, "engineer")
  const title = "Flagged requests"
  const subtitle = query.isPending
    ? "Reading the firewall's log…"
    : query.isError
      ? "Couldn't read the log."
      : events.length
        ? `${events.length === 1 ? "1 request" : `${events.length} requests`}, newest first`
        : "Nothing flagged yet."

  const body = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-caption text-muted-foreground">
          {host.config.waf?.mode === "detect"
            ? "Log only: these requests reached the app."
            : "Block: requests with status 403 were refused."}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 md:size-9"
          aria-label="Read again"
          title="Read again"
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          <RefreshCw className={cn(query.isFetching && "animate-spin")} />
        </Button>
      </div>
      {query.isPending ? (
        <p className="py-8 text-center text-body-sm text-muted-foreground">
          Reading the firewall's log…
        </p>
      ) : query.isError ? (
        <Empty
          icon={ShieldOff}
          title="Couldn't read the log"
          body={query.error.message}
        />
      ) : !events.length ? (
        <Empty
          icon={ShieldCheck}
          title="Nothing flagged yet"
          body="Requests the firewall catches show up here within a few seconds."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {events.map((e, i) => (
            <EventRow
              key={e.id || `${e.time}-${i}`}
              event={e}
              skipped={skipped}
              onSkip={engineer ? onSkip : undefined}
            />
          ))}
        </ul>
      )}
      <p className="text-caption text-muted-foreground">
        A real visitor caught here is a false alarm: turn off the rule behind
        it, or leave its path alone under More options.
      </p>
    </div>
  )

  if (phone)
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        full
        header={
          <div className="px-6 pt-1 pb-3">
            <p className="text-subheading font-medium">{title}</p>
            <p className="text-body-sm text-muted-foreground">{subtitle}</p>
          </div>
        }
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {body}
        </div>
      </BottomSheet>
    )

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">{body}</div>
      </SheetContent>
    </Sheet>
  )
}

// The rule set's score checks (949110 and the like) only add up what the
// other rules found: turning one off would turn the whole firewall off.
const scoreRule = (id: string) => /^(949|959|980)\d{3}$/.test(id)

function EventRow({
  event: e,
  skipped,
  onSkip,
}: {
  event: WAFEvent
  skipped: string[]
  onSkip?: (id: string) => void
}) {
  const refused = e.blocked
  return (
    <li className="flex flex-col gap-2 p-3">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="shrink-0 font-mono text-caption text-muted-foreground">
          {e.method}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-body-sm">
          {e.uri}
        </span>
        <span
          className={cn(
            "shrink-0 text-caption tabular-nums",
            refused ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {e.status || "—"}
        </span>
      </div>
      <p className="text-caption text-ash">
        <span
          className={cn(
            "font-medium",
            refused ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {refused ? "Blocked" : "Logged only"}
        </span>
        {[e.ip, e.time]
          .filter(Boolean)
          .map((x) => ` · ${x}`)
          .join("")}
      </p>
      {e.rules.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {e.rules.map((r) => {
            const off = skipped.includes(r.id)
            const total = scoreRule(r.id)
            return (
              <li
                key={r.id}
                className="flex items-start gap-2 rounded-lg bg-subtle px-2.5 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-caption">
                    <span className="font-mono text-muted-foreground">
                      {r.id}
                    </span>{" "}
                    {r.message || "No message"}
                  </p>
                  {r.data && (
                    <p className="mt-0.5 font-mono text-caption break-all text-ash">
                      {r.data}
                    </p>
                  )}
                </div>
                {total ? (
                  <span className="shrink-0 py-1 text-caption text-ash">
                    Score total
                  </span>
                ) : (
                  onSkip && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-my-1 h-9 shrink-0 text-caption md:h-7"
                      disabled={off}
                      onClick={() => onSkip(r.id)}
                    >
                      {off ? "Turned off" : "Turn off"}
                    </Button>
                  )
                )}
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}
