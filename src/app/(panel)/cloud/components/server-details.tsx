"use client"

import {
  Copy,
  Lock,
  ServerCog,
  SquarePlus,
  TextCursorInput,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode, useRef } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import type { CloudServer } from "@/lib/services"
import { cn } from "@/lib/utils"
import { serverKey, useCloudServers } from "../api"
import { powerChoices, useCloudActions } from "./cloud-actions"
import {
  mainAddress,
  osText,
  providerLabel,
  ServerStateLabel,
  sizeText,
} from "./meta"
import { powerMeta } from "./server-dialogs"

// One cloud server: what it is, its addresses, its Morche twin, and the
// changes this person may make.
export function ServerDetailsLayer({
  open,
  onOpenChange,
  serverKey: key,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverKey?: string
}) {
  const isMobile = useIsMobile()
  const servers = useCloudServers(open)
  // Keep the last server shown so the layer can animate out.
  const last = useRef<CloudServer | null>(null)
  const found = servers.data?.items.find((s) => serverKey(s) === key)
  if (found) last.current = found
  const server = found ?? last.current
  if (!server) return null

  const title = server.name
  const subtitle = `${server.account_name} · ${server.region_name || server.region}`

  if (isMobile) {
    return (
      <BottomSheet full open={open} onOpenChange={onOpenChange} title={title}>
        <p className="-mt-1 mb-4 px-2 text-body-sm text-muted-foreground">
          {subtitle}
        </p>
        <div className="px-2">
          <Body server={server} onOpenChange={onOpenChange} phone />
        </div>
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <Body server={server} onOpenChange={onOpenChange} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Body({
  server: s,
  onOpenChange,
  phone = false,
}: {
  server: CloudServer
  onOpenChange: (open: boolean) => void
  phone?: boolean
}) {
  const a = useCloudActions()
  const c = a.serverCan(s)
  const choices = c.power ? powerChoices(s) : []
  const address = mainAddress(s)

  // Close this layer first, then open the next one on its own Back entry.
  const then = (fn: () => void) => {
    window.addEventListener("popstate", fn, { once: true })
    onOpenChange(false)
  }

  const facts: { label: string; value: ReactNode; mono?: boolean }[] = [
    { label: "State", value: <ServerStateLabel server={s} /> },
    { label: "Provider", value: providerLabel(s.provider) },
    { label: "Account", value: s.account_name },
    {
      label: "Region",
      value: [s.region_name || s.region, s.zone_name || s.zone]
        .filter(Boolean)
        .join(" · "),
    },
    { label: "Size", value: sizeText(s) || "—" },
    { label: "Plan", value: s.plan || "—", mono: !!s.plan },
    { label: "System", value: osText(s) || "—" },
    {
      label: "Created",
      value: s.created_at ? new Date(s.created_at).toLocaleString() : "—",
    },
    { label: "SSH key", value: s.ssh_key || "—", mono: !!s.ssh_key },
    { label: "Backups", value: s.backups ? "On" : "Off" },
    { label: "ID", value: s.id, mono: true },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Changes first: they're why someone opens a server. */}
      {(choices.length > 0 || c.rename) && (
        <div
          className={cn("flex flex-wrap gap-2", phone && "grid grid-cols-2")}
        >
          {choices.map((action) => (
            <Button
              key={action}
              variant="outline"
              className={cn(phone && "h-11")}
              onClick={() => then(() => a.power(s, action))}
            >
              {powerMeta[action].label}
            </Button>
          ))}
          {c.rename && (
            <Button
              variant="outline"
              className={cn(phone && "h-11")}
              onClick={() => then(() => a.rename(s))}
            >
              <TextCursorInput />
              Rename
            </Button>
          )}
        </div>
      )}
      {c.locked && (
        <p className="flex items-start gap-2 rounded-lg bg-subtle px-3 py-2.5 text-body-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0 text-ash" />
          <span>
            {c.locked} An owner can turn on{" "}
            <span className="font-medium text-foreground">
              Allow changes from Morche
            </span>{" "}
            in the account's settings.
          </span>
        </p>
      )}

      <section>
        <h3 className="mb-2 font-label text-caption tracking-label text-ash uppercase">
          Addresses
        </h3>
        {s.addresses.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">No address yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {s.addresses.map((ad) => (
              <li
                key={`${ad.network ?? ""}-${ad.ip}`}
                className="flex items-center gap-3 py-1.5 ps-4 pe-1.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-body-sm">
                    {ad.ip}
                  </span>
                  <span className="block truncate text-caption text-ash">
                    {[
                      ad.public ? "Public" : "Private",
                      `IPv${ad.version || 4}`,
                      ad.network,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size={phone ? "icon-lg" : "icon-sm"}
                  aria-label={`Copy ${ad.ip}`}
                  onClick={() => a.copy(ad.ip, "Address")}
                >
                  <Copy />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-label text-caption tracking-label text-ash uppercase">
          In Morche
        </h3>
        {s.linked.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {s.linked.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/servers/${l.id}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 outline-none hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <ServerCog className="size-4 shrink-0 text-ash" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm font-medium">
                      {l.name}
                    </span>
                    <span className="block truncate font-mono text-caption text-ash">
                      {l.host}
                    </span>
                  </span>
                  <span className="text-body-sm text-brand">Open</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4 text-body-sm text-muted-foreground">
            <p>
              Not one of Morche's servers yet. Add it to get a terminal, files,
              monitoring and everything else over SSH.
            </p>
            {a.canAddToMorche && address && (
              <Button
                className={cn("self-start", phone && "h-11 self-stretch")}
                onClick={() => then(() => a.addToMorche(s))}
              >
                <SquarePlus />
                Add to Morche servers
              </Button>
            )}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-label text-caption tracking-label text-ash uppercase">
          About
        </h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-subtle p-4 text-body-sm">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="text-caption text-ash">{f.label}</dt>
              <dd
                className={cn(
                  "mt-0.5 break-words",
                  f.mono ? "font-mono text-caption break-all" : "font-medium",
                )}
              >
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
        {s.raw_state && (s.state === "unknown" || s.state === "error") && (
          <p className="mt-2 text-caption text-ash">
            The provider calls its state “{s.raw_state}”.
          </p>
        )}
      </section>
    </div>
  )
}
