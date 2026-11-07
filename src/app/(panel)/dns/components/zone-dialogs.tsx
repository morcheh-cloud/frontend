"use client"

import { Loader2 } from "lucide-react"
import { type FormEvent, useCallback, useState } from "react"
import { toast } from "sonner"

import { Segmented } from "@/app/(panel)/servers/components/fields"
import { BottomSheet } from "@/components/bottom-sheet"
import { Field } from "@/components/field"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/hooks/use-mobile"
import { fieldErrors } from "@/lib/api"
import type { DNSServer, DNSZoneOptions } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCreateZone, useSetZoneOptions, useZoneOptions } from "../api"
import { ChoiceSelect, ListInput, listErrors, splitList } from "./fields"
import {
  copiedZone,
  hostOf,
  notifyOptions,
  transferOptions,
  zoneDisplayName,
  zoneTypeLabel,
} from "./meta"

const focusOnPointer = (el: HTMLInputElement | null) => {
  if (el && matchMedia("(pointer: fine)").matches) el.focus()
}

type ZoneKind = "Primary" | "Secondary"

// A new zone. `servers` are the ones it may go on (the first is picked); a
// server page passes just its own.
export function NewZoneDialog({
  open,
  onOpenChange,
  servers,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  servers: DNSServer[]
  onCreated: (server: DNSServer, zone: string) => void
}) {
  const [serverId, setServerId] = useState(servers[0]?.id ?? "")
  const server = servers.find((s) => s.id === serverId) ?? servers[0]
  const [name, setName] = useState("")
  const [kind, setKind] = useState<ZoneKind>("Primary")
  const [primaries, setPrimaries] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const create = useCreateZone(server?.id ?? "")
  const focusName = useCallback(focusOnPointer, [])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!server) return
    const zone = name.trim().replace(/\.$/, "")
    if (!zone) return setErrors({ name: "Enter the domain, like example.com" })
    create.mutate(
      {
        name: zone,
        type: kind,
        ...(kind === "Secondary" && {
          primary_addresses: splitList(primaries),
        }),
      },
      {
        onSuccess: (out) => {
          toast.success(`Created ${zoneDisplayName(out.name)}`, {
            description:
              kind === "Secondary"
                ? "Copying it from the primary…"
                : `On ${server.name}`,
          })
          onCreated(server, out.name)
        },
        onError: (error) => {
          const fields = listErrors(fieldErrors(error))
          if (Object.keys(fields).length) setErrors(fields)
          else toast.error(error.message)
        },
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New zone"
      description="A domain this DNS server answers for."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="max-md:hidden"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="dns-new-zone"
            size="lg"
            className="md:h-9"
            disabled={create.isPending || !server}
          >
            {create.isPending && <Loader2 className="animate-spin" />}
            Create zone
          </Button>
        </>
      }
    >
      <form
        id="dns-new-zone"
        onSubmit={submit}
        noValidate
        className="flex flex-col gap-5 pb-2"
      >
        {servers.length > 1 && (
          <Field label="DNS server">
            {(p) => (
              <ChoiceSelect
                id={p.id}
                value={server?.id ?? ""}
                onChange={setServerId}
                items={servers.map((s) => ({
                  value: s.id,
                  label: s.name,
                  detail: hostOf(s.url),
                }))}
              />
            )}
          </Field>
        )}
        <Field
          label="Domain"
          error={errors.name}
          hint="A network like 10.0.0.0/24 makes its reverse zone."
        >
          {(p) => (
            <Input
              {...p}
              ref={focusName}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setErrors({})
              }}
              placeholder="example.com"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono"
            />
          )}
        </Field>
        <div className="flex flex-col gap-1.5">
          <Segmented
            label="Zone type"
            value={kind}
            onChange={setKind}
            options={[
              { value: "Primary", label: "Primary" },
              { value: "Secondary", label: "Secondary" },
            ]}
          />
          <p className="text-caption text-muted-foreground">
            {kind === "Primary"
              ? "You edit the records here. Starts with SOA and NS records."
              : "A read-only copy kept in step with another server (the primary)."}
          </p>
        </div>
        {kind === "Secondary" && (
          <Field
            label="Primary server addresses"
            error={errors.primary_addresses}
            hint="IP addresses of the primary, one per line. Blank asks the zone's SOA. The primary must allow this server to copy the zone (Zone settings there)."
          >
            {(p) => (
              <ListInput
                {...p}
                value={primaries}
                onChange={setPrimaries}
                placeholder="192.0.2.53"
              />
            )}
          </Field>
        )}
      </form>
    </ResponsiveDialog>
  )
}

type Draft = {
  zone_transfer: DNSZoneOptions["zone_transfer"]
  zone_transfer_allowed: string
  notify: DNSZoneOptions["notify"]
  notify_servers: string
  primary_addresses: string
}

const toDraft = (o: DNSZoneOptions): Draft => ({
  zone_transfer: o.zone_transfer,
  zone_transfer_allowed: o.zone_transfer_allowed.join("\n"),
  notify: o.notify,
  notify_servers: o.notify_servers.join("\n"),
  primary_addresses: o.primary_addresses.join("\n"),
})

// Who may copy the zone (zone transfer), who hears about changes (notify),
// and for a Secondary where it copies from.
export function ZoneSettingsLayer({
  open,
  onOpenChange,
  server,
  zone,
  type,
  canEdit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: DNSServer
  zone: string
  type: string
  canEdit: boolean
}) {
  const isMobile = useIsMobile()
  const options = useZoneOptions(server.id, zone, open)
  const title = `${zoneDisplayName(zone)} settings`
  const description = `${zoneTypeLabel(type)} zone on ${server.name}`

  const body = options.isPending ? (
    <div className="flex flex-col gap-4 p-6 max-md:px-4">
      <Skeleton className="h-10 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-10 rounded-lg" />
    </div>
  ) : options.isError ? (
    <p className="p-6 text-body-sm text-destructive max-md:px-4">
      {options.error.message}
    </p>
  ) : (
    <SettingsForm
      key={options.dataUpdatedAt}
      server={server}
      zone={zone}
      options={options.data}
      canEdit={canEdit}
      phone={!!isMobile}
      onDone={() => onOpenChange(false)}
    />
  )

  if (isMobile) {
    return (
      <BottomSheet full open={open} onOpenChange={onOpenChange} title={title}>
        <p className="-mt-1 px-4 text-body-sm text-muted-foreground">
          {description}
        </p>
        {body}
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}

function SettingsForm({
  server,
  zone,
  options,
  canEdit,
  phone,
  onDone,
}: {
  server: DNSServer
  zone: string
  options: DNSZoneOptions
  canEdit: boolean
  phone: boolean
  onDone: () => void
}) {
  const [draft, setDraft] = useState(() => toDraft(options))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const save = useSetZoneOptions(server.id, zone)
  const secondary = copiedZone(options.type)
  const transfer = transferOptions.find((o) => o.value === draft.zone_transfer)
  const notify = notifyOptions.find((o) => o.value === draft.notify)
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(options))

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
    setErrors(({ [key]: _, ...rest }) => rest)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    save.mutate(
      {
        zone_transfer: draft.zone_transfer,
        zone_transfer_allowed: splitList(draft.zone_transfer_allowed),
        notify: draft.notify,
        notify_servers: splitList(draft.notify_servers),
        ...(secondary && {
          primary_addresses: splitList(draft.primary_addresses),
        }),
      },
      {
        onSuccess: () => {
          toast.success("Zone settings saved")
          onDone()
        },
        onError: (error) => {
          const fields = listErrors(fieldErrors(error))
          if (Object.keys(fields).length) setErrors(fields)
          else toast.error(error.message)
        },
      },
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <fieldset
        disabled={!canEdit}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto",
          phone ? "px-4 pt-5 pb-6" : "p-6",
        )}
      >
        {options.notify_failed && (
          <p className="rounded-lg bg-subtle px-3 py-2.5 text-body-sm">
            <span className="font-medium">Notify failed</span>
            {options.notify_failed_for.length > 0 && (
              <span className="text-muted-foreground">
                {" "}
                for {options.notify_failed_for.join(", ")}
              </span>
            )}
          </p>
        )}
        {secondary && (
          <section className="flex flex-col gap-4">
            <Heading>Copies from</Heading>
            <Field
              label="Primary server addresses"
              error={errors.primary_addresses}
              hint="One per line. Blank asks the zone's SOA."
            >
              {(p) => (
                <ListInput
                  {...p}
                  value={draft.primary_addresses}
                  onChange={(v) => set("primary_addresses", v)}
                  placeholder="192.0.2.53"
                />
              )}
            </Field>
          </section>
        )}
        <section className="flex flex-col gap-4">
          <Heading>Zone transfer</Heading>
          <Field label="Who may copy this zone" hint={transfer?.hint}>
            {(p) => (
              <ChoiceSelect
                id={p.id}
                value={draft.zone_transfer}
                onChange={(v) => set("zone_transfer", v)}
                items={transferOptions}
              />
            )}
          </Field>
          {transfer?.list && (
            <Field
              label="Addresses"
              error={errors.zone_transfer_allowed}
              hint="IP addresses or networks (10.0.0.0/24), one per line. Start one with ! to refuse it."
            >
              {(p) => (
                <ListInput
                  {...p}
                  value={draft.zone_transfer_allowed}
                  onChange={(v) => set("zone_transfer_allowed", v)}
                  placeholder="192.0.2.54"
                />
              )}
            </Field>
          )}
        </section>
        <section className="flex flex-col gap-4">
          <Heading>Notify</Heading>
          <Field label="Tell about changes" hint={notify?.hint}>
            {(p) => (
              <ChoiceSelect
                id={p.id}
                value={draft.notify}
                onChange={(v) => set("notify", v)}
                items={notifyOptions}
              />
            )}
          </Field>
          {notify?.list && (
            <Field
              label="Addresses"
              error={errors.notify_servers}
              hint="IP addresses of the Secondary servers, one per line."
            >
              {(p) => (
                <ListInput
                  {...p}
                  value={draft.notify_servers}
                  onChange={(v) => set("notify_servers", v)}
                  placeholder="192.0.2.54"
                />
              )}
            </Field>
          )}
        </section>
      </fieldset>
      {canEdit && (
        <div
          className={cn(
            "flex shrink-0 items-center justify-end gap-2 border-t border-border",
            phone
              ? "px-4 pt-3 pb-[calc(--spacing(3)+env(safe-area-inset-bottom))]"
              : "px-6 py-4",
          )}
        >
          {!phone && (
            <Button type="button" variant="outline" onClick={onDone}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size={phone ? "lg" : "default"}
            className={cn(phone && "w-full")}
            disabled={!dirty || save.isPending}
          >
            {save.isPending && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </div>
      )}
    </form>
  )
}

function Heading({ children }: { children: string }) {
  return (
    <h3 className="font-label text-caption tracking-label text-ash uppercase">
      {children}
    </h3>
  )
}
