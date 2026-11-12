"use client"

import {
  CircleCheck,
  CircleX,
  KeyRound,
  Loader2,
  Pencil,
  Plug,
  Plus,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { Field } from "@/components/field"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import { fieldErrors } from "@/lib/api"
import type { DockerFleetServer, DockerRegistry } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  type Item,
  Notices,
  SearchBox,
} from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import {
  useDeleteRegistry,
  useDockerRegistries,
  useSaveRegistry,
  useTestRegistry,
} from "../api"
import { useDockerEnv } from "../env"
import { type WsCtx, WsPage } from "./env-page"
import { NoMatch, PageBar, PhoneRow, Rows, Table, Tag, Tr } from "./kit"

// Common registries, to fill the address (and a name) in one tap.
const presets = [
  { name: "Docker Hub", address: "docker.io", user: "Docker ID" },
  { name: "GitHub", address: "ghcr.io", user: "GitHub user" },
  { name: "GitLab", address: "registry.gitlab.com", user: "GitLab user" },
  { name: "Quay", address: "quay.io", user: "Robot account" },
  { name: "Google", address: "europe-docker.pkg.dev", user: "_json_key" },
]

export function RegistriesPage() {
  return (
    <WsPage title="Registries" bleed>
      {(ctx) => <RegistriesView {...ctx} />}
    </WsPage>
  )
}

// /containers/registries: the workspace's logins to private registries,
// used whenever Morche pulls an image from one (deploys, updates, pulls).
function RegistriesView({ ws, phone }: WsCtx) {
  const { workspaceLevel } = useAccess()
  const own = atLeast(workspaceLevel(ws.id), "owner")
  const query = useDockerRegistries(ws.id)
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<DockerRegistry | "new" | null>(null)
  const [formOpen, setFormOpen] = useOpen("docker-registry-form")
  const [removing, setRemoving] = useState<DockerRegistry | null>(null)
  const [confirmOpen, setConfirmOpen] = useOpen("docker-registry-remove")
  const remove = useDeleteRegistry()
  const tester = useLoginTest(ws.id)

  const items = [...(query.data ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  const needle = q.trim().toLowerCase()
  const shown = needle
    ? items.filter((r) =>
        [r.name, r.address, r.username].some((s) =>
          s.toLowerCase().includes(needle),
        ),
      )
    : items

  const edit = (r: DockerRegistry | "new") => {
    setEditing(r)
    setFormOpen(true)
  }
  const menu = (r: DockerRegistry): Item[][] =>
    own
      ? [
          [
            {
              key: "edit",
              label: "Edit",
              icon: <Pencil />,
              onSelect: () => edit(r),
            },
            {
              key: "test",
              label: tester.server
                ? `Test on ${tester.server.name}`
                : "Test the login",
              icon: <Plug />,
              disabled: !tester.server,
              onSelect: () => tester.run(r),
            },
          ],
          [
            {
              key: "remove",
              label: "Remove",
              icon: <Trash2 />,
              destructive: true,
              onSelect: () => {
                setRemoving(r)
                setConfirmOpen(true)
              },
            },
          ],
        ]
      : []

  let body: React.ReactNode
  if (query.isPending) {
    body = <Skeleton className="h-60 rounded-2xl max-md:mx-4" />
  } else if (query.isError) {
    body = (
      <Empty
        icon={KeyRound}
        title="Couldn't read the registries"
        body={query.error.message}
        className="max-md:mt-4"
      />
    )
  } else if (items.length === 0) {
    body = (
      <Empty
        icon={KeyRound}
        title="No registry logins"
        body="Public images need none. Add a login for a private registry (GitHub, GitLab, your own…) and Morche uses it whenever it pulls an image from there: deploys, updates and pulls."
        className="max-md:mt-4"
        action={
          own && (
            <Button onClick={() => edit("new")}>
              <Plus />
              Add a registry
            </Button>
          )
        }
      />
    )
  } else if (shown.length === 0) {
    body = <NoMatch onReset={() => setQ("")} />
  } else if (phone) {
    body = (
      <Rows>
        {shown.map((r) => (
          <PhoneRow
            key={r.id}
            id={r.id}
            title={r.name}
            sub={`${r.address}${r.username ? ` · ${r.username}` : ""}`}
            onOpen={() => (own ? edit(r) : undefined)}
            menu={menu(r)}
          />
        ))}
      </Rows>
    )
  } else {
    body = (
      <Table
        head={[
          { label: "Name" },
          { label: "Address" },
          { label: "Username" },
          { label: "Password" },
          { label: "Changed", className: "hidden @3xl:table-cell" },
        ]}
      >
        {shown.map((r) => (
          <Tr
            key={r.id}
            label={r.name}
            onOpen={() => (own ? edit(r) : undefined)}
            menu={menu(r)}
            cells={[
              { node: <span className="font-medium">{r.name}</span> },
              {
                node: r.address,
                className: "font-mono text-caption text-muted-foreground",
              },
              {
                node: r.username || <span className="text-ash">None</span>,
                className: "text-muted-foreground",
              },
              {
                node: r.has_password ? (
                  <Tag>Saved</Tag>
                ) : (
                  <span className="text-ash">None</span>
                ),
                className: "[&>span]:ms-0",
              },
              {
                node: timeAgo(r.updated_at),
                className:
                  "hidden text-caption text-muted-foreground @3xl:table-cell",
              },
            ]}
          />
        ))}
      </Table>
    )
  }

  return (
    <>
      <PageBar
        phone={phone}
        search={
          items.length > 0 ? (
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder="Search registries"
              label="Search registries"
              className="md:max-w-64"
            />
          ) : undefined
        }
        caption={
          items.length > 0 &&
          `${items.length} login${items.length === 1 ? "" : "s"} · used when pulling`
        }
        refresh={{ busy: query.isFetching, run: () => query.refetch() }}
        primary={
          own
            ? { label: "Add registry", icon: <Plus />, run: () => edit("new") }
            : undefined
        }
      />
      {!own && items.length > 0 && (
        <Notices
          className={cn(phone ? "mt-3" : "mt-4")}
          notes={[
            {
              key: "read-only",
              title: "Only a workspace Owner can add or change logins",
              body: "Passwords are never shown here, to anyone.",
            },
          ]}
        />
      )}
      <div className={cn(phone ? "pt-3 pb-24" : "mt-4")}>{body}</div>

      <RegistryForm
        key={editing === "new" ? "new" : (editing?.id ?? "none")}
        open={formOpen && editing !== null}
        onOpenChange={setFormOpen}
        ws={ws.id}
        registry={editing === "new" ? undefined : (editing ?? undefined)}
        taken={items}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Remove ${removing?.name ?? "the login"}?`}
        description={
          <>
            Pulls from <code>{removing?.address}</code> go without a login
            afterwards, so private images there stop pulling. Images already on
            the servers stay.
          </>
        }
        confirmLabel="Remove"
        pending={remove.isPending}
        onConfirm={() =>
          removing &&
          remove.mutate(
            { ws: ws.id, id: removing.id },
            {
              onSuccess: () => {
                toast.success(`${removing.name} removed`)
                setConfirmOpen(false)
              },
              onError: (e) => toast.error(e.message),
            },
          )
        }
      />
    </>
  )
}

// The servers whose engine can try a login: ready, in this workspace, and
// ones this person is an Engineer on (the backend's rule).
function useTestServers(ws: string) {
  const { servers, server } = useDockerEnv()
  const { serverLevel } = useAccess()
  const ok = (s: DockerFleetServer) =>
    s.state === "ready" &&
    s.workspace_id === ws &&
    atLeast(serverLevel(s.server_id, s.workspace_id), "engineer")
  const list = servers.filter(ok)
  const first = server && ok(server) ? server : list[0]
  return { list, first }
}

// A saved login tried from the menu, on the current environment.
function useLoginTest(ws: string) {
  const { first } = useTestServers(ws)
  const test = useTestRegistry()
  return {
    server: first,
    run: (r: DockerRegistry) => {
      if (!first) return
      const id = toast.loading(`Trying ${r.name} on ${first.name}…`)
      test.mutate(
        {
          ws,
          id: r.id,
          server: first.server_id,
          address: r.address,
          username: r.username,
        },
        {
          onSuccess: (res) =>
            res.ok
              ? toast.success(`${r.name}: login works`, { id })
              : toast.error(`${r.name}: ${res.message}`, { id }),
          onError: (e) => toast.error(e.message, { id }),
        },
      )
    },
  }
}

function RegistryForm({
  open,
  onOpenChange,
  ws,
  registry,
  taken,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ws: string
  registry?: DockerRegistry
  taken: DockerRegistry[]
}) {
  const save = useSaveRegistry()
  const test = useTestRegistry()
  const servers = useTestServers(ws)
  const [name, setName] = useState(registry?.name ?? "")
  const [address, setAddress] = useState(registry?.address ?? "")
  const [username, setUsername] = useState(registry?.username ?? "")
  const [password, setPassword] = useState("")
  const [server, setServer] = useState(servers.first?.server_id ?? "")
  const [tried, setTried] = useState(false)
  const errors = fieldErrors(save.error)
  const host = address
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase()
  const dup = taken.find(
    (r) => r.id !== registry?.id && r.address.toLowerCase() === host,
  )
  const nameError =
    (tried && !name.trim() ? "Give it a name." : undefined) ?? errors.name
  const addressError =
    (tried && !host
      ? "The registry's host, like ghcr.io."
      : /\s/.test(address.trim())
        ? "An address has no spaces."
        : dup
          ? `${dup.name} is already the login for ${host}.`
          : undefined) ?? errors.address
  const general =
    save.error && Object.keys(errors).length === 0
      ? save.error.message
      : undefined
  const preset = presets.find((p) => p.address === host)
  const testServer = servers.list.find((s) => s.server_id === server)
  const testResult = test.data

  const fill = (p: (typeof presets)[number]) => {
    setAddress(p.address)
    if (!name.trim()) setName(p.name)
    test.reset()
  }

  const submit = () => {
    setTried(true)
    if (!name.trim() || !host || addressError) return
    save.mutate(
      {
        ws,
        id: registry?.id,
        name: name.trim(),
        address: host,
        username: username.trim(),
        ...(password ? { password } : {}),
      },
      {
        onSuccess: () => {
          toast.success(registry ? "Login saved" : `${name.trim()} added`)
          onOpenChange(false)
        },
      },
    )
  }

  const runTest = () => {
    if (!host || !testServer) return
    test.mutate({
      ws,
      id: registry?.id,
      server: testServer.server_id,
      address: host,
      username: username.trim(),
      password: password || undefined,
    })
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={registry ? `Edit ${registry.name}` : "Add a registry"}
      description="Used whenever Morche pulls an image from this registry."
      className="sm:max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {registry ? "Save" : "Add"}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        {!registry && (
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.address}
                type="button"
                aria-pressed={host === p.address}
                onClick={() => fill(p)}
                className="h-8 rounded-full border border-input px-3 text-caption text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong max-md:h-10 max-md:px-4"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
        <Field
          label="Address"
          error={addressError}
          hint="The registry's host as it starts an image name: ghcr.io/me/app → ghcr.io. Docker Hub is docker.io."
        >
          {(p) => (
            <Input
              {...p}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value)
                test.reset()
              }}
              placeholder="registry.example.com"
              className="font-mono"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="url"
            />
          )}
        </Field>
        <Field label="Name" error={nameError}>
          {(p) => (
            <Input
              {...p}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Company registry"
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Username" error={errors.username}>
            {(p) => (
              <Input
                {...p}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  test.reset()
                }}
                placeholder={preset?.user ?? "user"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
              />
            )}
          </Field>
          <Field
            label="Password or token"
            error={errors.password}
            hint={
              registry?.has_password
                ? "Saved. Leave blank to keep it."
                : "A token with read access is best."
            }
          >
            {(p) => (
              <SecretInput
                {...p}
                label="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  test.reset()
                }}
                placeholder={registry?.has_password ? "••••••••" : ""}
                autoComplete="new-password"
              />
            )}
          </Field>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-subtle p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body-sm font-medium">Try it</span>
            {servers.list.length > 1 ? (
              <select
                value={server}
                onChange={(e) => {
                  setServer(e.target.value)
                  test.reset()
                }}
                aria-label="Server to try the login on"
                className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-body-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 max-md:h-11"
              >
                {servers.list.map((s) => (
                  <option key={s.server_id} value={s.server_id}>
                    on {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
                {testServer
                  ? `on ${testServer.name}`
                  : "Needs a running engine you're an Engineer on"}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="max-md:h-11"
              disabled={!testServer || !host || test.isPending}
              onClick={runTest}
            >
              {test.isPending ? <Loader2 className="animate-spin" /> : <Plug />}
              Test login
            </Button>
          </div>
          {testResult && (
            <p
              role="status"
              className={cn(
                "flex items-start gap-1.5 text-caption",
                testResult.ok ? "text-success" : "text-destructive",
              )}
            >
              {testResult.ok ? (
                <CircleCheck className="mt-px size-3.5 shrink-0" />
              ) : (
                <CircleX className="mt-px size-3.5 shrink-0" />
              )}
              <span className="min-w-0 break-words">
                {testResult.ok ? "The login works." : testResult.message}
              </span>
            </p>
          )}
          {test.error && (
            <p role="alert" className="text-caption text-destructive">
              {test.error.message}
            </p>
          )}
          {!testResult && !test.error && (
            <p className="text-caption text-muted-foreground">
              The server's engine logs in with these details; nothing is saved.
            </p>
          )}
        </div>

        {general && (
          <p role="alert" className="text-body-sm text-destructive">
            {general}
          </p>
        )}
        <button type="submit" hidden />
      </form>
    </ResponsiveDialog>
  )
}
