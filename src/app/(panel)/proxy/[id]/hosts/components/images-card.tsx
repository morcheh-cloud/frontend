"use client"

import { Image as ImageIcon } from "lucide-react"

import {
  FieldError,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { Input } from "@/components/ui/input"
import type { ProxyInspection, Proxy as ReverseProxy } from "@/lib/services"
import { type Draft, domainList, type Errors, typeUses } from "./draft"
import { EditorCard as Card } from "./editor-card"
import { ModuleInstall } from "./module-install"

// The Advanced tab's image resizing: a picture asked for with ?w= and/or
// ?h= comes back at that size (nginx's image filter), only for the sizes
// listed so nobody can make the server resize to every size there is.

const defaultSizes = "160, 320, 640, 960, 1280, 1920"

const modes = [
  { value: "resize", label: "Keep proportions" },
  { value: "crop", label: "Crop to size" },
] as const

export function ImagesCard({
  proxy: p,
  draft: d,
  set,
  errors,
  phone,
  inspection,
}: {
  proxy: ReverseProxy
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
  inspection?: ProxyInspection
}) {
  if (!typeUses(d.type).images) return null
  const missing = !!inspection && !inspection.image_filter
  const domain = domainList(d.domains)[0] ?? "example.com"
  const first =
    d.imagesSizes
      .split(/[\s,]+/)
      .map(Number)
      .find((n) => n > 0) ?? 640
  const scheme = d.tls ? "https" : "http"

  return (
    <Card
      title="Resize images"
      hint="Serve smaller pictures without making them by hand: add ?w= (width) and/or ?h= (height) to an image's address. Works for jpg, png, gif and webp."
      phone={phone}
    >
      <div className="flex flex-col gap-4">
        {missing && (
          <ModuleInstall
            proxy={p}
            module="image-filter"
            icon={<ImageIcon />}
            busy="Adding image resizing…"
            button="Add image resizing"
            warn={d.images}
          >
            <p className="font-medium text-foreground">
              {d.images
                ? "Image resizing isn't on this proxy yet, so this site can't be saved with it on."
                : "Image resizing isn't on this proxy yet."}
            </p>
            <p>
              Adding it installs {p.kind_label}'s image filter module from the
              server's packages and reloads {p.kind_label}.
            </p>
          </ModuleInstall>
        )}
        <div>
          <ToggleRow
            id="images-enabled"
            label="Resize images on the fly"
            hint="Images asked for without ?w= or ?h= come back untouched."
            checked={d.images}
            onChange={(v) => set({ images: v })}
          />
          <FieldError text={errors["images.enabled"]} />
        </div>
        {d.images && (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-body-sm font-medium">
                When both are set
              </span>
              <div className="flex">
                <Segmented
                  label="When both width and height are set"
                  items={modes}
                  value={d.imagesMode}
                  onChange={(v) => set({ imagesMode: v })}
                />
              </div>
              <p className="text-caption text-muted-foreground">
                {d.imagesMode === "crop"
                  ? "Fills the exact size and cuts off what sticks out, good for thumbnails."
                  : "Fits the picture inside the size without cutting anything."}
              </p>
              <FieldError text={errors["images.mode"]} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="Allowed sizes"
                hint={`Pixels, separated by commas. Any other size gets the original. Empty = ${defaultSizes}.`}
                error={errors["images.sizes"]}
                className="md:col-span-3"
              >
                {(f) => (
                  <Input
                    {...f}
                    inputMode="numeric"
                    placeholder={defaultSizes}
                    value={d.imagesSizes}
                    onChange={(e) => set({ imagesSizes: e.target.value })}
                  />
                )}
              </Field>
              <Field
                label="Quality"
                hint="JPEG and WebP, 1 to 100. Empty = 80."
                error={errors["images.quality"]}
              >
                {(f) => (
                  <Input
                    {...f}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    placeholder="80"
                    value={d.imagesQuality}
                    onChange={(e) => set({ imagesQuality: e.target.value })}
                  />
                )}
              </Field>
              <Field
                label="Largest original (MB)"
                hint="Bigger pictures come back untouched. Empty = 10."
                error={errors["images.max_size_mb"]}
              >
                {(f) => (
                  <Input
                    {...f}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    placeholder="10"
                    value={d.imagesMaxMb}
                    onChange={(e) => set({ imagesMaxMb: e.target.value })}
                  />
                )}
              </Field>
            </div>
            <div className="rounded-lg bg-subtle px-3 py-2.5 text-caption text-muted-foreground">
              <p className="font-medium text-foreground">For example</p>
              <p className="mt-1 font-mono break-all">
                {scheme}://{domain}/photo.jpg?w={first}
              </p>
              <p className="mt-0.5 font-mono break-all">
                {scheme}://{domain}/photo.jpg?w={first}&h={first}
              </p>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
