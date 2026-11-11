"use client"

import { ChevronDown, Globe, X } from "lucide-react"
import { useState } from "react"

import {
  Callout,
  FieldError,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ChoiceSelect } from "@/app/(panel)/dns/components/fields"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { CountryPicker } from "./access-editor"
import { countryName } from "./countries"
import {
  type Device,
  deviceLabels,
  deviceList,
  hasWhen,
  type Visitor,
  type When,
  whenText,
} from "./redirects"

const splitCodes = (text: string) =>
  text
    .split(/[\s,;]+/)
    .map((x) => x.trim())
    .filter(Boolean)

// "Only for some visitors": countries, languages, devices and a time window
// a rule needs, all of them, to redirect.
export function WhenFields({
  value,
  onChange,
  error,
  geo,
}: {
  value: When
  onChange: (w: When) => void
  error?: string
  // inspection.geo: countries need the lookup turned on.
  geo: "" | "ready" | "off" | undefined
}) {
  const [open, setOpen] = useState(() => hasWhen(value))
  const [pickOpen, setPickOpen] = useState(false)
  const [langs, setLangs] = useState(value.languages.join(", "))
  const p = (x: Partial<When>) => onChange({ ...value, ...x })
  const toggleDevice = (d: Device) =>
    p({
      devices: value.devices.includes(d)
        ? value.devices.filter((x) => x !== d)
        : [...value.devices, d],
    })
  const summary = whenText(value)

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border p-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="-m-1 flex min-h-11 items-center gap-2 rounded-lg p-1 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-9"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-body-sm font-medium">
            Only for some visitors
          </span>
          <span className="block truncate text-caption text-muted-foreground">
            {summary ||
              "Everyone. Limit it by country, language, device or time."}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-ash transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium">Countries</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {value.countries.map((c) => (
                <span
                  key={c}
                  className="inline-flex h-8 items-center gap-1 rounded-full bg-muted ps-3 pe-1 text-body-sm"
                  title={countryName(c)}
                >
                  {c}
                  <button
                    type="button"
                    aria-label={`Remove ${countryName(c)}`}
                    onClick={() =>
                      p({ countries: value.countries.filter((x) => x !== c) })
                    }
                    className="flex size-6 items-center justify-center rounded-full text-ash hover:bg-background hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 md:h-8"
                onClick={() => setPickOpen(true)}
              >
                <Globe />
                {value.countries.length ? "Change" : "Choose countries"}
              </Button>
            </div>
            {value.countries.length > 0 && geo !== "ready" && (
              <Callout icon={<Globe />} tone="warning">
                Countries need the visitor-country lookup. Turn it on in
                Security › Countries before saving.
              </Callout>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium">Devices</span>
            <div className="flex flex-wrap gap-1.5">
              {deviceList.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={value.devices.includes(d)}
                  onClick={() => toggleDevice(d)}
                  className="h-11 rounded-full border border-input px-3 text-body-sm text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-transparent aria-pressed:bg-brand-soft aria-pressed:text-brand-strong md:h-8"
                >
                  {deviceLabels[d]}
                </button>
              ))}
            </div>
            <p className="text-caption text-ash">
              None picked = every device. Told apart by the browser's user
              agent.
            </p>
          </div>
          <Field
            label="Languages"
            hint="The browser's first language, as two or three letters: fa, en, de. Separate with commas."
          >
            {(f) => (
              <Input
                {...f}
                value={langs}
                onChange={(e) => {
                  setLangs(e.target.value)
                  p({ languages: splitCodes(e.target.value) })
                }}
                placeholder="fa, en"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            )}
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="From" hint="Empty = no start.">
              {(f) => (
                <Input
                  {...f}
                  type="datetime-local"
                  value={value.from}
                  onChange={(e) => p({ from: e.target.value.slice(0, 16) })}
                />
              )}
            </Field>
            <Field label="Until" hint="Not included. Empty = no end.">
              {(f) => (
                <Input
                  {...f}
                  type="datetime-local"
                  value={value.until}
                  onChange={(e) => p({ until: e.target.value.slice(0, 16) })}
                />
              )}
            </Field>
          </div>
          <p className="-mt-2 text-caption text-ash">
            Times are the proxy server's clock. A rule with a window works like
            a campaign: it starts and stops by itself.
          </p>
          <FieldError text={error} />
          {hasWhen(value) && (
            <p className="text-caption text-muted-foreground">
              Rules with conditions are checked first, in list order; other
              visitors fall through to the plain rules.
            </p>
          )}
        </div>
      )}
      {!open && <FieldError text={error} />}
      <CountryPicker
        open={pickOpen}
        onOpenChange={setPickOpen}
        value={value.countries}
        onChange={(countries) => p({ countries })}
      />
    </section>
  )
}

const deviceItems = deviceList.map((d) => ({
  value: d,
  label: deviceLabels[d],
}))

// Who's asking, for the tester when some rules have conditions.
export function VisitorFields({
  value,
  onChange,
}: {
  value: Visitor
  onChange: (v: Visitor) => void
}) {
  const p = (x: Partial<Visitor>) => onChange({ ...value, ...x })
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Country" hint="Two letters, empty = unknown.">
        {(f) => (
          <Input
            {...f}
            value={value.country}
            onChange={(e) =>
              p({ country: e.target.value.toUpperCase().slice(0, 2) })
            }
            placeholder="DE"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
        )}
      </Field>
      <Field label="Language">
        {(f) => (
          <Input
            {...f}
            value={value.language}
            onChange={(e) => p({ language: e.target.value.toLowerCase() })}
            placeholder="fa"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        )}
      </Field>
      <Field label="Device">
        {(f) => (
          <ChoiceSelect<Device>
            id={f.id}
            value={value.device}
            onChange={(device) => p({ device })}
            items={deviceItems}
          />
        )}
      </Field>
      <Field label="Time">
        {(f) => (
          <Input
            {...f}
            type="datetime-local"
            value={value.time}
            onChange={(e) => p({ time: e.target.value.slice(0, 16) })}
          />
        )}
      </Field>
    </div>
  )
}
