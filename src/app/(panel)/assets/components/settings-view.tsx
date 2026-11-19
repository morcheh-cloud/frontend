"use client"

import { Plus, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { useChannels } from "@/app/(panel)/alerts/api"
import {
  Section,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import type { AssetSettings } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAssetSettings, useSaveAssetSettings } from "../api"
import { Choose } from "./parts"
import { useAssetsCan } from "./permissions"
import { AssetsShell } from "./shell"

export function SettingsView() {
  const phone = useIsPhone()
  const query = useAssetSettings()
  if (phone === null) return null
  return (
    <AssetsShell
      phone={phone}
      title="Settings"
      section="settings"
      className={phone ? "" : undefined}
    >
      {query.data ? (
        <Form
          key={JSON.stringify(query.data)}
          saved={query.data}
          phone={phone}
        />
      ) : (
        <Skeleton className="h-64 rounded-2xl" />
      )}
    </AssetsShell>
  )
}

function Form({ saved, phone }: { saved: AssetSettings; phone: boolean }) {
  const can = useAssetsCan()
  const save = useSaveAssetSettings()
  const channels = useChannels()
  const [s, setS] = useState(saved)
  const [day, setDay] = useState("")
  const dirty = JSON.stringify(s) !== JSON.stringify(saved)
  const set = (p: Partial<AssetSettings>) => setS((x) => ({ ...x, ...p }))

  return (
    <div className="grid gap-4">
      <fieldset disabled={!can.own} className="grid gap-4">
        <Section
          title="Discovery"
          hint="Looks for what isn't in the inventory, from what Morche already reaches."
          phone={phone}
        >
          <ToggleRow
            id="auto-discover"
            label="Look on a schedule"
            hint={
              saved.last_discovery_at
                ? `Last look ${timeAgo(saved.last_discovery_at)}`
                : "Not looked yet"
            }
            checked={s.auto_discover}
            onChange={(auto_discover) => set({ auto_discover })}
          />
          {s.auto_discover && (
            <Field label="How often">
              {(p) => (
                <Choose
                  id={p.id}
                  allowNone={false}
                  value={String(s.discover_hours)}
                  onChange={(v) => set({ discover_hours: Number(v) })}
                  options={[
                    { value: "6", label: "Every 6 hours" },
                    { value: "12", label: "Every 12 hours" },
                    { value: "24", label: "Every day" },
                    { value: "168", label: "Every week" },
                  ]}
                />
              )}
            </Field>
          )}
        </Section>

        <Section
          title="Reminders"
          hint="Before warranties, licences, domains, contracts and certificates expire, and when a review is due."
          phone={phone}
        >
          <Field
            label="Remind this many days before"
            hint="Each threshold sends once; an expired date sends once more."
          >
            {(p) => (
              <div className="flex flex-wrap items-center gap-1.5">
                {[...s.remind_days]
                  .sort((a, b) => b - a)
                  .map((d) => (
                    <span
                      key={d}
                      className="inline-flex h-8 items-center gap-1 rounded-full bg-muted ps-3 pe-1 text-body-sm"
                    >
                      {d === 0 ? "On the day" : `${d} days`}
                      <button
                        type="button"
                        aria-label={`Remove ${d}`}
                        onClick={() =>
                          set({
                            remind_days: s.remind_days.filter((x) => x !== d),
                          })
                        }
                        className="flex size-6 items-center justify-center rounded-full hover:bg-mist"
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}
                {s.remind_days.length < 6 && (
                  <span className="inline-flex items-center gap-1">
                    <Input
                      {...p}
                      inputMode="numeric"
                      value={day}
                      onChange={(e) =>
                        setDay(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="Days"
                      className="h-8 w-20"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!day}
                      onClick={() => {
                        const n = Math.min(365, Number(day))
                        if (!s.remind_days.includes(n))
                          set({ remind_days: [...s.remind_days, n] })
                        setDay("")
                      }}
                    >
                      <Plus />
                      Add
                    </Button>
                  </span>
                )}
              </div>
            )}
          </Field>
          <Field
            label="Send to"
            hint="None ticked = the workspace's default channels. An asset can add its own."
          >
            {(p) => (
              <div id={p.id} className="flex flex-wrap gap-1.5">
                {(channels.data ?? []).map((c) => {
                  const on = s.channel_ids.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        set({
                          channel_ids: on
                            ? s.channel_ids.filter((x) => x !== c.id)
                            : [...s.channel_ids, c.id],
                        })
                      }
                      className="inline-flex h-9 items-center rounded-full border border-border px-3 text-body-sm hover:bg-subtle aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong"
                    >
                      {c.name}
                      {c.is_default && (
                        <span className="ms-1 text-caption text-ash">
                          default
                        </span>
                      )}
                    </button>
                  )
                })}
                {channels.data?.length === 0 && (
                  <span className="text-body-sm text-ash">
                    No channels yet:{" "}
                    <Link href="/alerts/channels" className="text-brand">
                      add one
                    </Link>
                    .
                  </span>
                )}
              </div>
            )}
          </Field>
        </Section>

        <Section
          title="Owner alerts"
          hint="Alert rules notify their own channels; this adds the channels set on the asset."
          phone={phone}
        >
          <ToggleRow
            id="notify-owners"
            label="Send alerts about an asset to its channels too"
            hint="When a rule fires on a server, database or Proxmox cluster, the channels picked on its asset also get it."
            checked={s.notify_owners}
            onChange={(notify_owners) => set({ notify_owners })}
          />
        </Section>
      </fieldset>

      {!can.own && (
        <p className={cn("text-caption text-ash", phone && "px-4")}>
          Only workspace Owners change these.
        </p>
      )}

      {can.own && (
        <div
          className={cn(
            "sticky bottom-4 z-10 flex items-center justify-end gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-md",
            phone &&
              "bottom-[calc(--spacing(16)+env(safe-area-inset-bottom)+0.5rem)] mx-4",
          )}
        >
          <span className="me-auto text-caption text-muted-foreground">
            {dirty ? "Unsaved changes" : "Saved"}
          </span>
          <Button variant="ghost" disabled={!dirty} onClick={() => setS(saved)}>
            Undo
          </Button>
          <Button
            disabled={!dirty || save.isPending}
            onClick={() =>
              save.mutate(s, {
                onSuccess: () => toast.success("Settings saved"),
                onError: (e) => toast.error(e.message),
              })
            }
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </div>
  )
}
