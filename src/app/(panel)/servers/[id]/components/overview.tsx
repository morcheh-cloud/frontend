"use client"

import {
  Activity,
  ChevronRight,
  KeySquare,
  Pencil,
  Star,
  Terminal,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import {
  ServerProxyLinks,
  ServerProxyRows,
  useServerProxyList,
} from "@/app/(panel)/proxy/components/server-proxy"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  address,
  OsTile,
  StatusDot,
  sshCommand,
  statusMeta,
} from "../../components/meta"
import { useServerActions } from "../../components/server-actions"
import { useServerStats } from "../api"
import {
  NotesCardAction,
  NotesCardBody,
  PinnedNoteRows,
  useHasPinnedNotes,
} from "../notes/components/pinned-notes"
import { Copyable, type Fact, useFacts } from "./facts"
import { DesktopResources, DiskList, MobileResources } from "./resources"
import {
  type Section,
  sectionHref,
  sectionMin,
  sectionsFor,
  settingsSection,
} from "./sections"
import { useServerPage } from "./server-page"
import { StatusBanner } from "./status-banner"

export function Overview() {
  return useServerPage().phone ? <MobileOverview /> : <DesktopOverview />
}

// Desktop: a card per group, two or three across as the content widens.
function DesktopOverview() {
  const { server, checking, can } = useServerPage()
  const actions = useServerActions()
  const facts = useFacts(server, checking)
  const proxies = useServerProxyList(server.id)

  return (
    <div className="@container">
      <DesktopResources />
      <div className="grid gap-4 @3xl:grid-cols-2 @7xl:grid-cols-3">
        <DisksCard />
        <Card
          title="Health"
          action={
            can("operator") && (
              <Button
                variant="ghost"
                size="sm"
                disabled={checking}
                onClick={() => actions.check(server)}
              >
                <Activity />
                {checking ? "Checking…" : "Check now"}
              </Button>
            )
          }
        >
          <Facts facts={facts.health} />
          {server.status_message && server.status !== "online" && (
            <p className="mt-4 rounded-lg bg-subtle px-3 py-2 text-body-sm text-muted-foreground">
              {server.status_message}
            </p>
          )}
        </Card>
        <Card title="System">
          <Facts facts={facts.system} />
          <ServerProxyLinks proxies={proxies} />
        </Card>
        <Card
          title="Connection"
          action={
            can("owner") && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => actions.showCredentials(server)}
                >
                  <KeySquare />
                  Credentials
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => actions.editServer(server)}
                >
                  <Pencil />
                  Edit
                </Button>
              </>
            )
          }
        >
          <Facts facts={facts.connection} />
          <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-subtle py-1 ps-3 pe-1">
            <Copyable text={sshCommand(server)} label="SSH command">
              <span className="flex items-center gap-2 py-1 font-mono text-caption">
                <Terminal className="size-3.5 shrink-0 text-ash" />
                {sshCommand(server)}
              </span>
            </Copyable>
          </div>
        </Card>
        <Card title="Organization">
          <Facts facts={facts.organization} />
        </Card>
        <Card title="Notes" action={<NotesCardAction />}>
          <NotesCardBody />
        </Card>
      </div>
    </div>
  )
}

function DisksCard() {
  const { server } = useServerPage()
  const disks = useServerStats(server).stats?.disks ?? []
  if (disks.length < 2) return null
  return (
    <Card title="Disks">
      <DiskList disks={disks} />
    </Card>
  )
}

function Card({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex h-7 items-center justify-between gap-2">
        <h2 className="text-body font-medium">{title}</h2>
        {action && <div className="-me-2 flex gap-1">{action}</div>}
      </div>
      {children}
    </section>
  )
}

function Facts({ facts }: { facts: Fact[] }) {
  return (
    <dl className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-body-sm">
      {facts.map((fact) => (
        <div key={fact.label} className="contents">
          <dt className="text-muted-foreground">{fact.label}</dt>
          <dd className={cn("min-w-0", fact.muted && "text-ash")}>
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

// Phone: who the server is and its quick actions on top, then plain grouped
// lists (details, then every section), like a native settings screen.
function MobileOverview() {
  const { server, checking, level, can } = useServerPage()
  const actions = useServerActions()
  const facts = useFacts(server, checking)
  const stats = useServerStats(server)
  const hasNotes = useHasPinnedNotes()
  const proxies = useServerProxyList(server.id)

  return (
    <div className="pb-6">
      <div className="flex flex-col items-center px-4 pt-6 pb-5 text-center">
        <OsTile os={server.os} className="size-16 rounded-2xl text-body" />
        <h2 className="mt-3 max-w-full truncate text-subheading font-medium">
          {server.name}
        </h2>
        <p className="max-w-full truncate font-mono text-body-sm text-muted-foreground">
          {address(server)}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-body-sm">
          <StatusDot status={server.status} checking={checking} />
          {checking ? "Checking…" : statusMeta[server.status].label}
          {!checking &&
            server.status === "online" &&
            server.latency_ms != null && (
              <span className="text-muted-foreground">
                · {server.latency_ms} ms
              </span>
            )}
        </p>
      </div>

      <div className="grid auto-cols-fr grid-flow-col gap-2 px-4 pb-5">
        {can("operator") && (
          <QuickAction
            icon={<Activity />}
            label={checking ? "Checking" : "Check"}
            disabled={checking}
            onClick={() => actions.check(server)}
          />
        )}
        <QuickAction
          icon={<Terminal />}
          label="SSH"
          onClick={() => actions.copySsh(server)}
        />
        {can("owner") && (
          <QuickAction
            icon={<Pencil />}
            label="Edit"
            onClick={() => actions.editServer(server)}
          />
        )}
        {can("operator") && (
          <QuickAction
            icon={<Star className={cn(server.favorite && "fill-brand")} />}
            label={server.favorite ? "Starred" : "Star"}
            pressed={server.favorite}
            onClick={() => actions.toggleFavorite(server)}
          />
        )}
      </div>

      <StatusBanner />

      {stats.enabled && (
        <Group title="Resources">
          <MobileResources />
        </Group>
      )}
      <Group title="Health">
        <FactRows facts={facts.health.slice(1)} />
      </Group>
      <Group title="System">
        <FactRows facts={facts.system} />
      </Group>
      <Group title="Connection">
        <FactRows facts={facts.connection} />
        {can("owner") && (
          <li>
            <button
              type="button"
              onClick={() => actions.showCredentials(server)}
              className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-start outline-none active:bg-muted"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
                <KeySquare className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-body">
                Show SSH credentials
              </span>
              <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
            </button>
          </li>
        )}
      </Group>
      <Group title="Organization">
        <FactRows facts={facts.organization} />
      </Group>
      {proxies.length > 0 && (
        <Group title="Reverse proxy">
          <ServerProxyRows proxies={proxies} />
        </Group>
      )}
      {hasNotes && (
        <Group title="Notes">
          <PinnedNoteRows />
        </Group>
      )}

      {sectionsFor(level).map((group) => {
        const sections = group.sections.filter((s) => s.slug)
        if (sections.length === 0) return null
        return (
          <Group key={group.label} title={group.label ?? ""}>
            {sections.map((section) => (
              <SectionRow key={section.slug} section={section} />
            ))}
          </Group>
        )
      })}
      {can(sectionMin(settingsSection)) && (
        <Group>
          <SectionRow section={settingsSection} />
        </Group>
      )}
    </div>
  )
}

function QuickAction({
  icon,
  label,
  pressed,
  disabled,
  onClick,
}: {
  icon: ReactNode
  label: string
  pressed?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-2xl bg-subtle text-caption font-medium text-brand outline-none active:bg-muted disabled:opacity-50 [&_svg]:size-5"
    >
      {icon}
      {label}
    </button>
  )
}

function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="pt-6">
      {title && (
        <h2 className="px-4 pb-2 font-label text-caption tracking-label text-ash uppercase">
          {title}
        </h2>
      )}
      <ul className="divide-y divide-border border-y border-border">
        {children}
      </ul>
    </section>
  )
}

function FactRows({ facts }: { facts: Fact[] }) {
  return facts.map((fact) => (
    <li
      key={fact.label}
      className="flex min-h-11 items-center justify-between gap-4 px-4 py-2.5 text-body"
    >
      <span className="shrink-0 text-muted-foreground">{fact.label}</span>
      <span
        className={cn(
          "min-w-0 truncate text-end",
          fact.muted && "text-body-sm text-ash",
        )}
      >
        {fact.value}
      </span>
    </li>
  ))
}

function SectionRow({ section }: { section: Section }) {
  const { server } = useServerPage()
  const Icon = section.icon
  return (
    <li>
      <Link
        href={sectionHref(server.id, section.slug)}
        className="flex min-h-12 items-center gap-3 px-4 py-2 outline-none active:bg-muted"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-body">
          {section.label}
        </span>
        {!section.ready && (
          <span className="font-label text-[10px] tracking-label text-ash uppercase">
            Soon
          </span>
        )}
        <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
      </Link>
    </li>
  )
}
