"use client"

import { Earth, Info, Plus, TriangleAlert, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import {
  Callout,
  FieldError,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ListInput } from "@/app/(panel)/dns/components/fields"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { JobBar } from "@/components/jobs/meta"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useOpen } from "@/hooks/useOpen"
import type { Proxy as ReverseProxy } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useGeoJob, useInspection, useSetupGeo } from "../../../api"
import { useProxyCan } from "../../../components/permissions"
import { inspectable } from "../../components/toolbar"
import { countryName, findCountries } from "./countries"
import {
  type Access,
  countryList,
  type Draft,
  type Errors,
  splitList,
  typeUses,
} from "./draft"
import { EditorCard as Card } from "./editor-card"

// Security › who can reach the site: two address lists, what happens to
// everyone else, and countries (sites only, needs the GeoIP2 lookup).

const accessItems = [
  { value: "allow" as const, label: "Let in" },
  { value: "deny" as const, label: "Block" },
]

const countryModes = [
  { value: "deny" as const, label: "Block these" },
  { value: "allow" as const, label: "Only these" },
]

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`

// Who gets in, in one sentence, and whether that's likely a mistake.
function summary(d: Draft): { text: string; warn?: boolean } {
  const allow = splitList(d.allow).length
  const deny = splitList(d.deny).length
  const cc = typeUses(d.type).countries ? countryList(d) : []
  const open = d.defaultAccess === "allow"
  const plus = allow ? `, plus ${plural(allow, "address")} let in` : ""
  if (cc.length) {
    const names = cc.slice(0, 3).map(countryName).join(", ")
    const more = cc.length > 3 ? ` and ${cc.length - 3} more` : ""
    if (d.countryMode === "allow") {
      return {
        text: `Only visitors from ${names}${more}${plus}${
          open ? ", and visitors whose country isn't known" : ""
        }.`,
      }
    }
    if (!open) {
      return {
        warn: true,
        text: allow
          ? "Everyone else is blocked, so only the addresses let in get through: the country list adds nothing. Set Everyone else to Let in."
          : "Everyone is blocked: nobody can reach this site. Set Everyone else to Let in.",
      }
    }
    return {
      text: `Everyone except visitors from ${names}${more}${
        deny ? ` and ${plural(deny, "blocked address")}` : ""
      }.`,
    }
  }
  if (open) {
    if (!deny) return { text: "Everyone can reach it." }
    return { text: `Everyone except ${plural(deny, "blocked address")}.` }
  }
  if (!allow) {
    return {
      warn: true,
      text: "Nobody can reach this site: add the addresses to let in, or set Everyone else to Let in.",
    }
  }
  return { text: `Only ${plural(allow, "address")} let in.` }
}

export function AccessEditor({
  proxy: p,
  draft: d,
  set,
  errors,
  phone,
}: {
  proxy: ReverseProxy
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
}) {
  const caps = p.capabilities
  const stream = d.type === "stream"
  const s = summary(d)
  const allowOnly =
    d.defaultAccess === "allow" &&
    !!splitList(d.allow).length &&
    !splitList(d.deny).length &&
    !(typeUses(d.type).countries && d.countries.length)
  return (
    <>
      {caps.allow && (
        <Card
          title="Who can reach it"
          hint={
            stream
              ? "Addresses blocked here are cut off before they reach the forward."
              : "Blocked visitors get 403 Forbidden."
          }
          phone={phone}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-body-sm font-medium">Everyone else</p>
              <p className="text-caption text-muted-foreground">
                Visitors the lists below don't name.
              </p>
            </div>
            <Segmented<Access>
              label="Everyone else"
              items={accessItems}
              value={d.defaultAccess}
              onChange={(defaultAccess) => set({ defaultAccess })}
            />
          </div>
          <FieldError text={errors.default_access} />
          <div className={cn("grid gap-4", !phone && "lg:grid-cols-2")}>
            <Field
              label="Always let in"
              hint={
                allowOnly
                  ? "Everyone gets in already: this list only matters inside a range you block."
                  : "One per line, like 203.0.113.7 or 10.0.0.0/8."
              }
              error={errors.allow}
            >
              {(f) => (
                <ListInput
                  {...f}
                  value={d.allow}
                  onChange={(allow) => set({ allow })}
                  placeholder="No addresses"
                />
              )}
            </Field>
            <Field
              label="Always block"
              hint="One per line, IPv4 or IPv6, an address or a range."
              error={errors.deny}
            >
              {(f) => (
                <ListInput
                  {...f}
                  value={d.deny}
                  onChange={(deny) => set({ deny })}
                  placeholder="No addresses"
                />
              )}
            </Field>
          </div>
          <Callout
            icon={s.warn ? <TriangleAlert /> : <Info />}
            tone={s.warn ? "warning" : undefined}
          >
            {s.text}
            {!s.warn &&
            (splitList(d.allow).length > 0 || d.countries.length) ? (
              <span className="block">
                When an address is in both lists, the narrower entry wins (a
                single address beats its range). Addresses are checked before
                countries.
              </span>
            ) : null}
          </Callout>
        </Card>
      )}
      {caps.countries && typeUses(d.type).countries && (
        <CountriesCard
          proxy={p}
          draft={d}
          set={set}
          errors={errors}
          phone={phone}
        />
      )}
    </>
  )
}

function CountriesCard({
  proxy: p,
  draft: d,
  set,
  errors,
  phone,
}: {
  proxy: ReverseProxy
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
}) {
  const inspection = useInspection(p.id, inspectable(p))
  const geo = inspection.data?.geo
  const job = useGeoJob(p.id)
  const setup = useSetupGeo()
  const jobs = useJobActions()
  const can = useProxyCan()
  const [picking, setPicking] = useOpen("proxy-countries")
  const list = countryList(d)

  const turnOn = () =>
    setup.mutate(p.id, {
      onSuccess: (j) => jobs.track(j),
      onError: (e) => toast.error(e.message),
    })

  return (
    <Card
      title="Countries"
      hint="Let in or block visitors by the country their address belongs to."
      count={list.length}
      phone={phone}
    >
      {job ? (
        <Callout icon={<Earth />}>
          <p className="font-medium text-foreground">
            Turning on country lookup…
          </p>
          <p className="truncate">
            {job.progress.current || job.progress.phase || job.title}
          </p>
          <JobBar job={job} className="mt-2" />
        </Callout>
      ) : (
        geo === "off" && (
          <Callout icon={<Earth />} tone={list.length ? "warning" : undefined}>
            <p>
              Country lookup isn't on for this proxy yet. Turning it on adds
              nginx's GeoIP2 module and a free country database (about 8 MB,
              refreshed monthly) to {p.server_name}. You can pick countries now,
              but the site can only be saved with them once it's on.
            </p>
            {can(p, "engineer") && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-11 md:h-8"
                disabled={setup.isPending}
                onClick={turnOn}
              >
                <Earth />
                Turn on country lookup
              </Button>
            )}
          </Callout>
        )
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-sm font-medium">These countries</p>
          <p className="text-caption text-muted-foreground">
            {d.countryMode === "allow"
              ? "Only visitors from them get in."
              : "Visitors from them are blocked."}
          </p>
        </div>
        <Segmented<Access>
          label="Countries"
          items={countryModes}
          value={d.countryMode}
          onChange={(countryMode) => set({ countryMode })}
        />
      </div>
      <FieldError text={errors.country_mode} />
      <div className="flex flex-wrap gap-2">
        {list.map((c) => (
          <span
            key={c}
            className="flex h-9 items-center gap-1.5 rounded-full border border-border ps-3 pe-1 text-body-sm md:h-8"
          >
            <span className="font-mono text-caption text-ash">{c}</span>
            {countryName(c)}
            <button
              type="button"
              aria-label={`Remove ${countryName(c)}`}
              onClick={() => set({ countries: list.filter((x) => x !== c) })}
              className="flex size-7 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:size-6 [&_svg]:size-3.5"
            >
              <X />
            </button>
          </span>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-full md:h-8"
          onClick={() => setPicking(true)}
        >
          <Plus />
          {list.length ? "Add or remove" : "Choose countries"}
        </Button>
      </div>
      <FieldError text={errors.countries} />
      <p className="text-caption text-ash">
        Lists of addresses per country are never exact: VPNs and proxies hide
        where a visitor is. IP to country data by{" "}
        <Link
          href="https://db-ip.com"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          DB-IP.com
        </Link>{" "}
        (CC BY 4.0).
      </p>
      <CountryPicker
        open={picking}
        onOpenChange={setPicking}
        value={list}
        onChange={(countries) => set({ countries })}
      />
    </Card>
  )
}

function CountryPicker({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string[]
  onChange: (value: string[]) => void
}) {
  const [q, setQ] = useState("")
  const found = findCountries(q)
  const toggle = (code: string, on: boolean) =>
    onChange(on ? [...value, code] : value.filter((c) => c !== code))
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setQ("")
      }}
      title="Countries"
      footer={
        <Button className="h-11 md:h-9" onClick={() => onOpenChange(false)}>
          Done{value.length ? ` (${value.length})` : ""}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or code"
          aria-label="Search countries"
          enterKeyHint="search"
          autoComplete="off"
        />
        <ul className="-mx-1 max-h-[22rem] overflow-y-auto">
          {found.map((c) => {
            const id = `country-${c.code}`
            const on = value.includes(c.code)
            return (
              <li key={c.code}>
                <label
                  htmlFor={id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-muted md:min-h-9"
                >
                  <Checkbox
                    id={id}
                    checked={on}
                    onCheckedChange={(v) => toggle(c.code, !!v)}
                  />
                  <span className="min-w-0 flex-1 truncate text-body-sm">
                    {c.name}
                  </span>
                  <span className="font-mono text-caption text-ash">
                    {c.code}
                  </span>
                </label>
              </li>
            )
          })}
          {!found.length && (
            <li className="px-2 py-6 text-center text-body-sm text-muted-foreground">
              No country matches “{q}”.
            </li>
          )}
        </ul>
      </div>
    </ResponsiveDialog>
  )
}
