"use client"

import { Copy, FileCode, TriangleAlert } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { HostConfig, Proxy as ReverseProxy } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useHostPreview } from "../../../api"
import { copyText } from "../../../components/proxy-actions"
import { NginxCode } from "./nginx-code"

// The text changes on every key press: render it once typing pauses.
function useSettled<T>(value: T, delay = 400) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return settled
}

const fieldLabels: Record<string, string> = {
  domains: "Domains",
  upstream: "Goes to",
  redirect_to: "Redirect to",
  redirect_code: "Redirect code",
  root: "Folder",
  type: "Type",
  "tls.certificate": "Certificate",
  "tls.key": "Key",
  allow: "Only from",
  headers: "Headers",
  paths: "Paths",
  advanced: "Raw directives",
}

function fieldLabel(field: string) {
  const f = field.replace(/^body\.config\./, "")
  const base = f.replace(/\[\d+\].*$/, "")
  return fieldLabels[f] ?? fieldLabels[base] ?? base
}

// What Morcheh would write for this site, rendered by the backend as the
// form changes. Nothing is saved or sent to the server.
export function ConfigPreview({
  proxy: p,
  hostId,
  config,
  className,
  bare,
}: {
  proxy: ReverseProxy
  hostId?: string
  config: HostConfig
  className?: string
  // Without its own card (inside a sheet).
  bare?: boolean
}) {
  const settled = useSettled(config)
  // The API refuses a site without a domain before it looks at the rest.
  const empty = settled.domains.length === 0
  const preview = useHostPreview(p.id, hostId, empty ? null : settled)
  const label = p.capabilities.config_label || `${p.kind_label} config`
  const text = preview.data?.text ?? ""
  const problems = preview.data?.problems ?? []
  const stale = !empty && (preview.isFetching || settled !== config)

  return (
    <section
      aria-label={label}
      className={cn(
        "flex min-w-0 flex-col gap-3",
        !bare && "rounded-2xl border border-border p-4",
        className,
      )}
    >
      {!bare && (
        <div className="flex items-center gap-2">
          <FileCode className="size-4 shrink-0 text-ash" />
          <h2 className="min-w-0 flex-1 truncate text-body-sm font-medium">
            {label}
          </h2>
          <span
            className={cn(
              "text-caption text-ash transition-opacity",
              !stale && "opacity-0",
            )}
          >
            Updating…
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Copy the config"
            disabled={empty || !text || problems.length > 0}
            onClick={() => copyText(text, "Config")}
          >
            <Copy />
          </Button>
        </div>
      )}
      {empty ? (
        <p className="rounded-lg bg-subtle p-3 text-body-sm text-muted-foreground">
          Add a domain to see the config.
        </p>
      ) : preview.isPending ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : preview.isError && !preview.data ? (
        <p className="text-body-sm text-destructive">{preview.error.message}</p>
      ) : problems.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg bg-subtle p-3 text-body-sm">
          <p className="flex items-center gap-2 font-medium">
            <TriangleAlert className="size-4 shrink-0 text-warning" />
            Fix {problems.length === 1 ? "this" : "these"} to see the config
          </p>
          <ul className="flex flex-col gap-1 text-muted-foreground">
            {problems.map((x) => (
              <li key={`${x.field}:${x.message}`}>
                <span className="font-medium text-foreground">
                  {fieldLabel(x.field)}:
                </span>{" "}
                {x.message}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <NginxCode
          value={text}
          label={label}
          className={cn("max-h-[70svh] overflow-auto", stale && "opacity-70")}
        />
      )}
      <p className="text-caption text-ash">
        Written to its own file in /etc/{p.kind}/morcheh/, tested before it's
        loaded. If the test fails, nothing changes on the server.
      </p>
    </section>
  )
}
