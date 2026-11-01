"use client"

import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useFolders } from "../../api"
import { buildTree, folderPath } from "../../components/folder-tree"
import { address } from "../../components/meta"
import { useServerActions } from "../../components/server-actions"
import { authText, Mono } from "./facts"
import { SectionHeader } from "./section-header"
import { useServerPage } from "./server-page"

export function ServerSettings() {
  const { server, checking, onDeleted } = useServerPage()
  const actions = useServerActions()
  const folders = useFolders()
  const { nodes } = buildTree(folders.data ?? [])
  const edit = () => actions.editServer(server)

  return (
    <>
      <SectionHeader />
      <Group title="General">
        <Row
          title="Name"
          value={server.name}
          action={{ label: "Rename", run: edit }}
        />
        <Row
          title="Notes"
          value={server.description || "None"}
          muted={!server.description}
          action={{ label: server.description ? "Edit" : "Add", run: edit }}
        />
      </Group>

      <Group title="Connection">
        <Row
          title="Address"
          value={<Mono>{address(server)}</Mono>}
          action={{ label: "Edit connection", run: edit }}
        />
        <Row
          title="Authentication"
          value={authText(server)}
          action={{ label: "Change", run: edit }}
        />
      </Group>

      <Group title="Organization">
        <Row
          title="Folder"
          value={folderPath(nodes, server.folder_id) || "Unfiled"}
          muted={!server.folder_id}
          action={{
            label: "Move…",
            run: () => actions.moveServers([server.id]),
          }}
        />
        <Row
          title="Tags"
          value={server.tags.length ? server.tags.join(", ") : "None"}
          muted={server.tags.length === 0}
          action={{
            label: "Edit tags…",
            run: () => actions.tagServers([server]),
          }}
        />
        <Row
          title="Favorite"
          value={server.favorite ? "Pinned to Favorites" : "No"}
          muted={!server.favorite}
          action={{
            label: server.favorite ? "Remove" : "Add to favorites",
            run: () => actions.toggleFavorite(server),
          }}
        />
      </Group>

      <Group
        title="Host key"
        description="Morcheh trusts the key a server presents on its first check and refuses to connect if it changes."
      >
        <Row
          title="Fingerprint"
          value={
            server.host_key_fingerprint ? (
              <Mono className="break-all">{server.host_key_fingerprint}</Mono>
            ) : (
              "Not trusted yet"
            )
          }
          muted={!server.host_key_fingerprint}
          action={
            server.status === "host_key_mismatch"
              ? {
                  label: "Review new key…",
                  run: () => actions.trustHostKey(server),
                }
              : {
                  label: checking ? "Checking…" : "Check now",
                  run: () => actions.check(server),
                  disabled: checking,
                }
          }
        />
      </Group>

      <Group title="Danger zone">
        <Row
          title="Duplicate"
          value="A copy with the same connection and credentials."
          muted
          action={{
            label: "Duplicate",
            run: () => actions.duplicate(server),
          }}
        />
        <Row
          title="Delete server"
          value="Morcheh forgets it and its credentials. Nothing on the server is touched."
          muted
          action={{
            label: "Delete…",
            destructive: true,
            run: () => actions.deleteServers([server], onDeleted),
          }}
        />
      </Group>
    </>
  )
}

function Group({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="max-md:pt-6">
      <h3 className="px-4 pb-2 font-label text-caption tracking-label text-ash uppercase md:px-0 md:font-sans md:text-body-sm md:font-medium md:tracking-normal md:text-foreground md:normal-case">
        {title}
      </h3>
      <ul className="divide-y divide-border border-y border-border md:rounded-2xl md:border">
        {children}
      </ul>
      {description && (
        <p className="px-4 pt-2 text-caption text-ash md:px-0">{description}</p>
      )}
    </section>
  )
}

type Action = {
  label: string
  run: () => void
  destructive?: boolean
  disabled?: boolean
}

// Desktop: the setting with its button at the end. Phone: the whole row is
// the button, like a native settings list.
function Row({
  title,
  value,
  muted,
  action,
}: {
  title: string
  value: ReactNode
  muted?: boolean
  action: Action
}) {
  const { phone } = useServerPage()
  const text = (
    <span className="min-w-0 flex-1">
      <span
        className={cn(
          "block text-body md:text-body-sm md:font-medium",
          action.destructive && phone && "text-destructive",
        )}
      >
        {title}
      </span>
      <span
        className={cn(
          "mt-0.5 block text-body-sm",
          muted ? "text-ash" : "text-muted-foreground",
        )}
      >
        {value}
      </span>
    </span>
  )

  if (phone) {
    return (
      <li>
        <button
          type="button"
          aria-label={`${title}: ${action.label}`}
          disabled={action.disabled}
          onClick={action.run}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start outline-none active:bg-muted disabled:opacity-50"
        >
          {text}
          <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
        </button>
      </li>
    )
  }
  return (
    <li className="flex items-center gap-4 px-6 py-4">
      {text}
      <Button
        variant={action.destructive ? "destructive" : "outline"}
        disabled={action.disabled}
        onClick={action.run}
        className="shrink-0"
      >
        {action.label}
      </Button>
    </li>
  )
}
