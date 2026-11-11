"use client"

import { Check, LoaderCircle, PackageSearch, X } from "lucide-react"
import { useState } from "react"

import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { useDebounced } from "@/hooks/useDebounced"
import type { PackageMatch } from "@/lib/services"
import { cn } from "@/lib/utils"
import { SearchBox } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { usePackageSearch } from "../api"
import { shortVersion } from "./meta"

// Find packages in the server's repositories and pick one or more; the
// review that follows shows what else they bring along.
export function InstallLayer({
  open,
  onOpenChange,
  onReview,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReview: (names: string[]) => void
}) {
  const { server, phone } = useServerPage()
  const [q, setQ] = useState("")
  const term = useDebounced(q, 300)
  const search = usePackageSearch(server.id, term)
  const [picked, setPicked] = useState<string[]>([])

  const matches = term.trim().length >= 2 ? (search.data?.matches ?? []) : []
  const typed = q.trim()
  // A name typed exactly can be picked even when the search ranks it low.
  const exact =
    /^[a-z0-9][a-z0-9+.:_@-]*$/i.test(typed) &&
    !matches.some((m) => m.name === typed)

  function toggle(name: string) {
    setPicked((p) =>
      p.includes(name) ? p.filter((n) => n !== name) : [...p, name],
    )
  }

  const footer = (
    <div
      className={cn(
        "flex gap-2",
        phone ? "flex-col-reverse" : "w-full items-center justify-end",
      )}
    >
      <Button
        variant="outline"
        size={phone ? "lg" : "default"}
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </Button>
      <Button
        size={phone ? "lg" : "default"}
        disabled={picked.length === 0}
        onClick={() => onReview(picked)}
      >
        {picked.length ? `Review (${picked.length})` : "Review"}
      </Button>
    </div>
  )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Install packages"
      description="Search the server's repositories. You'll see everything that comes with them before anything is installed."
      footer={footer}
      className="sm:max-w-xl"
    >
      <div className="flex flex-col gap-3">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Package name, like htop or nginx"
          label="Search packages"
          className="md:w-full"
        />

        {picked.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {picked.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => toggle(n)}
                aria-label={`Unpick ${n}`}
                className="flex h-8 items-center gap-1 rounded-full bg-brand-soft ps-3 pe-2 text-body-sm text-brand-strong max-md:h-9"
              >
                {n}
                <X className="size-3.5" />
              </button>
            ))}
          </div>
        )}

        <div className="min-h-64">
          {typed.length < 2 ? (
            <Hint
              icon={PackageSearch}
              text="Type at least two letters. Results include packages already installed."
            />
          ) : search.isPending || (search.isFetching && !matches.length) ? (
            <p className="flex items-center gap-2 py-6 text-body-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Searching…
            </p>
          ) : search.error ? (
            <Hint icon={PackageSearch} text={search.error.message} />
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {exact && (
                <Row
                  match={{ name: typed, summary: "Install by this exact name" }}
                  picked={picked.includes(typed)}
                  onToggle={() => toggle(typed)}
                />
              )}
              {matches.map((m) => (
                <Row
                  key={m.name}
                  match={m}
                  picked={picked.includes(m.name)}
                  onToggle={() => toggle(m.name)}
                />
              ))}
              {!matches.length && !exact && (
                <li className="p-4 text-body-sm text-muted-foreground">
                  Nothing found. Check the spelling, or refresh the package
                  lists first.
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </ResponsiveDialog>
  )
}

function Row({
  match: m,
  picked,
  onToggle,
}: {
  match: PackageMatch
  picked: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={picked}
        onClick={onToggle}
        className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-start outline-none hover:bg-subtle focus-visible:bg-subtle active:bg-muted"
      >
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-md border",
            picked
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input",
          )}
        >
          {picked && <Check className="size-3.5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{m.name}</span>
            {m.installed && (
              <span className="shrink-0 rounded-full bg-muted px-2 text-caption text-muted-foreground">
                Installed
              </span>
            )}
          </span>
          {m.summary && (
            <span className="block truncate text-caption text-muted-foreground">
              {m.summary}
            </span>
          )}
        </span>
        {(m.version || m.installed) && (
          <span className="hidden shrink-0 font-mono text-caption text-ash sm:block">
            {shortVersion(m.version || m.installed, 20)}
          </span>
        )}
      </button>
    </li>
  )
}

function Hint({ icon: Icon, text }: { icon: typeof X; text: string }) {
  return (
    <p className="flex flex-col items-center gap-3 px-6 py-10 text-center text-body-sm text-muted-foreground">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-muted">
        <Icon className="size-5" />
      </span>
      {text}
    </p>
  )
}
