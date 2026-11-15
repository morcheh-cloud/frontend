"use client"

import { ChevronRight, Download, Globe, RotateCcw, Upload } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const GLOBAL_SETTINGS = "/containers/global-settings"
export const SERVER_SETTINGS = "/containers/settings"

export type ScopeEnv = {
  id: string
  name: string
  // Settings of its own (saved or in the draft).
  own: number
  dirty: boolean
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`

// The global page's head: what these settings cover, the servers that set
// some for themselves (a click opens that server's settings), export and
// import.
export function GlobalHeader({
  phone,
  workspace,
  envs,
  onOpen,
  onExport,
  onImport,
}: {
  phone: boolean
  workspace: string
  envs: ScopeEnv[]
  onOpen: (id: string) => void
  onExport: () => void
  onImport?: () => void
}) {
  const own = envs.filter((e) => e.own > 0 || e.dirty)
  const following = envs.length - own.length
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 max-md:-mx-4 max-md:rounded-none max-md:border-x-0 max-md:p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
          <Globe className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-body font-medium">
            Every container server in {workspace}
          </p>
          <p className="text-caption text-muted-foreground">
            {envs.length === 0
              ? "No server runs Docker or Podman yet; a new one starts with these."
              : `${plural(envs.length, "server")} use these. A server can still set a value for itself on its own Settings page.`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size={phone ? "icon" : "sm"}
            className={cn(phone && "size-11")}
            aria-label="Export settings"
            title={phone ? undefined : "Download every setting as a file"}
            onClick={onExport}
          >
            <Download />
            {!phone && "Export"}
          </Button>
          {onImport && (
            <Button
              variant="ghost"
              size={phone ? "icon" : "sm"}
              className={cn(phone && "size-11")}
              aria-label="Import settings"
              title={phone ? undefined : "Load settings from a file"}
              onClick={onImport}
            >
              <Upload />
              {!phone && "Import"}
            </Button>
          )}
        </div>
      </div>
      {envs.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-caption text-muted-foreground">
            {own.length === 0
              ? "Every server follows these exactly."
              : following > 0
                ? `${plural(own.length, "server")} set some values for themselves; ${following} follow these exactly.`
                : "Every server sets some values for itself."}
          </p>
          {own.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {own.map((e) => (
                <li key={e.id} className="max-w-full min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpen(e.id)}
                    title={`Open the settings of ${e.name}`}
                    className="flex h-8 max-w-full min-w-0 items-center gap-1.5 rounded-full border border-border bg-background ps-3 pe-2 text-body-sm transition-colors hover:bg-muted max-md:h-11"
                  >
                    <span className="truncate font-medium">{e.name}</span>
                    <span className="shrink-0 text-caption text-muted-foreground">
                      {e.own} own
                    </span>
                    {e.dirty && (
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-brand"
                        title="Unsaved changes"
                      />
                    )}
                    <ChevronRight className="size-3.5 shrink-0 text-ash rtl:rotate-180" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// A server's page head: how much of it follows the global settings, a way
// back to everything it follows, and to the global page.
export function ServerHeader({
  name,
  own,
  edit,
  onFollow,
}: {
  name: string
  own: number
  edit: boolean
  onFollow: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border bg-card px-4 py-3 text-caption text-muted-foreground max-md:-mx-4 max-md:rounded-none max-md:border-x-0">
      <Globe className="size-4 shrink-0 text-ash" />
      <span className="min-w-0 flex-1">
        <span className="font-medium text-foreground">{name}</span>{" "}
        {own === 0
          ? "follows the global settings. Change a value here to set it for this server only."
          : `follows the global settings except for ${plural(own, "value")} of its own, marked below.`}
      </span>
      <span className="flex flex-wrap items-center gap-1">
        {edit && own > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-brand max-md:h-11"
            onClick={onFollow}
          >
            <RotateCcw />
            Follow global for everything
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="max-md:h-11"
          render={<Link href={GLOBAL_SETTINGS} />}
          nativeButton={false}
        >
          <Globe />
          Global settings
        </Button>
      </span>
    </div>
  )
}
