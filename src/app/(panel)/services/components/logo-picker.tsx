"use client"

import { ImageUp, LoaderCircle, RefreshCw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Segmented } from "@/app/(panel)/servers/components/fields"
import { Button } from "@/components/ui/button"
import type { App } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useRefetchIcon } from "../api"
import { AppLogo, appIcons, colorOf } from "./meta"

export type LogoDraft = {
  kind: App["logo_kind"]
  icon: string
  // A picture chosen in this form; it goes up once the service is saved.
  file: File | null
}

export const logoDraft = (app?: App): LogoDraft => ({
  kind: app?.logo_kind ?? "auto",
  icon: app?.logo_icon || "globe",
  file: null,
})

// What the backend takes (appicon.MaxSize).
export const MAX_LOGO = 1 << 20
const accept =
  "image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/x-icon,.ico,.svg"

const kinds = [
  { value: "auto", label: "Site icon" },
  { value: "upload", label: "Upload" },
  { value: "icon", label: "Icon" },
] as const

const iconLabel = (key: string) =>
  key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, " ")

export function LogoPicker({
  app,
  value,
  onChange,
  name,
  color,
  error,
}: {
  // The saved service, when editing.
  app?: App
  value: LogoDraft
  onChange: (next: LogoDraft) => void
  name: string
  color: string
  error?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const refetch = useRefetchIcon()
  const preview = useObjectUrl(value.file)

  // The preview is the saved service with this form's picks on top.
  const shown: App = {
    ...(app ?? emptyApp),
    name: name || "?",
    color,
    logo_kind: value.kind,
    logo_icon: value.icon,
    logo_url:
      value.kind === "auto" || app?.logo_kind === value.kind
        ? app?.logo_url
        : undefined,
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1.5 text-body-sm font-medium">Logo</legend>
      <div className="flex items-center gap-3">
        {value.kind === "upload" && preview ? (
          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
            {/* biome-ignore lint/performance/noImgElement: a local preview of the picked file */}
            <img src={preview} alt="" className="size-[70%] object-contain" />
          </span>
        ) : (
          <AppLogo key={`${shown.logo_kind}-${shown.logo_url}`} app={shown} />
        )}
        <div className="min-w-0 flex-1">
          <Segmented
            label="Logo"
            value={value.kind}
            onChange={(kind) => onChange({ ...value, kind })}
            options={[...kinds]}
          />
        </div>
      </div>

      {value.kind === "auto" && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-caption text-muted-foreground">
            Morche fetches the site's own icon from its address. Until it has
            one, the first letter shows on the service's color.
          </p>
          {app && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={refetch.isPending}
              onClick={() =>
                refetch.mutate(app.id, {
                  onSuccess: () => toast.success("Icon fetched again"),
                  onError: (e) => toast.error(e.message),
                })
              }
            >
              {refetch.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              Fetch again
            </Button>
          )}
        </div>
      )}

      {value.kind === "upload" && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (!file) return
              if (file.size > MAX_LOGO) {
                toast.error("That image is over 1 MB")
                return
              }
              onChange({ ...value, file })
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <ImageUp />
            {value.file || app?.logo_kind === "upload"
              ? "Choose another"
              : "Choose image"}
          </Button>
          <p className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
            {value.file
              ? value.file.name
              : "PNG, JPEG, GIF, WebP, ICO or SVG, up to 1 MB."}
          </p>
        </div>
      )}

      {value.kind === "icon" && (
        <div
          role="radiogroup"
          aria-label="Icon"
          className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5"
        >
          {Object.entries(appIcons).map(([key, Icon]) => {
            const on = value.icon === key
            return (
              // biome-ignore lint/a11y/useSemanticElements: a grid of icon choices; radio inputs can't be styled as tiles
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={iconLabel(key)}
                title={iconLabel(key)}
                onClick={() => onChange({ ...value, icon: key })}
                className={cn(
                  "flex h-11 items-center justify-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-10",
                  on
                    ? cn(colorOf(color).tile, "text-white")
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-5" />
              </button>
            )
          })}
        </div>
      )}

      {error && <p className="text-caption text-destructive">{error}</p>}
    </fieldset>
  )
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return url
}

const emptyApp: App = {
  id: "",
  workspace_id: "",
  name: "",
  address: "",
  note: "",
  color: "slate",
  critical: false,
  logo_kind: "auto",
  logo_icon: "",
  position: 0,
  accounts: [],
  created_at: "",
  updated_at: "",
}
