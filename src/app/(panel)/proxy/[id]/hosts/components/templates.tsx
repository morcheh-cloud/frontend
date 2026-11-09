"use client"

import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { type Draft, freshPath } from "./draft"

// Settings that suit a well-known app behind the proxy. Only what the app
// needs is changed; the address is filled only when it's still empty.
type Template = {
  key: string
  name: string
  // Where the app usually listens on its own server.
  upstream: string
  note: string
  patch: () => Partial<Draft>
}

export const templates: Template[] = [
  {
    key: "wordpress",
    name: "WordPress",
    upstream: "http://127.0.0.1:8080",
    note: "64 MB uploads, 2 min for slow admin pages, xmlrpc.php blocked, hidden files and backups refused.",
    patch: () => ({
      websockets: false,
      maxBody: "64",
      timeout: "120",
      hDotfiles: true,
      hBackups: true,
      hScanners: true,
      hProbes: false,
      paths: [
        freshPath({
          match: "exact",
          path: "/xmlrpc.php",
          action: "deny",
          denyStatus: 403,
        }),
      ],
    }),
  },
  {
    key: "nextjs",
    name: "Next.js",
    upstream: "http://127.0.0.1:3000",
    note: "WebSockets on, gzip, browsers keep built files for 30 days, hidden files refused.",
    patch: () => ({
      websockets: true,
      gzip: true,
      assetDays: "30",
      hDotfiles: true,
    }),
  },
  {
    key: "grafana",
    name: "Grafana",
    upstream: "http://127.0.0.1:3000",
    note: "WebSockets on for live dashboards, the site's name passed on, 5 min for heavy queries.",
    patch: () => ({
      websockets: true,
      preserveHost: true,
      timeout: "300",
      hDotfiles: true,
    }),
  },
  {
    key: "portainer",
    name: "Portainer",
    upstream: "https://127.0.0.1:9443",
    note: "Its own https with a self-signed certificate, WebSockets for consoles, 1 GB uploads for images, 10 min timeout.",
    patch: () => ({
      websockets: true,
      upVerify: false,
      maxBody: "1024",
      timeout: "600",
    }),
  },
  {
    key: "n8n",
    name: "n8n",
    upstream: "http://127.0.0.1:5678",
    note: "WebSockets and no buffering for its live editor, 16 MB payloads, 1 h for long workflows.",
    patch: () => ({
      websockets: true,
      noBuffering: true,
      cache: false,
      maxBody: "16",
      timeout: "3600",
    }),
  },
]

// A row of app buttons on a new proxy site.
export function TemplatePicker({
  draft,
  set,
  picked,
  onPick,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  picked: string
  onPick: (key: string) => void
}) {
  const chosen = templates.find((t) => t.key === picked)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption text-muted-foreground">Start from:</span>
        {templates.map((t) => (
          <Button
            key={t.key}
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={t.key === picked}
            className={cn(
              "h-9 md:h-8",
              t.key === picked && "border-brand text-brand-strong",
            )}
            onClick={() => {
              set({
                ...t.patch(),
                ...(draft.upstream.trim() ? {} : { upstream: t.upstream }),
              })
              onPick(t.key)
            }}
          >
            {t.key === picked && <Check />}
            {t.name}
          </Button>
        ))}
      </div>
      {chosen && (
        <p className="text-caption text-muted-foreground">
          {chosen.note} Check the address: it's where {chosen.name} usually
          listens.
        </p>
      )}
    </div>
  )
}
