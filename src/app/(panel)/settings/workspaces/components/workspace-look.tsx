"use client"

import { ImageUp } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Segmented } from "@/app/(panel)/servers/components/fields"
import {
  type AppColor,
  appColorKeys,
  appIcons,
  ColorPicker,
  colorOf,
} from "@/components/palette"
import { WorkspaceAvatar } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import type { PanelWorkspace } from "@/lib/services"
import { cn } from "@/lib/utils"

type Kind = PanelWorkspace["logo_kind"]

export type LookDraft = {
  kind: Kind
  icon: string
  color: AppColor
  // A picture chosen in this form; it goes up once the workspace is saved.
  file: File | null
}

const isColor = (c?: string): c is AppColor =>
  appColorKeys.includes(c as AppColor)

export const lookDraft = (w?: PanelWorkspace): LookDraft => ({
  kind: w?.logo_kind ?? "letter",
  icon: w?.logo_icon || "boxes",
  color: isColor(w?.color) ? w.color : "indigo",
  file: null,
})

// What goes in the save body. An upload sets its own kind once it's stored,
// so until then the workspace keeps what it had.
export function lookBody(v: LookDraft, saved?: PanelWorkspace) {
  const upload = v.kind === "upload"
  return {
    color: v.color,
    logo_kind: upload
      ? saved?.logo_kind === "upload"
        ? ("upload" as const)
        : (saved?.logo_kind ?? "letter")
      : v.kind,
    logo_icon: v.kind === "icon" ? v.icon : undefined,
  }
}

export const lookError = (v: LookDraft, saved?: PanelWorkspace) =>
  v.kind === "upload" && !v.file && saved?.logo_kind !== "upload"
    ? "Choose an image to upload."
    : undefined

// What the backend takes (appicon.MaxSize).
const MAX_LOGO = 1 << 20
const accept =
  "image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/x-icon,.ico,.svg"

const kinds: { value: Kind; label: string }[] = [
  { value: "letter", label: "Letter" },
  { value: "icon", label: "Icon" },
  { value: "upload", label: "Picture" },
]

const iconLabel = (key: string) =>
  key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, " ")

export function WorkspaceLookPicker({
  workspace,
  value,
  onChange,
  name,
  error,
}: {
  // The saved workspace, when editing.
  workspace?: PanelWorkspace
  value: LookDraft
  onChange: (next: LookDraft) => void
  name: string
  error?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const preview = useObjectUrl(value.file)
  const hasSaved = workspace?.logo_kind === "upload" && workspace.logo_url

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1.5 text-body-sm font-medium">Logo</legend>
      <div className="flex items-center gap-3">
        {value.kind === "upload" && preview ? (
          <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-card ring-1 ring-border ring-inset">
            {/* biome-ignore lint/performance/noImgElement: a local preview of the picked file */}
            <img src={preview} alt="" className="size-full object-contain" />
          </span>
        ) : (
          <WorkspaceAvatar
            workspace={{
              name: name || "?",
              color: value.color,
              logo_kind:
                value.kind === "upload" && !hasSaved ? "letter" : value.kind,
              logo_icon: value.icon,
              logo_url: workspace?.logo_url,
            }}
            className="size-11 rounded-lg text-subheading"
          />
        )}
        <div className="min-w-0 flex-1">
          <Segmented
            label="Logo"
            value={value.kind}
            onChange={(kind) => onChange({ ...value, kind })}
            options={kinds}
          />
        </div>
      </div>

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
            className="max-md:h-11"
            onClick={() => fileRef.current?.click()}
          >
            <ImageUp />
            {value.file || hasSaved ? "Choose another" : "Choose image"}
          </Button>
          <p className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
            {value.file
              ? value.file.name
              : "PNG, JPEG, GIF, WebP, ICO or SVG, up to 1 MB. Square works best."}
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
                    ? cn(colorOf(value.color).tile, "text-white")
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-5" />
              </button>
            )
          })}
        </div>
      )}

      {value.kind !== "upload" && (
        <ColorPicker
          value={value.color}
          onChange={(color) => onChange({ ...value, color })}
        />
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
