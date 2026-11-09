"use client"

import { TriangleAlert } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import type { HostConfig, Proxy as ReverseProxy } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useHostPreview } from "../../../api"
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
  upstream: "App address",
  redirect_to: "Send visitors to",
  redirect_code: "Kind of redirect",
  root: "Folder",
  type: "Type",
  "tls.certificate": "Certificate",
  "tls.key": "Key",
  allow: "Who can reach it",
  headers: "Headers",
  paths: "Paths",
  advanced: "Raw directives",
  listen_port: "Port",
  protocol: "Protocol",
  stream_to: "Forward to",
  custom: "Config",
}

export function fieldLabel(field: string) {
  const f = field.replace(/^body\.config\./, "")
  const base = f.replace(/\[\d+\].*$/, "")
  return fieldLabels[f] ?? fieldLabels[base] ?? base
}

export type Preview = ReturnType<typeof useConfigPreview>

// What Morcheh would generate for this site, rendered by the backend as
// the form changes. A hand-written file is left out: this is always the
// generated one. Nothing is saved or sent to the server.
export function useConfigPreview(
  p: ReverseProxy,
  hostId: string | undefined,
  config: HostConfig,
) {
  const generated = useMemo(() => ({ ...config, custom: undefined }), [config])
  const settled = useSettled(generated)
  // The API refuses a site without a domain before it looks at the rest.
  const empty = settled.type !== "stream" && settled.domains.length === 0
  const preview = useHostPreview(p.id, hostId, empty ? null : settled)
  const problems = preview.data?.problems ?? []
  return {
    text: preview.data?.text ?? "",
    problems,
    empty,
    pending: !empty && preview.isPending,
    error: preview.isError && !preview.data ? preview.error.message : "",
    stale:
      !empty &&
      (preview.isFetching ||
        JSON.stringify(settled) !== JSON.stringify(generated)),
    // Ready to copy or to start a hand-written file from.
    ready: !empty && !!preview.data?.text && problems.length === 0,
  }
}

export function PreviewBody({
  preview,
  label,
  className,
}: {
  preview: Preview
  label: string
  className?: string
}) {
  if (preview.empty) {
    return (
      <p className="rounded-lg bg-subtle p-3 text-body-sm text-muted-foreground">
        Add a domain in General to see the config.
      </p>
    )
  }
  if (preview.pending) return <Skeleton className="h-80 rounded-lg" />
  if (preview.error) {
    return <p className="text-body-sm text-destructive">{preview.error}</p>
  }
  if (preview.problems.length > 0) {
    return (
      <div className="flex flex-col gap-2 rounded-lg bg-subtle p-3 text-body-sm">
        <p className="flex items-center gap-2 font-medium">
          <TriangleAlert className="size-4 shrink-0 text-warning" />
          Fix {preview.problems.length === 1 ? "this" : "these"} to see the
          config
        </p>
        <ul className="flex flex-col gap-1 text-muted-foreground">
          {preview.problems.map((x) => (
            <li key={`${x.field}:${x.message}`}>
              <span className="font-medium text-foreground">
                {fieldLabel(x.field)}:
              </span>{" "}
              {x.message}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  return (
    <NginxCode
      value={preview.text}
      label={label}
      className={cn(className, preview.stale && "opacity-70")}
    />
  )
}
