"use client"

import {
  ChevronDown,
  ChevronLeft,
  Container,
  ServerCog,
  Server as ServerIcon,
  SquareTerminal,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { useWorkspace, type Workspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import type { DockerFleetServer, Server } from "@/lib/services"
import { cn } from "@/lib/utils"
import { afterClose, Empty } from "../../servers/[id]/components/parts"
import { useServer } from "../../servers/api"
import { OsTile } from "../../servers/components/meta"
import { setDockerEnv, useDockerEnv } from "../env"
import { DockerView } from "./docker-view"
import {
  type DockerTab,
  Dot,
  engineName,
  engineStateMeta,
  fleetOs,
} from "./meta"
import { useDockerCan } from "./permissions"

export type EnvCtx = { env: DockerFleetServer; phone: boolean }

const barButton =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none active:bg-muted"

// The frame of every Containers page that works on the current environment:
// waits for the fleet, says when no server runs Docker or the engine can't
// be reached, and on phones adds the app bar with the environment picker.
export function EnvPage({
  title,
  root = false,
  anyState = false,
  bleed = false,
  parent = "/containers",
  children,
}: {
  title: string
  // Where the phone's Back leads when there's no history (deep links).
  parent?: string
  // The section's own page (no Back on phones).
  root?: boolean
  // Render even when the engine isn't ready (the page explains it itself).
  anyState?: boolean
  // Phones: the content brings its own padding.
  bleed?: boolean
  children: (ctx: EnvCtx) => ReactNode
}) {
  const phone = useIsPhone()
  const { fleet, servers, server } = useDockerEnv()
  if (phone === null) return null

  let body: ReactNode
  if (fleet.isPending) {
    body = (
      <div className="flex flex-col gap-4 max-md:px-4 max-md:pt-4">
        <Skeleton className="h-9 w-full max-w-xl rounded-lg" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    )
  } else if (fleet.isError && !fleet.data) {
    body = (
      <Empty
        icon={TriangleAlert}
        title="Couldn't load the servers"
        body={fleet.error.message}
        className="max-md:mt-4"
        action={
          <Button variant="outline" onClick={() => fleet.refetch()}>
            Try again
          </Button>
        }
      />
    )
  } else if (!server) {
    body = <NoEngines />
  } else if (!anyState && server.state !== "ready") {
    body = <NotReady env={server} />
  } else {
    body = children({ env: server, phone })
  }

  if (!phone) {
    return <div className="flex flex-col gap-4 px-6 pt-5 pb-24">{body}</div>
  }
  return (
    <>
      <PhoneBar
        title={title}
        root={root}
        parent={parent}
        env={server}
        servers={servers}
      />
      <div className={cn(!bleed && "px-4 pt-4 pb-24")}>{body}</div>
    </>
  )
}

export type WsCtx = { ws: Workspace; phone: boolean }

// The frame of the Containers pages that belong to the workspace, not to
// one environment (settings, registries, templates).
export function WsPage({
  title,
  parent = "/containers",
  bleed = false,
  children,
}: {
  title: string
  parent?: string
  bleed?: boolean
  children: (ctx: WsCtx) => ReactNode
}) {
  const phone = useIsPhone()
  const { workspace } = useWorkspace()
  if (phone === null) return null
  const body = workspace ? (
    children({ ws: workspace, phone })
  ) : (
    <Empty
      icon={Container}
      title="No workspace"
      body="Container settings belong to a workspace; ask an admin to give you one."
      className="max-md:mt-4"
    />
  )
  if (!phone) {
    return <div className="flex flex-col gap-4 px-6 pt-5 pb-24">{body}</div>
  }
  return (
    <>
      <PhoneBar title={title} root={false} parent={parent} servers={[]} />
      <div className={cn(!bleed && "px-4 pt-4 pb-24")}>{body}</div>
    </>
  )
}

// A Containers resource page (containers, images, networks, volumes): the
// server's DockerView with one section.
export function SectionPage({
  title,
  section,
}: {
  title: string
  section: DockerTab
}) {
  return (
    <EnvPage title={title} anyState bleed>
      {({ env, phone }) => (
        <SectionBody id={env.server_id} phone={phone} section={section} />
      )}
    </EnvPage>
  )
}

function SectionBody({
  id,
  phone,
  section,
}: {
  id: string
  phone: boolean
  section: DockerTab
}) {
  const server = useServer(id).data
  if (!server) {
    return (
      <div className="flex flex-col gap-4 max-md:px-4 max-md:pt-4">
        <Skeleton className="h-9 w-full max-w-xl rounded-lg" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    )
  }
  return (
    <DockerView
      server={server}
      phone={phone}
      section={section}
      aside={phone ? undefined : <ServerButtons server={server} />}
    />
  )
}

// Desktop: the way to the server itself, beside the section's toolbar.
function ServerButtons({ server }: { server: Server }) {
  const can = useDockerCan(server.id, server.workspace_id)
  return (
    <>
      {can.manage && (
        <Button
          variant="outline"
          size="icon"
          aria-label="Open a terminal"
          title="Open a terminal"
          render={<Link href={`/servers/${server.id}/terminal`} />}
          nativeButton={false}
        >
          <SquareTerminal />
        </Button>
      )}
      <Button
        variant="outline"
        size="icon"
        aria-label="Open the server"
        title="Open the server"
        render={<Link href={`/servers/${server.id}`} />}
        nativeButton={false}
      >
        <ServerIcon />
      </Button>
    </>
  )
}

function PhoneBar({
  title,
  root,
  parent,
  env,
  servers,
}: {
  title: string
  root: boolean
  parent: string
  env?: DockerFleetServer
  servers: DockerFleetServer[]
}) {
  const back = useBack(parent)
  const [picking, setPicking] = useOpen("docker-env")
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex h-14 items-center gap-1 px-1">
        <div className="flex w-22 shrink-0">
          {!root && (
            <button
              type="button"
              aria-label="Back"
              onClick={back}
              className={barButton}
            >
              <ChevronLeft className="size-6 rtl:rotate-180" />
            </button>
          )}
        </div>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-body font-medium">{title}</h1>
          {env && (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="mx-auto flex max-w-full items-center justify-center gap-1 truncate text-caption text-muted-foreground"
            >
              <Dot tone={engineStateMeta[env.state].tone} />
              <span className="truncate">{env.name}</span>
              <ChevronDown className="size-3.5 shrink-0" />
            </button>
          )}
        </div>
        <div className="flex w-22 shrink-0 justify-end">
          <HelpButton href={guideHref("containers")} label="Containers guide" />
        </div>
      </div>
      <EnvSheet
        open={picking}
        onOpenChange={setPicking}
        current={env?.server_id}
        servers={servers}
      />
    </header>
  )
}

export function EnvSheet({
  open,
  onOpenChange,
  current,
  servers,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  current?: string
  servers: DockerFleetServer[]
}) {
  const router = useRouter()
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Environment">
      <div className="flex flex-col px-2">
        {servers.map((s) => {
          const meta = engineStateMeta[s.state]
          return (
            <SheetAction
              key={s.server_id}
              icon={<OsTile os={fleetOs(s)} className="size-8" />}
              label={s.name}
              description={
                s.state === "ready"
                  ? `${engineName(s)} ${s.version ?? ""} · ${s.running} of ${s.total} running`
                  : meta.label
              }
              trailing={
                s.server_id === current ? (
                  <span className="text-caption font-medium text-brand">
                    Current
                  </span>
                ) : undefined
              }
              onClick={() => {
                setDockerEnv(s.server_id)
                onOpenChange(false)
              }}
            />
          )
        })}
        <SheetAction
          icon={<ServerCog className="size-5" />}
          label="All environments"
          // Leave once the sheet's history entry is gone.
          onClick={() =>
            afterClose(onOpenChange, () =>
              router.push("/containers/environments"),
            )
          }
        />
      </div>
    </BottomSheet>
  )
}

function NoEngines() {
  return (
    <Empty
      icon={Container}
      title="No server runs Docker yet"
      body="Install Docker or Podman on a server and it shows up here as an environment. Morche talks to the engine over the server's SSH; nothing else is installed."
      className="max-md:mt-4"
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button render={<Link href="/applications" />} nativeButton={false}>
            Install from Applications
          </Button>
          <Button
            variant="outline"
            render={<Link href="/containers/environments" />}
            nativeButton={false}
          >
            See every server
          </Button>
        </div>
      }
    />
  )
}

function NotReady({ env }: { env: DockerFleetServer }) {
  const meta = engineStateMeta[env.state]
  return (
    <Empty
      icon={TriangleAlert}
      title={`${env.name}: ${meta.label.toLowerCase()}`}
      body={
        <>
          {meta.hint}
          {env.message && (
            <span className="mt-2 block font-mono text-caption break-all text-ash">
              {env.message}
            </span>
          )}
        </>
      }
      className="max-md:mt-4"
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant="outline"
            render={<Link href="/containers/environments" />}
            nativeButton={false}
          >
            Pick another environment
          </Button>
          <Button
            variant="ghost"
            render={<Link href={`/servers/${env.server_id}`} />}
            nativeButton={false}
          >
            Open the server
          </Button>
        </div>
      }
    />
  )
}
