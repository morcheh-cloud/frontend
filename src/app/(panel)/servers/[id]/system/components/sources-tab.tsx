"use client"

import { Globe, Package, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Field } from "@/components/field"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import type { Repo, ReposOverview } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useConfigWrite,
  useRepos,
  useTestMirror,
} from "../../components/config/api"
import { HistoryButton } from "../../components/config/history"
import { Notices } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { ConfigBar } from "../../network/components/network-view"
import { NotYet, RefreshButton } from "../../network/components/refresh"
import { SystemTabs } from "./system-view"

const mirrorPresets: Record<string, { label: string; url: string }[]> = {
  ubuntu: [
    { label: "Official", url: "http://archive.ubuntu.com/ubuntu" },
    { label: "ArvanCloud", url: "https://mirror.arvancloud.ir/ubuntu" },
  ],
  debian: [
    { label: "Official", url: "http://deb.debian.org/debian" },
    { label: "ArvanCloud", url: "https://mirror.arvancloud.ir/debian" },
  ],
}

const saved = () =>
  toast.success("Saved. Refresh the package lists (Packages) to use it.")

export function SourcesTab() {
  const { server, can, phone } = useServerPage()
  const q = useRepos(server.id)
  const [addOpen, setAddOpen] = useOpen("repo-add")
  const refresh = (
    <RefreshButton busy={q.isFetching} onClick={() => q.refetch()} />
  )
  const o = q.data
  if (!o)
    return (
      <>
        <ConfigBar tabs={<SystemTabs />} actions={refresh} />
        <NotYet
          error={q.error}
          what="the package sources"
          retry={() => q.refetch()}
        />
      </>
    )
  const editable = o.editable && can("engineer")
  return (
    <>
      <ConfigBar
        tabs={<SystemTabs />}
        status={
          <>
            {o.repos.filter((r) => r.enabled).length} of {o.repos.length} on ·{" "}
            {o.manager}
          </>
        }
        actions={
          <>
            <HistoryButton area="repos" />
            {refresh}
            {editable && (
              <Button
                size={phone ? "icon-lg" : "default"}
                className="md:h-9"
                aria-label="Add a source"
                onClick={() => setAddOpen(true)}
              >
                <Plus />
                {!phone && "Add a source"}
              </Button>
            )}
          </>
        }
      />
      <Notices notes={o.note ? [{ key: "note", title: o.note }] : []} />
      {o.mirror.can_set && <MirrorCard o={o} editable={editable} />}
      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border max-md:mx-4 max-md:mt-4">
        {o.repos.map((r) => (
          <RepoRow key={r.id} r={r} o={o} editable={editable} />
        ))}
        {o.repos.length === 0 && (
          <li className="p-6 text-body-sm text-muted-foreground">
            No package sources found.
          </li>
        )}
      </ul>
      {editable && <AddRepo o={o} open={addOpen} onOpenChange={setAddOpen} />}
    </>
  )
}

function RepoRow({
  r,
  o,
  editable,
}: {
  r: Repo
  o: ReposOverview
  editable: boolean
}) {
  const { server } = useServerPage()
  const write = useConfigWrite(server.id)
  const [ask, setAsk] = useOpen(`repo-remove-${r.id}`)
  const title = r.name || r.uris[0] || r.id
  return (
    <li
      className={cn(
        "flex min-w-0 items-center gap-3 px-4 py-3",
        !r.enabled && "opacity-60",
      )}
    >
      <Package className="size-5 shrink-0 text-ash" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-body-sm">{title}</span>
          {r.main && <Tag>Distribution</Tag>}
          {r.morche && <Tag>Added in Morche</Tag>}
          {r.types.includes("deb-src") && <Tag>Source</Tag>}
        </span>
        <span className="truncate text-caption text-muted-foreground">
          {[r.suites.join(" "), r.components.join(" ")]
            .filter(Boolean)
            .join(" · ") || r.uris.join(" ")}{" "}
          · {r.file.split("/").pop()}
        </span>
      </div>
      <Switch
        aria-label={`Use ${title}`}
        checked={r.enabled}
        disabled={!editable || write.isPending}
        onCheckedChange={(v) =>
          write.mutate(
            {
              kind: "repo-toggle",
              body: { revision: o.revision, id: r.id, enabled: v },
            },
            {
              onSuccess: saved,
              onError: (e) => e.status !== 409 && toast.error(e.message),
            },
          )
        }
      />
      {editable && !r.main && (
        <Button
          variant="ghost"
          size="icon"
          className="max-md:size-11"
          aria-label={`Remove ${title}`}
          onClick={() => setAsk(true)}
        >
          <Trash2 />
        </Button>
      )}
      <ConfirmDialog
        open={ask}
        onOpenChange={setAsk}
        title={`Remove ${title}?`}
        description="Packages from it stay installed but won't get updates from it."
        confirmLabel="Remove"
        destructive
        pending={write.isPending}
        onConfirm={() =>
          write.mutate(
            { kind: "repo-remove", body: { revision: o.revision, id: r.id } },
            {
              onSuccess: () => setAsk(false),
              onError: (e) => toast.error(e.message),
            },
          )
        }
      />
    </li>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-label text-caption tracking-label text-muted-foreground uppercase">
      {children}
    </span>
  )
}

function MirrorCard({ o, editable }: { o: ReposOverview; editable: boolean }) {
  const { server } = useServerPage()
  const presets = mirrorPresets[o.mirror.distro] ?? []
  const [url, setUrl] = useState(o.mirror.current)
  const test = useTestMirror(server.id)
  const write = useConfigWrite(server.id)
  const res = test.data && test.variables === url ? test.data : null
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border p-6 max-md:mx-4 max-md:mt-4 max-md:p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
          <Globe className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 className="text-body font-medium">Mirror</h2>
          <span className="truncate text-caption text-muted-foreground">
            {o.mirror.distro} {o.mirror.codename} packages come from{" "}
            {o.mirror.current || "—"}
          </span>
        </div>
      </div>
      {editable && (
        <>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button
                key={p.url}
                variant={url === p.url ? "default" : "outline"}
                size="sm"
                onClick={() => setUrl(p.url)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-2 md:flex-row">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="min-w-0 flex-1 font-mono"
              aria-label="Mirror address"
              placeholder={`https://mirror.example.com/${o.mirror.distro}`}
            />
            <Button
              variant="outline"
              disabled={!url || test.isPending}
              onClick={() => test.mutate(url)}
            >
              {test.isPending ? "Trying…" : "Try it"}
            </Button>
            <Button
              disabled={
                !res?.ok ||
                url.replace(/\/$/, "") === o.mirror.current ||
                write.isPending
              }
              title={res?.ok ? "" : "Try it first"}
              onClick={() =>
                write.mutate(
                  { kind: "mirror", body: { revision: o.revision, url } },
                  {
                    onSuccess: saved,
                    onError: (e) => e.status !== 409 && toast.error(e.message),
                  },
                )
              }
            >
              Use this mirror
            </Button>
          </div>
          {res && (
            <p
              className={cn(
                "text-body-sm",
                res.ok ? "text-success" : "text-destructive",
              )}
            >
              {res.ok
                ? `It answers: ${res.took_ms} ms for its ${o.mirror.codename} release file.`
                : res.error}
            </p>
          )}
        </>
      )}
    </section>
  )
}

function AddRepo({
  o,
  open,
  onOpenChange,
}: {
  o: ReposOverview
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { server } = useServerPage()
  const write = useConfigWrite(server.id)
  const apt = o.manager === "apt"
  const [name, setName] = useState("")
  const [uri, setUri] = useState("")
  const [suite, setSuite] = useState(o.mirror.codename)
  const [comps, setComps] = useState("main")
  const [key, setKey] = useState("")
  const nameBad = name !== "" && !/^[a-z0-9][a-z0-9-]{0,40}$/.test(name)
  const uriBad = uri !== "" && !/^https?:\/\/[^\s"'`$\\]+$/.test(uri)
  const ok = name && uri && !nameBad && !uriBad && (!apt || suite.trim())
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a package source"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!ok || write.isPending}
            onClick={() =>
              write.mutate(
                {
                  kind: "repo-add",
                  body: apt
                    ? {
                        revision: o.revision,
                        name,
                        uris: [uri],
                        suites: [suite.trim()],
                        components: comps.split(/\s+/).filter(Boolean),
                        signed_by: key || undefined,
                      }
                    : {
                        revision: o.revision,
                        name,
                        title: name,
                        uris: [uri],
                        gpgcheck: !!key,
                        gpgkey: key || undefined,
                      },
                },
                {
                  onSuccess: () => {
                    saved()
                    onOpenChange(false)
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            Add
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field
          label="Name"
          hint={`Saved as morche-${name || "name"}.${apt ? "sources" : "repo"}`}
          error={nameBad ? "Lowercase letters, digits and hyphens" : undefined}
        >
          {(p) => (
            <Input
              {...p}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="docker"
              autoCapitalize="off"
            />
          )}
        </Field>
        <Field
          label="Address"
          error={uriBad ? "An http:// or https:// address" : undefined}
        >
          {(p) => (
            <Input
              {...p}
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder={
                apt
                  ? "https://download.docker.com/linux/ubuntu"
                  : "https://download.docker.com/linux/rhel/9/x86_64/stable"
              }
              className="font-mono"
              inputMode="url"
            />
          )}
        </Field>
        {apt && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Suite" hint="Usually the release name">
              {(p) => (
                <Input
                  {...p}
                  value={suite}
                  onChange={(e) => setSuite(e.target.value)}
                  className="font-mono"
                />
              )}
            </Field>
            <Field label="Components">
              {(p) => (
                <Input
                  {...p}
                  value={comps}
                  onChange={(e) => setComps(e.target.value)}
                  className="font-mono"
                  placeholder="main"
                />
              )}
            </Field>
          </div>
        )}
        <Field
          label={apt ? "Signing key file (optional)" : "Signing key (optional)"}
          hint={
            apt
              ? "Like /etc/apt/keyrings/docker.asc; add the key file first."
              : "A URL or file; turns on the signature check."
          }
        >
          {(p) => (
            <Input
              {...p}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="font-mono"
            />
          )}
        </Field>
      </div>
    </ResponsiveDialog>
  )
}
