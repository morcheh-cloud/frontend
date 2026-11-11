"use client"

import {
  ArrowUpCircle,
  Download,
  Ellipsis,
  ExternalLink,
  FileText,
  FolderOpen,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode, useState } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { filesHref } from "@/components/files/file-manager"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatSize } from "@/lib/format"
import type { InstalledPackage, PackageInfo } from "@/lib/services"
import { cn } from "@/lib/utils"
import { ItemMenu, Segmented, SheetItems } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { ago, fullTime } from "../../users/components/meta"
import { usePackageInfo } from "../api"
import { usePackageMenu, usePackagesActions } from "./packages-actions"

export const detailsTabs = ["overview", "needs", "files", "versions"] as const
export type DetailsTab = (typeof detailsTabs)[number]

// Everything about one package: what it is, what it needs and what needs
// it, the files it put on disk and the versions the repositories offer.
export function PackageDetails({
  open,
  onOpenChange,
  name,
  tab: startTab,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  tab: DetailsTab
}) {
  const { server, phone } = useServerPage()
  const a = usePackagesActions()
  const info = usePackageInfo(server.id, name)
  const [tab, setTab] = useState<DetailsTab>(startTab)
  const pkg = a.overview.packages.find((p) => p.name === name)
  const i = info.data

  const subtitle = pkg
    ? [pkg.version, pkg.arch].filter(Boolean).join(" · ")
    : i?.installed
      ? i.version
      : "Not installed"

  const tabs = (
    <Segmented
      label="Details"
      items={[
        { value: "overview", label: "Overview" },
        {
          value: "needs",
          label: i ? `Needs · ${i.depends.length}` : "Needs",
        },
        ...(i?.installed || pkg
          ? [
              {
                value: "files" as const,
                label: i ? `Files · ${i.files.length}` : "Files",
              },
            ]
          : []),
        ...(a.overview.capabilities.versions
          ? [{ value: "versions" as const, label: "Versions" }]
          : []),
      ]}
      value={tab}
      onChange={setTab}
    />
  )

  let body: ReactNode
  if (info.isPending) {
    body = (
      <p className="flex items-center gap-2 py-8 text-body-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        Reading the package…
      </p>
    )
  } else if (info.error || !i) {
    body = (
      <p className="flex gap-2 py-8 text-body-sm text-muted-foreground">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
        {info.error?.message ?? "Couldn't read this package."}
      </p>
    )
  } else if (tab === "needs") body = <Needs info={i} />
  else if (tab === "files") body = <Files info={i} />
  else if (tab === "versions") body = <Versions info={i} />
  else body = <Overview info={i} pkg={pkg} />

  if (phone) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={name}
        full
        header={
          <div className="px-6 pt-1 pb-3">
            <p className="truncate text-subheading font-medium">{name}</p>
            <p className="truncate text-body-sm text-muted-foreground">
              {subtitle}
            </p>
            <div className="-mx-6 mt-3 flex [scrollbar-width:none] overflow-x-auto px-6">
              {tabs}
            </div>
          </div>
        }
      >
        <div className="px-2 pb-4">{body}</div>
        {pkg ? (
          <PhoneActions pkg={pkg} onOpenChange={onOpenChange} />
        ) : (
          i && !i.installed && <InstallButton name={name} phone />
        )}
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{name}</SheetTitle>
          <SheetDescription render={<div />}>{subtitle}</SheetDescription>
          <div className="mt-3">{tabs}</div>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{body}</div>
        <div className="flex items-center gap-2 border-t border-border px-6 py-4">
          {pkg ? (
            <DesktopActions pkg={pkg} />
          ) : (
            i && !i.installed && <InstallButton name={name} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DesktopActions({ pkg }: { pkg: InstalledPackage }) {
  const a = usePackagesActions()
  const menu = usePackageMenu(pkg).map((g) =>
    g.filter((item) => item.key !== "details"),
  )
  const upgrade = menu[0].find((item) => item.key === "upgrade")
  // a.review closes this layer itself before the review opens.
  const rest = menu.map((g) => g.filter((item) => item.key !== "upgrade"))
  return (
    <>
      {upgrade && (
        <Button
          disabled={upgrade.disabled}
          onClick={() => a.review({ action: "upgrade", names: [pkg.name] })}
        >
          <ArrowUpCircle />
          Upgrade
        </Button>
      )}
      <ItemMenu
        groups={rest}
        label={`More actions for ${pkg.name}`}
        trigger={
          <Button variant="outline" size="icon" aria-label="More actions">
            <Ellipsis />
          </Button>
        }
      />
      {a.locked && (
        <span className="ms-auto text-caption text-muted-foreground">
          A package change is running
        </span>
      )}
    </>
  )
}

function PhoneActions({
  pkg,
  onOpenChange,
}: {
  pkg: InstalledPackage
  onOpenChange: (open: boolean) => void
}) {
  // Run in place: marks stay here, and a.review closes this sheet itself.
  const menu = usePackageMenu(pkg).map((g) =>
    g
      .filter((item) => item.key !== "details")
      .map((item) => ({ ...item, stay: true })),
  )
  return (
    <div className="border-t border-border pt-2">
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </div>
  )
}

function InstallButton({ name, phone }: { name: string; phone?: boolean }) {
  const a = usePackagesActions()
  if (!a.canChange) return null
  return (
    <Button
      size={phone ? "lg" : "default"}
      className={cn(phone && "mb-2 w-full")}
      disabled={a.locked}
      onClick={() => a.review({ action: "install", names: [name] })}
    >
      <Download />
      Install
    </Button>
  )
}

// ---- Tabs ----

function Overview({
  info: i,
  pkg,
}: {
  info: PackageInfo
  pkg: InstalledPackage | undefined
}) {
  const facts: { label: string; value: ReactNode; mono?: boolean }[] = []
  if (i.installed) {
    facts.push({ label: "Installed", value: i.version, mono: true })
  }
  if (i.latest && i.latest !== i.version) {
    facts.push({
      label: i.installed ? "Update" : "Available",
      value: (
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-caption">{i.latest}</span>
          {pkg?.security && <Tag tone="warn">Security</Tag>}
        </span>
      ),
    })
  }
  if (pkg) {
    const how = pkg.held
      ? "Held at this version"
      : pkg.auto
        ? "As a dependency of another package"
        : "By hand"
    facts.push({ label: "Installed", value: how })
    if (pkg.removable) {
      facts.push({ label: "Needed", value: "No: nothing uses it any more" })
    }
    if (pkg.changed_at) {
      facts.push({
        label: "Last changed",
        value: (
          <span title={fullTime(pkg.changed_at)}>{ago(pkg.changed_at)}</span>
        ),
      })
    }
  }
  if (i.size > 0) facts.push({ label: "Size", value: formatSize(i.size) })
  if (i.section) facts.push({ label: "Section", value: i.section })
  if (i.repo) facts.push({ label: "Repository", value: i.repo, mono: true })
  if (i.arch) facts.push({ label: "Architecture", value: i.arch })
  if (i.license) facts.push({ label: "License", value: i.license })
  if (i.maintainer) facts.push({ label: "Maintainer", value: i.maintainer })
  if (i.homepage) {
    facts.push({
      label: "Homepage",
      value: /^https?:\/\//.test(i.homepage) ? (
        <a
          href={i.homepage}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 break-all text-brand hover:underline"
        >
          {i.homepage}
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      ) : (
        i.homepage
      ),
    })
  }

  return (
    <div className="flex flex-col gap-4 text-body-sm">
      {i.summary && <p className="text-body font-medium">{i.summary}</p>}
      {i.description && i.description !== i.summary && (
        <Description text={i.description} />
      )}
      <dl className="divide-y divide-border border-y border-border">
        {facts.map((f, n) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: labels can repeat
            key={n}
            className="flex gap-4 py-2.5 max-md:flex-col max-md:gap-0.5"
          >
            <dt className="w-32 shrink-0 text-muted-foreground">{f.label}</dt>
            <dd
              className={cn(
                "min-w-0 break-words",
                f.mono && "font-mono text-caption break-all",
              )}
            >
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Needs({ info: i }: { info: PackageInfo }) {
  return (
    <div className="flex flex-col gap-5 text-body-sm">
      <NameList
        title="Needs"
        hint="Packages this one depends on."
        names={i.depends}
        empty="Nothing: it stands on its own."
      />
      {i.installed && (
        <NameList
          title="Needed by"
          hint="Installed packages that would go with it if it were removed."
          names={i.required_by}
          empty="No installed package needs it."
        />
      )}
    </div>
  )
}

function NameList({
  title,
  hint,
  names,
  empty,
}: {
  title: string
  hint: string
  names: string[]
  empty: string
}) {
  const a = usePackagesActions()
  const installed = new Set(a.overview.packages.map((p) => p.name))
  return (
    <section>
      <h3 className="font-medium">
        {title} · {names.length}
      </h3>
      <p className="text-caption text-muted-foreground">{hint}</p>
      {names.length === 0 ? (
        <p className="mt-2 text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {names.map((n) => {
            // "libc6 (>= 2.34)" or "a | b": open the first real name.
            const bare = n.split(/[\s|(]/)[0]
            const known = installed.has(bare)
            return (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => a.details(bare)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 font-mono text-caption outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 max-md:py-2",
                    known
                      ? "border-border text-foreground"
                      : "border-dashed border-mist text-muted-foreground",
                  )}
                  title={known ? "Installed" : "Not installed"}
                >
                  {n}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function Files({ info: i }: { info: PackageInfo }) {
  const { server } = useServerPage()
  const [q, setQ] = useState("")
  const t = q.trim().toLowerCase()
  const files = t ? i.files.filter((f) => f.toLowerCase().includes(t)) : i.files
  if (i.files.length === 0) {
    return (
      <p className="py-6 text-body-sm text-muted-foreground">
        This package lists no files.
      </p>
    )
  }
  const base = `/servers/${server.id}/files`
  return (
    <div className="flex flex-col gap-3 text-body-sm">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter files"
        aria-label="Filter files"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm"
      />
      <ul className="divide-y divide-border rounded-xl border border-border">
        {files.slice(0, 500).map((f) => {
          const dir = f.slice(0, f.lastIndexOf("/")) || "/"
          return (
            <li key={f}>
              <Link
                href={`${base}${filesHref({ path: dir })}`}
                title="Open its folder in Files"
                className="group flex min-h-10 items-center gap-2 px-3 py-1.5 font-mono text-caption break-all outline-none hover:bg-subtle focus-visible:bg-subtle max-md:min-h-11"
              >
                <FileText className="size-3.5 shrink-0 text-ash" />
                <span className="min-w-0 flex-1">{f}</span>
                <FolderOpen className="size-3.5 shrink-0 text-ash opacity-0 group-hover:opacity-100 max-md:hidden" />
              </Link>
            </li>
          )
        })}
      </ul>
      {(files.length > 500 || i.files_truncated) && (
        <p className="text-caption text-muted-foreground">
          {files.length > 500
            ? `Showing 500 of ${files.length}. Filter to find the rest.`
            : "The list was cut short: the package has more files."}
        </p>
      )}
    </div>
  )
}

function Versions({ info: i }: { info: PackageInfo }) {
  const a = usePackagesActions()
  if (i.versions.length === 0) {
    return (
      <p className="py-6 text-body-sm text-muted-foreground">
        The repositories offer no version of it.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-3 text-body-sm">
      <p className="text-muted-foreground">
        Every version the server's repositories offer, newest first. Installing
        an older one is a downgrade: hold it afterwards so upgrades don't bring
        the new one back.
      </p>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {i.versions.map((v) => (
          <li
            key={v.version}
            className="flex min-h-12 items-center gap-3 px-3 py-2"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate font-mono text-caption">
                  {v.version}
                </span>
                {v.installed && <Tag>Installed</Tag>}
              </span>
              {v.repo && (
                <span className="block truncate text-caption text-ash">
                  {v.repo}
                </span>
              )}
            </span>
            {!v.installed && a.canChange && (
              <Button
                variant="outline"
                size="sm"
                className="max-md:h-10"
                disabled={a.locked}
                onClick={() =>
                  a.review({
                    action: "install",
                    names: [i.name],
                    version: v.version,
                  })
                }
              >
                Install this
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Tag({
  children,
  tone,
}: {
  children: ReactNode
  tone?: "warn" | "brand"
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 text-caption whitespace-nowrap",
        tone === "warn"
          ? "bg-warning/10 text-warning"
          : tone === "brand"
            ? "bg-brand-soft text-brand-strong"
            : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  )
}

// Package descriptions come hard-wrapped at ~70 columns: join the lines of a
// paragraph again; bullet lines ("* ", "- ") become a list.
function Description({ text }: { text: string }) {
  const parts: { bullet: boolean; text: string }[] = []
  for (const para of text.split(/\n\s*\n/)) {
    let joinable = false
    for (const raw of para.split("\n")) {
      const line = raw.trim()
      if (!line || line === ".") continue
      const bullet = /^[*•-]\s+/.test(line)
      const last = parts.at(-1)
      if (!bullet && joinable && last && !/^\s{2,}/.test(raw)) {
        last.text += ` ${line}`
      } else {
        parts.push({ bullet, text: line.replace(/^[*•-]\s+/, "") })
      }
      joinable = true
    }
  }
  // Consecutive bullets go into one list.
  const blocks: (string | string[])[] = []
  for (const part of parts) {
    const last = blocks.at(-1)
    if (!part.bullet) blocks.push(part.text)
    else if (Array.isArray(last)) last.push(part.text)
    else blocks.push([part.text])
  }
  return (
    <div className="flex flex-col gap-2 text-muted-foreground">
      {blocks.map((b, n) =>
        Array.isArray(b) ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: static text
          <ul key={n} className="flex list-disc flex-col gap-1 ps-5">
            {b.map((l, k) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static text
              <li key={k}>{l}</li>
            ))}
          </ul>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: static text
          <p key={n}>{b}</p>
        ),
      )}
    </div>
  )
}
