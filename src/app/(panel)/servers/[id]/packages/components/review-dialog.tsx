"use client"

import { ArrowRight, CircleAlert, Info, LoaderCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { useJobActions } from "@/components/jobs/jobs-provider"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatSize } from "@/lib/format"
import type { PackageActionBody, PackageChange } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useServerPage } from "../../components/server-page"
import { usePackageAction, usePreview } from "../api"
import { actionText, changeMeta, destructive, isVital } from "./meta"
import { usePackagesActions } from "./packages-actions"

const order: PackageChange["action"][] = [
  "install",
  "upgrade",
  "reinstall",
  "downgrade",
  "remove",
  "purge",
]

// Shows what a change would really do (the manager's own dry run) before it
// runs: extra packages pulled in, ones removed with it, problems that stop it.
export function ReviewDialog({
  open,
  onOpenChange,
  body,
  onChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  body: PackageActionBody
  onChange: (body: PackageActionBody) => void
}) {
  const { server, phone } = useServerPage()
  const a = usePackagesActions()
  const jobs = useJobActions()
  const preview = usePreview(server.id)
  const run = usePackageAction(server.id)
  const [typed, setTyped] = useState("")

  const canPreview = a.overview.capabilities.preview && body.action !== "clean"
  const { mutate } = preview
  useEffect(() => {
    if (canPreview) mutate(body)
  }, [canPreview, body, mutate])

  const p = preview.data
  const changes = p?.changes ?? []
  const removed = changes.filter(
    (c) => c.action === "remove" || c.action === "purge",
  )
  const vital = removed.filter((c) => isVital(c.name))
  const problems = p?.problems ?? []
  const waiting = [...(p?.deferred ?? []), ...(p?.kept_back ?? [])]
  const text = actionText(body)
  const danger = destructive(body) || removed.length > 0
  const nothing = canPreview && p && changes.length === 0 && !problems.length

  const blocked =
    run.isPending ||
    a.locked ||
    (canPreview && (preview.isPending || !p)) ||
    problems.length > 0 ||
    !!nothing ||
    (vital.length > 0 && typed.trim() !== server.name)

  function confirm() {
    run.mutate(body, {
      onSuccess: (job) => {
        jobs.track(job)
        onOpenChange(false)
      },
      onError: (e) => toast.error(e.message),
    })
  }

  const footer = (
    <div
      className={cn(
        "flex gap-2",
        phone ? "flex-col-reverse" : "w-full items-center justify-end",
      )}
    >
      {!phone && a.locked && (
        <span className="me-auto text-caption text-muted-foreground">
          Another package change is running
        </span>
      )}
      <Button
        variant="outline"
        size={phone ? "lg" : "default"}
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </Button>
      <Button
        variant={danger ? "destructive" : "default"}
        size={phone ? "lg" : "default"}
        disabled={blocked}
        onClick={confirm}
      >
        {run.isPending && <LoaderCircle className="animate-spin" />}
        {text.button}
      </Button>
    </div>
  )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={text.title}
      footer={footer}
      className="sm:max-w-xl"
    >
      <div className="flex flex-col gap-4 text-body-sm">
        {body.action === "clean" && (
          <p className="text-muted-foreground">
            Deletes the downloaded package files kept by the manager
            {a.overview.cache_bytes > 0 &&
              ` (${formatSize(a.overview.cache_bytes)})`}
            . Installed packages are not touched; the files are downloaded again
            when needed.
          </p>
        )}
        {body.action === "upgrade-all" && body.mode === "full" && (
          <p className="text-muted-foreground">
            A full upgrade may also install new packages or remove old ones to
            finish an upgrade. Read the list before going on.
          </p>
        )}
        {!a.overview.capabilities.preview && body.action !== "clean" && (
          <p className="flex gap-2 rounded-xl bg-subtle p-3 text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-ash" />
            {`This package manager can't show what will change beforehand. The change runs as it is.`}
          </p>
        )}

        {canPreview && preview.isPending && (
          <p className="flex items-center gap-2 py-6 text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Asking the package manager what would change…
          </p>
        )}
        {canPreview && preview.error && (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-border p-3">
            <p className="flex gap-2">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              {`Couldn't work out the changes: ${preview.error.message}`}
            </p>
            <Button variant="outline" size="sm" onClick={() => mutate(body)}>
              Try again
            </Button>
          </div>
        )}

        {problems.length > 0 && (
          <div className="rounded-xl border border-destructive/40 p-3">
            <p className="flex items-center gap-2 font-medium text-destructive">
              <CircleAlert className="size-4" />
              The package manager refuses this
            </p>
            <ul className="mt-2 flex flex-col gap-1 font-mono text-caption break-words text-muted-foreground">
              {problems.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        {nothing && (
          <p className="py-4 text-muted-foreground">
            Nothing to change: everything asked for is already in place.
          </p>
        )}

        {changes.length > 0 && <Changes changes={changes} />}

        {waiting.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl bg-subtle p-3">
            <p className="flex gap-2">
              <Info className="mt-0.5 size-4 shrink-0 text-ash" />
              <span>
                <span className="font-medium">
                  {waiting.length}{" "}
                  {waiting.length === 1 ? "update waits" : "updates wait"}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  ({waiting.slice(0, 6).join(", ")}
                  {waiting.length > 6 && "…"}).{" "}
                  {p?.deferred.length
                    ? "Ubuntu rolls some updates out in phases, or they need new packages, so a normal upgrade leaves them for later."
                    : "They need new packages or removals, so a normal upgrade leaves them."}
                </span>
              </span>
            </p>
            {body.action === "upgrade-all" && (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() =>
                  onChange({
                    action: "upgrade",
                    names: [
                      ...changes
                        .filter((c) => c.action === "upgrade")
                        .map((c) => c.name),
                      ...waiting,
                    ],
                  })
                }
              >
                Upgrade them too
              </Button>
            )}
          </div>
        )}

        {vital.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl border border-destructive/40 p-3">
            <p className="font-medium text-destructive">
              {`This removes ${vital.map((c) => c.name).join(", ")}`}
            </p>
            <p className="text-muted-foreground">
              The server may stop booting, or Morche may lose its SSH access.
              Type the server's name to go on.
            </p>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={server.name}
              aria-label="Server name"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        )}

        {phone && a.locked && (
          <p className="text-caption text-muted-foreground">
            Another package change is running. Wait for it to end.
          </p>
        )}
      </div>
    </ResponsiveDialog>
  )
}

function Changes({ changes }: { changes: PackageChange[] }) {
  const groups = order
    .map((action) => ({
      action,
      items: changes.filter((c) => c.action === action),
    }))
    .filter((g) => g.items.length > 0)
  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => {
        const meta = changeMeta[g.action]
        return (
          <section key={g.action}>
            <h3
              className={cn(
                "mb-1 font-label text-caption tracking-label uppercase",
                meta.tone === "danger" ? "text-destructive" : "text-ash",
              )}
            >
              {meta.label} · {g.items.length}
            </h3>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {g.items.map((c) => (
                <li
                  key={c.name}
                  className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2"
                >
                  <span className="min-w-0 truncate font-medium">{c.name}</span>
                  <span className="ms-auto flex min-w-0 items-center gap-1.5 font-mono text-caption text-muted-foreground">
                    {c.from && <span className="truncate">{c.from}</span>}
                    {c.from && c.to && (
                      <ArrowRight className="size-3 shrink-0 text-ash" />
                    )}
                    {c.to && (
                      <span className="truncate text-foreground">{c.to}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
