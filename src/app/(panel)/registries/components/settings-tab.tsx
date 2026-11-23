"use client"

import {
  LoaderCircle,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  FieldError,
  Section,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type ApiError, fieldErrors } from "@/lib/api"
import type { PackageRegistry, RegistrySettings } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useUpdateRegistry } from "../api"
import { useRegistryCan } from "./permissions"
import { useRegistryActions } from "./registry-actions"

type Draft = {
  name: string
  note: string
  settings: RegistrySettings
  scopes: string
}

const draftOf = (r: PackageRegistry): Draft => ({
  name: r.name,
  note: r.note,
  settings: { ...r.settings },
  scopes: (r.settings.scopes ?? []).join(", "),
})

export function SettingsTab({
  r,
  phone,
}: {
  r: PackageRegistry
  phone: boolean
}) {
  const can = useRegistryCan()
  const a = useRegistryActions()
  const save = useUpdateRegistry(r.id)
  const [draft, setDraft] = useState<Draft>(() => draftOf(r))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const editable = can(r, "engineer")
  const harbor = r.kind === "harbor"
  const set = (p: Partial<RegistrySettings>) =>
    setDraft((d) => ({ ...d, settings: { ...d.settings, ...p } }))
  const base = draftOf(r)
  const dirty = JSON.stringify(draft) !== JSON.stringify(base)

  const submit = () => {
    const settings = { ...draft.settings }
    if (!harbor)
      settings.scopes = draft.scopes
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    save.mutate(
      { name: draft.name.trim(), note: draft.note.trim(), settings },
      {
        onSuccess: (x) => {
          setDraft(draftOf(x))
          setErrors({})
          toast.success(
            harbor ? "Saved and applied" : "Saved: Verdaccio restarted with it",
          )
        },
        onError: (e) => {
          const f = fieldErrors(e)
          setErrors(
            Object.fromEntries(
              Object.entries(f).map(([k, v]) => [
                k.replace(/^settings\./, ""),
                v,
              ]),
            ),
          )
          toast.error((e as ApiError).message)
        },
      },
    )
  }

  return (
    <div className="grid gap-6 pb-24">
      <fieldset
        disabled={!editable || r.state !== "ready"}
        className="grid gap-6"
      >
        <Section title="Name" hint="How it shows in Morche." phone={phone}>
          <div className="grid gap-2">
            <Label htmlFor="rs-name">Name</Label>
            <Input
              id="rs-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              maxLength={100}
            />
            <FieldError text={errors.name} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rs-note">Note</Label>
            <Textarea
              id="rs-note"
              rows={2}
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
          </div>
        </Section>

        <Section
          title={harbor ? "Pulling" : "Installing"}
          hint={
            harbor
              ? "Applied through Harbor's API at once."
              : "Verdaccio restarts with them (a few seconds)."
          }
          phone={phone}
        >
          <ToggleRow
            id="rs-mirror"
            label={harbor ? "Docker Hub cache" : "npmjs mirror"}
            hint={
              harbor
                ? draft.settings.mirror
                  ? `Pull ${r.address}/${draft.settings.mirror_project || "dockerhub"}/library/nginx.`
                  : "Turning it off keeps an existing cache project; delete it from Repositories if you want it gone."
                : draft.settings.mirror
                  ? "Packages not published here are fetched from the mirror and kept."
                  : "Only packages published here can be installed."
            }
            checked={draft.settings.mirror}
            onChange={(v) => set({ mirror: v })}
          />
          {harbor && draft.settings.mirror && (
            <div className="grid gap-2 sm:max-w-80">
              <Label htmlFor="rs-mp">Cache project</Label>
              <Input
                id="rs-mp"
                value={draft.settings.mirror_project ?? ""}
                onChange={(e) =>
                  set({ mirror_project: e.target.value.toLowerCase() })
                }
                autoCapitalize="none"
                spellCheck={false}
              />
              <FieldError text={errors.mirror_project} />
            </div>
          )}
          {!harbor && draft.settings.mirror && (
            <div className="grid gap-2">
              <Label htmlFor="rs-up">Fetch from</Label>
              <Input
                id="rs-up"
                value={draft.settings.upstream ?? ""}
                onChange={(e) => set({ upstream: e.target.value })}
                inputMode="url"
                spellCheck={false}
              />
              <FieldError text={errors.upstream} />
            </div>
          )}
          {!harbor && (
            <div className="grid gap-2">
              <Label htmlFor="rs-scopes">Private scopes</Label>
              <Input
                id="rs-scopes"
                value={draft.scopes}
                onChange={(e) => setDraft({ ...draft, scopes: e.target.value })}
                placeholder="@company"
                spellCheck={false}
              />
              <FieldError text={errors.scopes ?? errors["scopes[0]"]} />
              <p className="text-caption text-muted-foreground">
                Never fetched from the mirror.
              </p>
            </div>
          )}
          <ToggleRow
            id="rs-public"
            label={harbor ? "Anyone can pull" : "Anyone can install"}
            hint={
              draft.settings.public
                ? "No login needed to read."
                : "Reading needs a login too."
            }
            checked={draft.settings.public}
            onChange={(v) => set({ public: v })}
          />
          {harbor && (
            <ToggleRow
              id="rs-cleanup"
              label="Weekly cleanup"
              hint="Sunday 03:00: frees the space of deleted and untagged images. Turning it off here leaves Harbor's schedule as it is."
              checked={!!draft.settings.cleanup}
              onChange={(v) => set({ cleanup: v })}
            />
          )}
        </Section>
      </fieldset>

      {harbor && editable && (
        <Section
          title="Scanner"
          hint="Changing it means writing Harbor's files again."
          phone={phone}
        >
          <div className="flex flex-wrap items-center gap-3">
            <ShieldCheck
              className={cn(
                "size-5",
                r.settings.scanner ? "text-success" : "text-ash",
              )}
            />
            <p className="min-w-0 flex-1 text-body-sm">
              Trivy is{" "}
              {r.settings.scanner
                ? "on: scan images from Harbor's page."
                : "off."}
            </p>
            <Button
              variant="outline"
              onClick={() => a.redeploy(r, !r.settings.scanner)}
              disabled={r.state !== "ready"}
            >
              <RotateCcw />
              {r.settings.scanner
                ? "Deploy again without it"
                : "Deploy again with it"}
            </Button>
          </div>
          <p className="text-caption text-muted-foreground">
            Images and settings stay. Harbor is down for a minute or two.
          </p>
        </Section>
      )}

      {can(r, "owner") && (
        <Section title="Remove" hint="Takes it off the server." phone={phone}>
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-body-sm text-muted-foreground">
              Stops it and removes its site and logins. You choose whether its
              data stays on the server.
            </p>
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => a.remove(r)}
            >
              <Trash2 />
              Remove {r.name}…
            </Button>
          </div>
        </Section>
      )}

      {dirty && editable && (
        <div
          className={cn(
            "sticky z-10 flex items-center gap-3 border border-border bg-background/95 p-3 shadow-md backdrop-blur",
            phone
              ? "bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] mx-0 border-x-0"
              : "bottom-4 rounded-2xl",
          )}
        >
          <p className="min-w-0 flex-1 text-body-sm">Unsaved changes</p>
          <Button variant="ghost" onClick={() => setDraft(base)}>
            Undo
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Save />
            )}
            Save
          </Button>
        </div>
      )}
    </div>
  )
}
