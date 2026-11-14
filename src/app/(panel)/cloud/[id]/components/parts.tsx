"use client"

import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"

import { Tag } from "@/app/(panel)/dns/components/parts"
import { Skeleton } from "@/components/ui/skeleton"
import type { CloudServer } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCloudActions } from "../../components/cloud-actions"
import { StatusDot } from "../../components/meta"
import type { Model } from "./model"

// Small pieces every tab of an account's page shares.

// What OsTile needs, from the provider's distro name ("Ubuntu" → ubuntu).
export const osOf = (s: CloudServer) => ({
  id: s.os.toLowerCase().split(" ")[0] ?? "",
  name: s.os || s.image,
  version: s.os_version,
  arch: "",
  family: "",
  kernel: "",
})

export const plural = (n: number, word: string) =>
  `${n} ${word}${n === 1 ? "" : "s"}`

export const dateText = (iso: string) =>
  new Date(iso).toLocaleDateString("en", { dateStyle: "medium" })

export const zonesText = (zones: string[]) =>
  zones.length <= 3
    ? zones.join(", ")
    : `${zones.slice(0, 2).join(", ")} and ${zones.length - 2} more zones`

export function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusDot dot={dot} />
      {label}
    </span>
  )
}

export function ShareBar({
  share,
  className,
  tone = "bg-brand",
}: {
  share: number
  className?: string
  tone?: string
}) {
  return (
    <span
      className={cn(
        "block h-1.5 overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <span
        className={cn("block h-full rounded-full", tone)}
        style={{
          width: `${Math.round(Math.min(1, Math.max(0, share)) * 100)}%`,
        }}
      />
    </span>
  )
}

export function Panel({
  icon,
  title,
  count,
  action,
  children,
  className,
}: {
  icon: ReactNode
  title: string
  count?: number
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <header className="flex items-center gap-2.5 border-b border-border px-5 py-3.5">
        <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
          {icon}
        </span>
        <h2 className="text-body-sm font-medium">{title}</h2>
        {count !== undefined && <Tag>{count}</Tag>}
        {action && <div className="ms-auto">{action}</div>}
      </header>
      {children}
    </section>
  )
}

export function Row({
  icon,
  title,
  tags,
  sub,
  end,
}: {
  icon?: ReactNode
  title: ReactNode
  tags?: ReactNode
  sub?: ReactNode
  end?: ReactNode
}) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      {icon && (
        <span className="text-ash [&_svg]:size-4" aria-hidden>
          {icon}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="flex min-w-0 items-center gap-2 text-body-sm">
          <span dir="auto" className="truncate">
            {title}
          </span>
          {tags}
        </p>
        {sub && (
          <div className="truncate text-caption text-muted-foreground">
            {sub}
          </div>
        )}
      </div>
      {end && <div className="shrink-0 text-end text-caption">{end}</div>}
    </li>
  )
}

export function Fact({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <dt className="text-ash">{label}</dt>
      <dd className="truncate text-foreground">{children}</dd>
    </div>
  )
}

// A server's name that opens its details, when it's one of ours.
export function useServerLink(m: Model) {
  const actions = useCloudActions()
  return (id: string | undefined, name: string | undefined) => {
    const s = id ? m.servers?.find((x) => x.id === id) : undefined
    if (!s) return name ?? null
    return (
      <button
        type="button"
        onClick={() => actions.details(s)}
        className="rounded-sm text-foreground outline-none hover:text-brand-strong hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {name || s.name}
      </button>
    )
  }
}

// One toolbar row above a tab's content (desktop): search, filters, a
// caption at the end.
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>
}

export function Count({ n }: { n: number | undefined }) {
  if (n === undefined) return null
  return <span className="ms-1.5 text-caption text-ash tabular-nums">{n}</span>
}

export function GridSkeleton({
  n = 3,
  h = "h-44",
}: {
  n?: number
  h?: string
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: n }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholders
        <Skeleton key={i} className={cn("rounded-2xl", h)} />
      ))}
    </div>
  )
}

// A desktop "nothing here" box.
export function Blank({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode
  title: string
  body: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-mist px-6 py-14 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">
        {icon}
      </span>
      <p className="text-body-sm font-medium">{title}</p>
      <div className="max-w-md text-caption text-muted-foreground">{body}</div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// ── Phone ────────────────────────────────────────────────────────────────

export function PhoneGroup({
  title,
  count,
  children,
  className,
}: {
  title: string
  count?: number
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("mt-7", className)}>
      <h2 className="flex items-center justify-between px-4 pb-2 text-caption font-medium text-muted-foreground">
        {title}
        {count !== undefined && (
          <span className="font-normal tabular-nums">{count}</span>
        )}
      </h2>
      <ul className="divide-y divide-border border-y border-border bg-card">
        {children}
      </ul>
    </section>
  )
}

export function PhoneRow({
  icon,
  title,
  sub,
  end,
  onClick,
}: {
  icon: ReactNode
  title: ReactNode
  sub?: ReactNode
  end?: ReactNode
  onClick?: () => void
}) {
  const body = (
    <>
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4"
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-body">{title}</span>
        {sub && (
          <span className="truncate text-caption text-muted-foreground">
            {sub}
          </span>
        )}
      </span>
      {end && (
        <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
          {end}
        </span>
      )}
      {onClick && (
        <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
      )}
    </>
  )
  return (
    <li>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-start outline-none active:bg-muted"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-h-14 items-center gap-3 px-4 py-2.5">
          {body}
        </div>
      )}
    </li>
  )
}

export function PhoneSkeleton() {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="size-10 rounded-lg" />
      <span className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </span>
    </li>
  )
}

export function PhoneEmpty({ children }: { children: ReactNode }) {
  return (
    <li className="px-4 py-5 text-body-sm text-muted-foreground">{children}</li>
  )
}

const chipClass =
  "flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 text-body-sm whitespace-nowrap text-muted-foreground outline-none active:bg-muted aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:font-medium aria-pressed:text-background"

// A row of filter chips that scrolls sideways (phone).
export function PhoneChips<T extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string
  items: readonly { value: T; label: string; n?: number }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="no-scrollbar flex gap-2 overflow-x-auto px-4">
      <legend className="sr-only">{label}</legend>
      {items.map((i) => (
        <button
          key={i.value}
          type="button"
          aria-pressed={value === i.value}
          onClick={() => onChange(i.value)}
          className={chipClass}
        >
          {i.label}
          {i.n !== undefined && (
            <span className="tabular-nums opacity-70">{i.n}</span>
          )}
        </button>
      ))}
    </fieldset>
  )
}
