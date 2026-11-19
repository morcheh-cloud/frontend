"use client"

import { ChevronLeft, Info, PackageSearch, Plus, X } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { useChannels } from "@/app/(panel)/alerts/api"
import {
  Callout,
  FieldError,
  Section,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import {
  AsideCard,
  EditorLoading,
  EditorPage,
  SummaryList,
} from "@/components/editor-page"
import { Field } from "@/components/field"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useFollowWorkspace } from "@/components/panel/workspace"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useBackOr } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { ApiError, api, fieldErrors } from "@/lib/api"
import type { Asset, AssetBody } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAsset, useAssetPeople, useSaveAsset } from "../api"
import {
  AssetIcon,
  assetHref,
  billings,
  bodyOf,
  classifications,
  criticalities,
  environments,
  envLabel,
  hardwareCategories,
  kindOf,
  lifecycleLabel,
  lifecycles,
  type ManualKind,
  manualKinds,
  money,
  useNewAssetParams,
} from "./meta"
import { Choose, joinOwner, PersonPicker, splitOwner } from "./parts"
import { useAssetsCan } from "./permissions"

export function NewAssetPage() {
  const [{ kind }] = useNewAssetParams()
  const phone = useIsPhone()
  if (phone === null) return null
  const k = (manualKinds as readonly string[]).includes(kind)
    ? (kind as ManualKind)
    : "hardware"
  return <Editor key={`new:${k}`} phone={phone} kind={k} />
}

export function EditAssetPage() {
  const { id } = useParams<{ id: string }>()
  const phone = useIsPhone()
  const query = useAsset(id)
  if (phone === null) return null
  if (query.isPending) return phone ? null : <EditorLoading />
  if (!query.data) {
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={PackageSearch}
          title={gone ? "This asset isn't here" : "Couldn't load the asset"}
          body={
            gone
              ? "It was deleted, or you don't have access to it."
              : query.error?.message
          }
        />
      </div>
    )
  }
  return (
    <Editor key={query.data.asset.id} phone={phone} saved={query.data.asset} />
  )
}

type Draft = Omit<
  AssetBody,
  "owner_user_id" | "owner_group_id" | "deputy_user_id" | "assigned_user_id"
> & {
  owner: string
  deputy: string
  assigned: string
  fieldRows: { key: string; name: string; value: string }[]
}

let rowKey = 0
const nextKey = () => `r${++rowKey}`

function draftOf(saved?: Asset, kind: ManualKind = "hardware"): Draft {
  const b: AssetBody = saved
    ? bodyOf(saved)
    : {
        kind,
        name: "",
        lifecycle: kind === "hardware" ? "active" : "active",
        tags: [],
        links: [],
        fields: {},
      }
  const {
    owner_user_id,
    owner_group_id,
    deputy_user_id,
    assigned_user_id,
    ...rest
  } = b
  return {
    ...rest,
    owner: joinOwner(owner_user_id, owner_group_id),
    deputy: deputy_user_id ? `u:${deputy_user_id}` : "",
    assigned: assigned_user_id ? `u:${assigned_user_id}` : "",
    fieldRows: Object.entries(b.fields ?? {}).map(([name, value]) => ({
      key: nextKey(),
      name,
      value,
    })),
    links: b.links ?? [],
    tags: b.tags ?? [],
  }
}

function toBody(d: Draft): AssetBody {
  const { owner, deputy, assigned, fieldRows, ...rest } = d
  const o = splitOwner(owner)
  const fields: Record<string, string> = {}
  for (const r of fieldRows) if (r.name.trim()) fields[r.name.trim()] = r.value
  return {
    ...rest,
    name: rest.name.trim(),
    owner_user_id: o.user || undefined,
    owner_group_id: o.group || undefined,
    deputy_user_id: splitOwner(deputy).user || undefined,
    assigned_user_id: splitOwner(assigned).user || undefined,
    fields,
    links: (rest.links ?? []).filter((l) => l.url.trim()),
    cost: rest.cost ?? undefined,
  }
}

const serial = (d: Draft) =>
  JSON.stringify({ ...d, fieldRows: d.fieldRows.map(({ key, ...r }) => r) })

// Which blocks a kind uses: hardware is about purchase and serials, a
// licence about seats and keys, a domain about its registrar and expiry.
function uses(kind: string) {
  const purchase = [
    "hardware",
    "software",
    "license",
    "subscription",
    "contract",
    "domain",
    "certificate",
    "cloud_resource",
    "other",
    "virtual_machine",
    "service",
  ].includes(kind)
  return {
    purchase,
    serial: kind === "hardware",
    seats: kind === "license" || kind === "subscription" || kind === "software",
    key: kind === "license" || kind === "software",
    expiry: [
      "license",
      "subscription",
      "contract",
      "domain",
      "certificate",
      "software",
      "cloud_resource",
      "other",
      "service",
    ].includes(kind),
    warranty: kind === "hardware" || kind === "other",
    assigned: kind === "hardware" || kind === "software" || kind === "license",
  }
}

const vendorWord: Record<string, string> = {
  domain: "Registrar",
  certificate: "Issuer",
  subscription: "Provider",
  contract: "Supplier",
  cloud_resource: "Provider",
}

const reviewChoices = [
  { value: "0", label: "Never ask" },
  { value: "30", label: "Every month" },
  { value: "90", label: "Every 3 months" },
  { value: "180", label: "Every 6 months" },
  { value: "365", label: "Every year" },
]

function Editor({
  saved,
  kind,
  phone,
}: {
  saved?: Asset
  kind?: ManualKind
  phone: boolean
}) {
  useFollowWorkspace(saved?.workspace_id)
  const can = useAssetsCan(saved?.workspace_id)
  const router = useRouter()
  const leave = useBackOr(saved ? assetHref(saved.id) : "/assets")
  const save = useSaveAsset()
  const channels = useChannels(saved?.workspace_id)
  const people = useAssetPeople(saved?.workspace_id)
  const [d, setD] = useState<Draft>(() => draftOf(saved, kind))
  const [initial] = useState(() => serial(draftOf(saved, kind)))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [licenseKey, setLicenseKey] = useState("")
  const [clearKey, setClearKey] = useState(false)
  const [tagText, setTagText] = useState("")
  const dirty = serial(d) !== initial || !!licenseKey || clearKey
  const linked = !!saved?.source_kind
  const u = uses(d.kind)

  usePageCrumbs(
    saved
      ? [
          { href: assetHref(saved.id), label: saved.name },
          { href: `/assets/${saved.id}/edit`, label: "Edit" },
        ]
      : [
          {
            href: "/assets/new",
            label: `New ${kindOf(d.kind).label.toLowerCase()}`,
          },
        ],
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const set = (patch: Partial<Draft>) => {
    setD((x) => ({ ...x, ...patch }))
    setErrors({})
  }
  const f = (k: string) => errors[k] ?? errors[`body.${k}`]

  const submit = () => {
    if (!linked && !d.name.trim()) {
      setErrors({ name: "Give it a name" })
      toast.error("Give it a name")
      return
    }
    const body = toBody(d)
    if (licenseKey) body.license_key = licenseKey
    if (clearKey) body.clear_license_key = true
    if (saved) body.revision = saved.updated_at
    save.mutate(
      { id: saved?.id, body },
      {
        onSuccess: (a) => {
          toast.success(saved ? `${a.name} saved` : `${a.name} added`)
          if (saved) leave()
          else router.replace(assetHref(a.id))
        },
        onError: (err) => {
          const e = fieldErrors(err)
          setErrors(e)
          toast.error(Object.values(e)[0] ?? err.message)
          requestAnimationFrame(() =>
            document
              .querySelector("[aria-invalid=true], [data-error]")
              ?.scrollIntoView({ block: "center", behavior: "smooth" }),
          )
        },
      },
    )
  }

  if (!can.edit) {
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={PackageSearch}
          title="You can't change assets here"
          body="Adding and editing assets needs Engineer access to this workspace."
        />
      </div>
    )
  }

  const addTag = () => {
    const t = tagText.trim().replace(/^#/, "")
    if (t && !d.tags?.includes(t)) set({ tags: [...(d.tags ?? []), t] })
    setTagText("")
  }

  const sections = (
    <>
      <Section
        title="What it is"
        hint={
          linked
            ? "Its name and kind come from Morche."
            : "The kind decides which details the form asks for."
        }
        phone={phone}
      >
        {linked && saved ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-subtle px-3 py-2.5">
            <AssetIcon asset={saved} />
            <span className="min-w-0">
              <span className="block truncate text-body-sm font-medium">
                {saved.name}
              </span>
              <span className="block truncate text-caption text-muted-foreground">
                {kindOf(saved.kind).label} · rename it in its own section
              </span>
            </span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 min-[1800px]:grid-cols-4 sm:grid-cols-3">
              {manualKinds.map((k) => {
                const m = kindOf(k)
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={d.kind === k}
                    onClick={() =>
                      set({ kind: k, category: k === d.kind ? d.category : "" })
                    }
                    className="flex min-h-12 items-center gap-2.5 rounded-xl border border-border px-3 py-2 text-start text-body-sm hover:bg-subtle aria-pressed:border-brand aria-pressed:bg-brand-soft/60"
                  >
                    <m.icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="leading-tight">{m.label}</span>
                  </button>
                )
              })}
            </div>
            <Field
              label="Name"
              error={f("name")}
              hint={
                d.kind === "hardware"
                  ? "e.g. Sara's laptop, Rack 2 switch"
                  : d.kind === "domain"
                    ? "The domain itself, e.g. example.com"
                    : undefined
              }
            >
              {(p) => (
                <Input
                  {...p}
                  value={d.name}
                  maxLength={200}
                  onChange={(e) => set({ name: e.target.value })}
                />
              )}
            </Field>
            {d.kind === "hardware" ? (
              <div className="flex flex-wrap gap-2">
                {hardwareCategories.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={d.category === c.value}
                    onClick={() =>
                      set({ category: d.category === c.value ? "" : c.value })
                    }
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-body-sm hover:bg-subtle aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong"
                  >
                    <c.icon className="size-4" />
                    {c.value}
                  </button>
                ))}
              </div>
            ) : (
              <Field
                label="Category"
                hint="Optional: your own word for grouping (e.g. Design tools, Support)"
              >
                {(p) => (
                  <Input
                    {...p}
                    value={d.category ?? ""}
                    maxLength={60}
                    onChange={(e) => set({ category: e.target.value })}
                  />
                )}
              </Field>
            )}
          </>
        )}
        <Field label="Description" hint="What it's for, in a line or two">
          {(p) => (
            <Textarea
              {...p}
              rows={2}
              value={d.description ?? ""}
              maxLength={2000}
              onChange={(e) => set({ description: e.target.value })}
            />
          )}
        </Field>
      </Section>

      <Section
        title="Ownership"
        hint="Who answers for it. Owning grants no access in Morche."
        phone={phone}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Field
            label="Owner"
            error={f("owner_user_id") ?? f("owner_group_id")}
            hint={
              !d.owner && saved?.owner.from === "rule"
                ? `Empty: the rule “${saved.owner.rule_name}” gives it to ${saved.owner.user_name || saved.owner.group_name}`
                : "A person or a group"
            }
          >
            {(p) => (
              <PersonPicker
                id={p.id}
                value={d.owner}
                onChange={(owner) => set({ owner })}
                groups
              />
            )}
          </Field>
          <Field label="Deputy" hint="Stands in when the owner is away">
            {(p) => (
              <PersonPicker
                id={p.id}
                value={d.deputy}
                onChange={(deputy) => set({ deputy })}
              />
            )}
          </Field>
          {u.assigned && (
            <Field label="Assigned to" hint="Who holds or uses it day to day">
              {(p) => (
                <PersonPicker
                  id={p.id}
                  value={d.assigned}
                  onChange={(assigned) => set({ assigned })}
                />
              )}
            </Field>
          )}
        </div>
      </Section>

      <Section
        title="Classification"
        hint="How much it matters and how carefully it's handled."
        phone={phone}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Environment">
            {(p) => (
              <Choose
                id={p.id}
                value={d.environment ?? ""}
                onChange={(v) =>
                  set({ environment: v as AssetBody["environment"] })
                }
                options={environments}
              />
            )}
          </Field>
          <Field label="Lifecycle">
            {(p) => (
              <Choose
                id={p.id}
                allowNone={false}
                value={d.lifecycle ?? "active"}
                onChange={(v) =>
                  set({ lifecycle: v as AssetBody["lifecycle"] })
                }
                options={lifecycles.map((l) => ({
                  value: l.value,
                  label: l.label,
                  hint: l.hint,
                }))}
              />
            )}
          </Field>
          <Field label="Criticality">
            {(p) => (
              <Choose
                id={p.id}
                value={d.criticality ? String(d.criticality) : ""}
                onChange={(v) => set({ criticality: Number(v) || 0 })}
                options={criticalities.map((c) => ({
                  value: String(c.value),
                  label: c.label,
                  hint: c.hint,
                }))}
              />
            )}
          </Field>
          <Field label="Data it holds">
            {(p) => (
              <Choose
                id={p.id}
                value={d.classification ?? ""}
                onChange={(v) =>
                  set({ classification: v as AssetBody["classification"] })
                }
                options={classifications.map((c) => ({
                  value: c.value,
                  label: c.label,
                  hint: c.hint,
                }))}
              />
            )}
          </Field>
        </div>
        <Field
          label="Tags"
          hint="Owner rules and filters can use them. Enter adds one."
        >
          {(p) => (
            <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 md:min-h-10">
              {d.tags?.map((t) => (
                <span
                  key={t}
                  className="inline-flex h-7 items-center gap-1 rounded-full bg-muted ps-2.5 pe-1 text-body-sm"
                >
                  {t}
                  <button
                    type="button"
                    aria-label={`Remove ${t}`}
                    onClick={() =>
                      set({ tags: d.tags?.filter((x) => x !== t) })
                    }
                    className="flex size-5 items-center justify-center rounded-full hover:bg-mist"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                {...p}
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault()
                    addTag()
                  } else if (
                    e.key === "Backspace" &&
                    !tagText &&
                    d.tags?.length
                  )
                    set({ tags: d.tags.slice(0, -1) })
                }}
                onBlur={addTag}
                placeholder={d.tags?.length ? "" : "e.g. payments, eu"}
                className="h-7 min-w-28 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-ash md:text-sm"
              />
            </div>
          )}
        </Field>
      </Section>

      {(u.purchase || linked) && (
        <Section
          title={u.serial ? "Purchase & hardware" : "Vendor & cost"}
          hint="Where it came from and what it costs."
          phone={phone}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label={vendorWord[d.kind] ?? "Vendor"}>
              {(p) => (
                <Input
                  {...p}
                  value={d.vendor ?? ""}
                  maxLength={200}
                  onChange={(e) => set({ vendor: e.target.value })}
                />
              )}
            </Field>
            {(u.serial || d.model) && (
              <Field label="Model">
                {(p) => (
                  <Input
                    {...p}
                    value={d.model ?? ""}
                    maxLength={200}
                    onChange={(e) => set({ model: e.target.value })}
                  />
                )}
              </Field>
            )}
            {u.serial && (
              <>
                <Field label="Serial number">
                  {(p) => (
                    <Input
                      {...p}
                      value={d.serial_number ?? ""}
                      maxLength={200}
                      className="font-mono"
                      onChange={(e) => set({ serial_number: e.target.value })}
                    />
                  )}
                </Field>
                <Field
                  label="Asset tag"
                  hint="The sticker number, if you use them"
                >
                  {(p) => (
                    <Input
                      {...p}
                      value={d.asset_tag ?? ""}
                      maxLength={100}
                      className="font-mono"
                      onChange={(e) => set({ asset_tag: e.target.value })}
                    />
                  )}
                </Field>
              </>
            )}
            <Field
              label="Location"
              hint={u.serial ? "Office, room, rack…" : "Region or data centre"}
            >
              {(p) => (
                <Input
                  {...p}
                  value={d.location ?? ""}
                  maxLength={200}
                  onChange={(e) => set({ location: e.target.value })}
                />
              )}
            </Field>
            <Field label="Bought on" error={f("purchased_on")}>
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  value={d.purchased_on ?? ""}
                  onChange={(e) => set({ purchased_on: e.target.value })}
                />
              )}
            </Field>
            <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
              <Field label="Cost" error={f("cost")}>
                {(p) => (
                  <Input
                    {...p}
                    inputMode="decimal"
                    value={d.cost == null ? "" : String(d.cost)}
                    onChange={(e) => {
                      const v = e.target.value.replace(",", ".")
                      set({ cost: v === "" ? undefined : Number(v) || 0 })
                    }}
                  />
                )}
              </Field>
              <Field label="Currency">
                {(p) => (
                  <Input
                    {...p}
                    value={d.currency ?? ""}
                    maxLength={8}
                    placeholder="EUR"
                    className="uppercase placeholder:text-ash"
                    onChange={(e) =>
                      set({ currency: e.target.value.toUpperCase() })
                    }
                  />
                )}
              </Field>
            </div>
            <Field label="Paid">
              {(p) => (
                <Choose
                  id={p.id}
                  value={d.billing ?? ""}
                  onChange={(v) => set({ billing: v as AssetBody["billing"] })}
                  options={billings}
                />
              )}
            </Field>
            <Field label="Cost center">
              {(p) => (
                <Input
                  {...p}
                  value={d.cost_center ?? ""}
                  maxLength={100}
                  onChange={(e) => set({ cost_center: e.target.value })}
                />
              )}
            </Field>
          </div>
        </Section>
      )}

      {(u.expiry || u.warranty || u.seats || u.key || linked) && (
        <Section
          title="Dates & licence"
          hint="Reminders go out before these dates."
          phone={phone}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {(u.expiry || linked) && (
              <Field
                label={
                  d.kind === "subscription" || d.kind === "contract"
                    ? "Ends on"
                    : "Expires on"
                }
                error={f("expires_on")}
              >
                {(p) => (
                  <Input
                    {...p}
                    type="date"
                    value={d.expires_on ?? ""}
                    onChange={(e) => set({ expires_on: e.target.value })}
                  />
                )}
              </Field>
            )}
            {(u.warranty || linked) && (
              <Field label="Warranty until" error={f("warranty_until")}>
                {(p) => (
                  <Input
                    {...p}
                    type="date"
                    value={d.warranty_until ?? ""}
                    onChange={(e) => set({ warranty_until: e.target.value })}
                  />
                )}
              </Field>
            )}
            {u.seats && (
              <>
                <Field label="Seats bought" error={f("seats")}>
                  {(p) => (
                    <Input
                      {...p}
                      inputMode="numeric"
                      value={d.seats == null ? "" : String(d.seats)}
                      onChange={(e) =>
                        set({
                          seats:
                            e.target.value === ""
                              ? undefined
                              : Math.max(
                                  0,
                                  Number.parseInt(e.target.value, 10) || 0,
                                ),
                        })
                      }
                    />
                  )}
                </Field>
                <Field label="Seats in use" error={f("seats_used")}>
                  {(p) => (
                    <Input
                      {...p}
                      inputMode="numeric"
                      value={d.seats_used == null ? "" : String(d.seats_used)}
                      onChange={(e) =>
                        set({
                          seats_used:
                            e.target.value === ""
                              ? undefined
                              : Math.max(
                                  0,
                                  Number.parseInt(e.target.value, 10) || 0,
                                ),
                        })
                      }
                    />
                  )}
                </Field>
              </>
            )}
          </div>
          {(u.expiry || linked) && (
            <ToggleRow
              id="asset-renew"
              label="Renews by itself"
              hint="The reminder says it renews instead of expiring."
              checked={!!d.auto_renew}
              onChange={(auto_renew) => set({ auto_renew })}
            />
          )}
          {u.key && (
            <Field
              label="Licence key"
              hint={
                saved?.has_license_key
                  ? "Saved: blank keeps it. Encrypted; only workspace Owners can see it."
                  : "Encrypted; only workspace Owners can see it."
              }
            >
              {(p) => (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <SecretInput
                      {...p}
                      label="licence key"
                      value={licenseKey}
                      onChange={(e) => {
                        setLicenseKey(e.target.value)
                        setClearKey(false)
                      }}
                      placeholder={
                        clearKey
                          ? "Will be removed"
                          : saved?.has_license_key
                            ? "Saved"
                            : ""
                      }
                      load={
                        saved?.has_license_key && can.own
                          ? () =>
                              api.assets
                                .getAssetLicenseKey(saved.id)
                                .then((r) => r.key)
                          : undefined
                      }
                    />
                  </div>
                  {saved?.has_license_key && !clearKey && (
                    <Button variant="ghost" onClick={() => setClearKey(true)}>
                      Remove
                    </Button>
                  )}
                </div>
              )}
            </Field>
          )}
        </Section>
      )}

      <Section
        title="Reviews & reminders"
        hint="Keep the record true: the owner confirms it now and then."
        phone={phone}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Ask the owner to confirm it">
            {(p) => (
              <Choose
                id={p.id}
                allowNone={false}
                value={String(d.review_days ?? 0)}
                onChange={(v) => set({ review_days: Number(v) })}
                options={reviewChoices}
              />
            )}
          </Field>
          <Field
            label="Also notify"
            hint="On top of the workspace's reminder channels; alert rules about it go here too."
          >
            {(p) => (
              <div id={p.id} className="flex flex-wrap gap-1.5">
                {(channels.data ?? []).map((c) => {
                  const on = d.channel_ids?.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        set({
                          channel_ids: on
                            ? d.channel_ids?.filter((x) => x !== c.id)
                            : [...(d.channel_ids ?? []), c.id],
                        })
                      }
                      className="inline-flex h-9 items-center rounded-full border border-border px-3 text-body-sm hover:bg-subtle aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong"
                    >
                      {c.name}
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
        </div>
      </Section>

      <Section
        title={saved ? "Links & fields" : "Links & notes"}
        hint="Runbooks, vendor portals, anything the next person needs."
        phone={phone}
      >
        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-medium">Links</span>
          {(d.links ?? []).map((l, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id; edits keep their order
              key={`link-${i}`}
              className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] gap-2"
            >
              <Input
                aria-label="Label"
                placeholder="Label"
                value={l.label}
                onChange={(e) =>
                  set({
                    links: d.links?.map((x, j) =>
                      j === i ? { ...x, label: e.target.value } : x,
                    ),
                  })
                }
              />
              <Input
                aria-label="Address"
                placeholder="https://"
                aria-invalid={f(`links[${i}].url`) ? true : undefined}
                value={l.url}
                onChange={(e) =>
                  set({
                    links: d.links?.map((x, j) =>
                      j === i ? { ...x, url: e.target.value } : x,
                    ),
                  })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove link"
                onClick={() =>
                  set({ links: d.links?.filter((_, j) => j !== i) })
                }
              >
                <X />
              </Button>
              <FieldError text={f(`links[${i}].url`)} />
            </div>
          ))}
          <Button
            variant="outline"
            className="self-start"
            onClick={() =>
              set({ links: [...(d.links ?? []), { label: "", url: "" }] })
            }
          >
            <Plus />
            Add a link
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-medium">Your own fields</span>
          {d.fieldRows.map((r) => (
            <div
              key={r.key}
              className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] gap-2"
            >
              <Input
                aria-label="Field name"
                placeholder="Name"
                value={r.name}
                onChange={(e) =>
                  set({
                    fieldRows: d.fieldRows.map((x) =>
                      x.key === r.key ? { ...x, name: e.target.value } : x,
                    ),
                  })
                }
              />
              <Input
                aria-label="Value"
                placeholder="Value"
                value={r.value}
                onChange={(e) =>
                  set({
                    fieldRows: d.fieldRows.map((x) =>
                      x.key === r.key ? { ...x, value: e.target.value } : x,
                    ),
                  })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove field"
                onClick={() =>
                  set({ fieldRows: d.fieldRows.filter((x) => x.key !== r.key) })
                }
              >
                <X />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            className="self-start"
            onClick={() =>
              set({
                fieldRows: [
                  ...d.fieldRows,
                  { key: nextKey(), name: "", value: "" },
                ],
              })
            }
          >
            <Plus />
            Add a field
          </Button>
        </div>
        {saved ? (
          <p className="text-caption text-muted-foreground">
            Notes have their own tab on the asset's page: written in Markdown,
            each with its author, and pinnable to the overview.
          </p>
        ) : (
          <Field
            label="First note"
            hint="Optional. More notes go on the asset's Notes tab (Markdown works)."
          >
            {(p) => (
              <Textarea
                {...p}
                rows={4}
                value={d.notes ?? ""}
                maxLength={20000}
                onChange={(e) => set({ notes: e.target.value })}
              />
            )}
          </Field>
        )}
      </Section>
    </>
  )

  const title = saved ? saved.name : `New ${kindOf(d.kind).label.toLowerCase()}`
  const blocked = save.isPending || (!!saved && !dirty)
  const ownerName = (() => {
    const o = splitOwner(d.owner)
    if (o.user) return people.data?.users.find((x) => x.id === o.user)?.name
    if (o.group) return people.data?.groups.find((x) => x.id === o.group)?.name
    return saved?.owner.from === "rule"
      ? `${saved.owner.user_name || saved.owner.group_name} (rule)`
      : ""
  })()

  if (phone) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={leave}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {saved ? "Edit asset" : title}
          </h1>
          <Button
            variant="ghost"
            className="h-11 px-3 text-brand"
            disabled={blocked}
            onClick={submit}
          >
            {save.isPending ? "Saving…" : saved ? "Save" : "Add"}
          </Button>
        </header>
        <div className="flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {sections}
        </div>
      </div>
    )
  }

  return (
    <EditorPage
      icon={
        <AssetIcon
          asset={{ kind: d.kind, category: d.category ?? "" }}
          className="size-auto bg-transparent"
        />
      }
      title={title}
      dirty={dirty}
      status={
        dirty
          ? "Unsaved changes"
          : saved
            ? `Saved ${timeAgo(saved.updated_at)}`
            : "Not saved yet"
      }
      onSave={blocked ? undefined : submit}
      actions={
        <>
          <Button variant="outline" className="h-9" onClick={leave}>
            Cancel
          </Button>
          <Button className="h-9" disabled={blocked} onClick={submit}>
            {save.isPending ? "Saving…" : saved ? "Save" : "Add asset"}
          </Button>
        </>
      }
      aside={
        <>
          <AsideCard title="Summary">
            <SummaryList
              rows={[
                [
                  "Kind",
                  kindOf(d.kind).label + (d.category ? ` · ${d.category}` : ""),
                ],
                ["Name", d.name.trim()],
                ["Owner", ownerName],
                ["Environment", envLabel(d.environment ?? "")],
                ["Lifecycle", lifecycleLabel(d.lifecycle ?? "active")],
                [
                  "Cost",
                  money(d.cost, d.currency ?? "") &&
                    `${money(d.cost, d.currency ?? "")}${d.billing === "monthly" ? " / month" : d.billing === "yearly" ? " / year" : ""}`,
                ],
                ["Expires", d.expires_on ?? ""],
              ]}
            />
          </AsideCard>
          <AsideCard title="Good to know">
            <Callout icon={<Info />}>
              Ownership is a record, not a permission: owners get reminders and
              alerts about it, nothing more.
            </Callout>
          </AsideCard>
        </>
      }
    >
      <div className={cn("contents")}>{sections}</div>
    </EditorPage>
  )
}
