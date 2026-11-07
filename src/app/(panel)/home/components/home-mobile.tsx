"use client"

import { ChevronRight, CircleCheck, Plus } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { afterClose } from "@/app/(panel)/servers/[id]/components/parts"
import {
  OsTile,
  StatusDot,
  statusMeta,
  timeAgo,
} from "@/app/(panel)/servers/components/meta"
import { serversHref } from "@/app/(panel)/servers/components/use-filters"
import {
  AppLogo,
  appsHref,
  safeHref,
} from "@/app/(panel)/services/components/meta"
import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { JobRow } from "@/components/jobs/job-row"
import { problemStatuses } from "@/components/panel/problems"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import { cn } from "@/lib/utils"
import type { Home } from "../api"
import { HomeEmpty } from "./home-empty"
import { HealthBar, kindItem, summaries, useAddActions } from "./parts"

// Phones: one full-screen list of grouped rows, like a native app's home.
export function HomeMobile({
  home,
  title,
  subtitle,
}: {
  home: Home
  title: string
  subtitle: string
}) {
  return (
    <div className="flex flex-col pb-6">
      <header className="flex items-start gap-2 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <h1 className="text-subheading font-medium">{title}</h1>
          <p className="text-body-sm text-muted-foreground">{subtitle}</p>
        </div>
        <AddButton />
        <HelpButton
          href={guideHref("getting-started", "home")}
          label="Home guide"
          className="-me-3"
        />
      </header>

      <Group title="Status">
        {!home.ready ? (
          <div className="px-4 py-3">
            <Skeleton className="h-10" />
          </div>
        ) : home.issues.length === 0 ? (
          <div className="flex min-h-16 items-center gap-3 px-4 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
              <CircleCheck className="size-5" strokeWidth={1.75} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-body font-medium">All systems normal</span>
              <span className="text-caption text-muted-foreground">
                Nothing needs a look right now.
              </span>
            </span>
          </div>
        ) : (
          <>
            {home.issues.map((issue) => {
              const Icon = kindItem[issue.kind].icon
              return (
                <Row
                  key={issue.key}
                  href={issue.href}
                  icon={
                    <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                  }
                  title={issue.name}
                  subtitle={
                    <span
                      className={
                        issue.tone === "warning"
                          ? "text-warning"
                          : "text-destructive"
                      }
                    >
                      {issue.status}
                      {issue.detail && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {issue.detail}
                        </span>
                      )}
                    </span>
                  }
                />
              )
            })}
            {home.moreBroken > 0 && (
              <Row
                href={serversHref("/servers", {
                  folder: "all",
                  status: [...problemStatuses],
                })}
                title={`And ${home.moreBroken} more ${home.moreBroken === 1 ? "server" : "servers"}`}
              />
            )}
          </>
        )}
      </Group>

      <Group title="Overview">
        {summaries(home).map((s) => {
          const Icon = s.icon
          const known = home.ready && s.total !== undefined
          return (
            <Row
              key={s.key}
              href={s.href}
              icon={
                <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
              }
              title={s.label}
              subtitle={
                <span className="flex flex-col gap-1.5">
                  <span className="truncate">{known ? s.caption : "…"}</span>
                  {s.tally && known && s.tally.total > 0 && (
                    <HealthBar tally={s.tally} className="h-1 max-w-40" />
                  )}
                </span>
              }
              trailing={
                <span className="flex items-center gap-2">
                  {s.alert > 0 && (
                    <span className="rounded-full bg-destructive px-2 text-caption font-medium text-white tabular-nums">
                      {s.alert}
                    </span>
                  )}
                  <span className="text-body text-muted-foreground tabular-nums">
                    {known ? s.total : ""}
                  </span>
                </span>
              }
            />
          )
        })}
      </Group>

      {home.serverTotal === 0 ? (
        <div className="px-4 pt-6">
          <HomeEmpty />
        </div>
      ) : (
        home.servers.items.length > 0 && (
          <Group
            title={home.servers.favorites ? "Favorite servers" : "Servers"}
            more={
              home.servers.favorites
                ? serversHref("/servers", { folder: "favorites" })
                : "/servers"
            }
          >
            {home.servers.items.map((s) => (
              <Row
                key={s.id}
                href={`/servers/${s.id}`}
                icon={<OsTile os={s.os} className="size-10" />}
                title={s.name}
                subtitle={
                  <span className="flex items-center gap-1.5">
                    <StatusDot status={s.status} />
                    {statusMeta[s.status].label}
                    {s.status !== "online" && (
                      <span className="text-ash">
                        · seen {timeAgo(s.last_seen_at).toLowerCase()}
                      </span>
                    )}
                  </span>
                }
              />
            ))}
          </Group>
        )
      )}

      {home.apps.length > 0 && (
        <section className="pt-6">
          <GroupTitle title="Services" more="/services" />
          <ul className="no-scrollbar flex gap-1 overflow-x-auto px-2 pb-1">
            {home.apps.map((app) => {
              const href = safeHref(app.address)
              const body = (
                <>
                  <AppLogo app={app} size={40} className="rounded-xl" />
                  <span className="w-full truncate text-center text-caption">
                    {app.name}
                  </span>
                </>
              )
              const cls =
                "flex w-18 flex-col items-center gap-1.5 rounded-lg p-2 active:bg-muted"
              return (
                <li key={app.id} className="shrink-0">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cls}
                    >
                      {body}
                    </a>
                  ) : (
                    <Link
                      href={appsHref("/services", { q: app.name })}
                      className={cls}
                    >
                      {body}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {home.jobs.length > 0 && (
        <Group title="Tasks" more="/tasks">
          {home.jobs.slice(0, 4).map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </Group>
      )}

      {home.upcoming.length > 0 && (
        <Group title="Coming up" more="/cronjobs">
          {home.upcoming.map((c) => (
            <Row
              key={c.id}
              href={`/cronjobs/${c.id}`}
              title={c.name}
              subtitle={`Runs ${timeAgo(c.next_run_at).toLowerCase()}`}
            />
          ))}
        </Group>
      )}
    </div>
  )
}

function GroupTitle({ title, more }: { title: string; more?: string }) {
  return (
    <div className="flex items-center justify-between px-4 pb-2">
      <h2 className="font-label text-caption tracking-label text-ash uppercase">
        {title}
      </h2>
      {more && (
        <Link
          href={more}
          className="-my-3 -me-2 flex min-h-11 items-center px-2 text-body-sm text-brand"
        >
          See all
        </Link>
      )}
    </div>
  )
}

function Group({
  title,
  more,
  children,
}: {
  title: string
  more?: string
  children: ReactNode
}) {
  return (
    <section className="pt-6">
      <GroupTitle title={title} more={more} />
      <div className="divide-y divide-border border-y border-border">
        {children}
      </div>
    </section>
  )
}

function Row({
  href,
  icon,
  title,
  subtitle,
  trailing,
}: {
  href: string
  icon?: ReactNode
  title: string
  subtitle?: ReactNode
  trailing?: ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex min-h-16 items-center gap-3 px-4 py-3 active:bg-muted"
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium">{title}</span>
        {subtitle && (
          <span className="truncate text-caption text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
      {trailing}
      <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
    </Link>
  )
}

function AddButton() {
  const actions = useAddActions()
  const [open, setOpen] = useOpen("home-add")
  if (actions.length === 0) return null
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Add"
        className={cn("-my-2 size-11")}
        onClick={() => setOpen(true)}
      >
        <Plus className="size-5" />
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Add to this workspace"
      >
        {actions.map((a) => (
          <SheetAction
            key={a.label}
            icon={<Plus />}
            label={a.label}
            onClick={() => afterClose(setOpen, a.run)}
          />
        ))}
      </BottomSheet>
    </>
  )
}
