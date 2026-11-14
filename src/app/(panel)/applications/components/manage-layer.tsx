"use client"

import { Copy, Ellipsis, ExternalLink, Eye, LoaderCircle } from "lucide-react"
import { toast } from "sonner"

import { Callout } from "@/app/(panel)/ansible/components/run-layer"
import {
  ItemMenu,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { useServer } from "@/app/(panel)/servers/api"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { Markdown } from "@/components/markdown"
import { Button } from "@/components/ui/button"
import { SheetTitle } from "@/components/ui/sheet"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import type { Recipe, SoftwareInstall } from "@/lib/services"
import { cn } from "@/lib/utils"
import { installBusy, useInstall, useRevealSecrets } from "../api"
import { useInstallMenu } from "./install-menu"
import { InstallStatus, kindLabels, linkHref, RecipeIcon } from "./meta"
import { Facts, Layer, LayerBody, LayerFooter, Section } from "./parts"
import { useSoftwareCan } from "./permissions"

// One application on one server: what it is, its links and settings, and
// every action on it.
export function ManageLayer({
  open,
  onOpenChange,
  install,
  recipe,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  install: SoftwareInstall | null
  recipe: Recipe | null
}) {
  // The fresh copy: actions and runs change it while the layer is open.
  const fresh = useInstall(open ? install?.id : undefined)
  const i = fresh.data ?? install
  const title = i ? `${i.name} on ${i.server_name}` : "Application"
  return (
    <Layer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      header={
        i && (
          <div className="flex items-center gap-3">
            <RecipeIcon recipe={recipe ?? { kind: i.kind }} size="sm" />
            <div className="min-w-0">
              <SheetTitle className="truncate text-body">{title}</SheetTitle>
              <InstallStatus install={i} className="text-caption" />
            </div>
          </div>
        )
      }
    >
      {i && (
        <ManageBody
          key={i.id}
          install={i}
          recipe={recipe}
          gone={fresh.error instanceof ApiError && fresh.error.status === 404}
        />
      )}
    </Layer>
  )
}

function ManageBody({
  install: i,
  recipe,
  gone,
}: {
  install: SoftwareInstall
  recipe: Recipe | null
  gone: boolean
}) {
  const phone = useIsPhone()

  return (
    <>
      {gone ? (
        <LayerBody>
          <Callout title="Morche no longer tracks this application">
            It was uninstalled or forgotten.
          </Callout>
        </LayerBody>
      ) : (
        <>
          <Overview install={i} recipe={recipe} />
          <Actions install={i} phone={!!phone} />
        </>
      )}
    </>
  )
}

function Actions({
  install: i,
  phone,
}: {
  install: SoftwareInstall
  phone: boolean
}) {
  const groups = useInstallMenu(i, { details: false })
  const [moreOpen, setMoreOpen] = useOpen("software-manage-more")
  const all = groups.flat()
  if (all.length === 0) return null
  // The one action in sight: Update when there is one, else the first.
  const main = all.find((x) => x.key === "update" && i.update_available) ?? null
  const rest = groups
    .map((g) => g.filter((x) => x !== main))
    .filter((g) => g.length > 0)

  return (
    <LayerFooter>
      {phone ? (
        <>
          {main && (
            <Button
              size="lg"
              className="flex-1"
              disabled={main.disabled}
              onClick={main.onSelect}
            >
              {main.icon}
              {main.label}
            </Button>
          )}
          <Button
            size="lg"
            variant="outline"
            className={cn(!main && "flex-1")}
            onClick={() => setMoreOpen(true)}
          >
            <Ellipsis />
            {main ? "More" : "Actions"}
          </Button>
          <BottomSheet
            open={moreOpen}
            onOpenChange={setMoreOpen}
            title={i.name}
          >
            <SheetItems groups={rest} onOpenChange={setMoreOpen} />
          </BottomSheet>
        </>
      ) : (
        <>
          {main && (
            <Button disabled={main.disabled} onClick={main.onSelect}>
              {main.icon}
              {main.label}
            </Button>
          )}
          {rest
            .flat()
            .filter((x) => x.key === "update")
            .map((x) => (
              <Button
                key={x.key}
                variant="outline"
                disabled={x.disabled}
                onClick={x.onSelect}
              >
                {x.icon}
                {x.label}
              </Button>
            ))}
          <span className="ms-auto" />
          <ItemMenu
            label="More actions"
            groups={rest.map((g) => g.filter((x) => x.key !== "update"))}
          />
        </>
      )}
    </LayerFooter>
  )
}

function Overview({
  install: i,
  recipe,
}: {
  install: SoftwareInstall
  recipe: Recipe | null
}) {
  const server = useServer(i.server_id)
  const host = server.data?.host ?? ""
  const links = (recipe?.links ?? [])
    .map((l) => ({
      label: l.label,
      href: linkHref(l, host, i.params, recipe ?? undefined),
    }))
    .filter((l) => l.href)
  const shownParams = Object.entries(i.params ?? {}).filter(
    ([k]) => !i.secret_params.includes(k),
  )
  const paramLabel = (name: string) =>
    recipe?.params?.find((p) => p.name === name)?.label ?? name

  return (
    <LayerBody>
      {i.error && (
        <Callout
          warn
          title={i.status === "failed" ? "The last run failed" : "Problem"}
        >
          <span className="font-mono text-caption whitespace-pre-wrap">
            {i.error}
          </span>
        </Callout>
      )}
      {installBusy(i) && (
        <p className="flex items-center gap-2 text-body-sm text-brand">
          <LoaderCircle className="size-4 animate-spin" />A run is working on
          it.
        </p>
      )}

      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <Button
              key={l.href}
              variant="outline"
              nativeButton={false}
              render={
                <a href={l.href} target="_blank" rel="noopener noreferrer" />
              }
            >
              <ExternalLink />
              {l.label}
            </Button>
          ))}
        </div>
      )}

      <Section title="About">
        <Facts
          items={[
            { label: "Server", value: i.server_name },
            { label: "Kind", value: kindLabels[i.kind] },
            { label: "Version", value: i.version || "—" },
            ...(i.latest && i.latest !== i.version
              ? [{ label: "Newest", value: i.latest }]
              : []),
            {
              label: "Installed",
              value:
                i.origin === "found"
                  ? "Found on the server"
                  : i.installed_at
                    ? `${timeAgo(i.installed_at)} by Morche`
                    : "By Morche",
            },
            ...(i.checked_at
              ? [{ label: "Checked", value: timeAgo(i.checked_at) }]
              : []),
          ]}
        />
      </Section>

      {(shownParams.length > 0 || i.secret_params.length > 0) && (
        <Section title="Settings" aside="as installed">
          {shownParams.length > 0 && (
            <Facts
              items={shownParams.map(([k, v]) => ({
                label: paramLabel(k),
                value: v || "—",
              }))}
            />
          )}
          {i.secret_params.length > 0 && (
            <Secrets install={i} label={paramLabel} />
          )}
        </Section>
      )}

      {recipe?.notes && (
        <Section title="Notes">
          <Markdown>{recipe.notes}</Markdown>
        </Section>
      )}
    </LayerBody>
  )
}

// Saved passwords stay hidden until an Owner asks; each ask is logged.
function Secrets({
  install: i,
  label,
}: {
  install: SoftwareInstall
  label: (name: string) => string
}) {
  const can = useSoftwareCan(i.workspace_id)
  const reveal = useRevealSecrets()
  const values = reveal.data?.values
  const copy = (v: string) =>
    navigator.clipboard
      ?.writeText(v)
      .then(() => toast.success("Copied"))
      .catch(() => toast.error("Couldn't copy: select it instead."))

  return (
    <div className="flex flex-col gap-2">
      <ul className="divide-y divide-border rounded-2xl border border-border">
        {i.secret_params.map((k) => (
          <li
            key={k}
            className="flex min-h-12 items-center gap-3 px-4 py-2 text-body-sm"
          >
            <span className="w-32 shrink-0 text-muted-foreground">
              {label(k)}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-caption select-all">
              {values ? values[k] || "—" : "••••••••••"}
            </span>
            {values?.[k] && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Copy ${label(k)}`}
                onClick={() => copy(values[k])}
              >
                <Copy />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {!values && can.reveal(i) && (
        <Button
          variant="outline"
          className="self-start"
          disabled={reveal.isPending}
          onClick={() =>
            reveal.mutate(i.id, { onError: (e) => toast.error(e.message) })
          }
        >
          <Eye />
          {reveal.isPending ? "Showing…" : "Show passwords"}
        </Button>
      )}
      {!values && !can.reveal(i) && (
        <p className="text-caption text-ash">
          Only an Owner of this server can see them.
        </p>
      )}
    </div>
  )
}
