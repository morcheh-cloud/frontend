"use client"

import {
  ChevronRight,
  FolderOpen,
  FolderSearch,
  Layers,
  Loader2,
  Plus,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { FolderPicker } from "@/components/files/folder-picker"
import { serverLister } from "@/components/files/listers"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useOpen } from "@/hooks/useOpen"
import type {
  DockerProjectAddProblem,
  DockerProjectFound,
  DockerProjectScanResult,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import type { Note } from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import { useAddProjects, useProjectScan, useScanProjects } from "../api"
import { Layer } from "./parts"
import { projectHref } from "./project-actions"

// The compose projects found on a server's disk that Morche doesn't list yet:
// a notice on the Projects page, a layer to review and add them, and a dialog
// to add one by its path. Engineer only (the caller passes `can`).
export function useProjectDiscovery(server: string, can: boolean) {
  const scan = useProjectScan(server, can)
  const [findOpen, setFindOpen] = useOpen("docker-project-find")
  const [addOpen, setAddOpen] = useOpen("docker-project-add")
  const seen = useSeen(server)

  const data = scan.data
  const fresh = (data?.items ?? []).filter(
    (i) => i.state === "new" && !i.problem && !seen.has(i.dir),
  )
  const notes: Note[] = []
  if (can && fresh.length > 0) {
    notes.push({
      key: "found",
      title: `Found ${fresh.length} compose project${fresh.length === 1 ? "" : "s"} on this server that ${fresh.length === 1 ? "isn't" : "aren't"} listed yet`,
      body: fresh
        .slice(0, 3)
        .map((i) => i.dir)
        .join(", ")
        .concat(fresh.length > 3 ? ` and ${fresh.length - 3} more` : ""),
      action: (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => seen.add(fresh.map((i) => i.dir))}
          >
            Not now
          </Button>
          <Button size="sm" onClick={() => setFindOpen(true)}>
            Review
          </Button>
        </div>
      ),
    })
  }

  return {
    scan,
    notes,
    // The page bar's quiet caption while a look runs.
    looking: !!data?.running,
    find: () => setFindOpen(true),
    add: () => setAddOpen(true),
    layers: can && (
      <>
        <FindLayer
          server={server}
          open={findOpen}
          onOpenChange={setFindOpen}
          data={data}
          pending={scan.isPending}
          onAddByPath={() => {
            setFindOpen(false)
            setAddOpen(true)
          }}
        />
        <AddByPathDialog
          server={server}
          open={addOpen}
          onOpenChange={setAddOpen}
        />
      </>
    ),
  }
}

// Folders whose notice someone set aside on this browser ("Not now").
function useSeen(server: string) {
  const key = `morcheh.docker.discovery.seen.${server}`
  const [dirs, setDirs] = useState<string[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? "[]")
      return Array.isArray(v) ? v : []
    } catch {
      return []
    }
  })
  return {
    has: (dir: string) => dirs.includes(dir),
    add: (more: string[]) => {
      const next = [...new Set([...dirs, ...more])].slice(-500)
      setDirs(next)
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {}
    },
  }
}

const stateMeta: Record<DockerProjectFound["state"], string> = {
  new: "Not listed yet",
  clash: "Its name is taken",
  forgotten: "Set aside",
  listed: "Already listed",
}

function FindLayer({
  server,
  open,
  onOpenChange,
  data,
  pending,
  onAddByPath,
}: {
  server: string
  open: boolean
  onOpenChange: (open: boolean) => void
  data?: DockerProjectScanResult
  pending: boolean
  onAddByPath: () => void
}) {
  const scan = useScanProjects()
  const add = useAddProjects()
  // Ticked folders and the names typed for clashing ones, by folder.
  const [ticked, setTicked] = useState<Set<string> | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const [problems, setProblems] = useState<DockerProjectAddProblem[]>([])
  const [where, setWhere] = useState(false)
  const [paths, setPaths] = useState("")
  const [depth, setDepth] = useState("")

  const items = data?.items ?? []
  const addable = items.filter(
    (i) => !i.problem && (i.state === "new" || i.state === "forgotten"),
  )
  const clashes = items.filter((i) => !i.problem && i.state === "clash")
  const listed = items.filter((i) => !i.problem && i.state === "listed")
  const broken = items.filter((i) => i.problem)
  // Every new one is ticked until someone changes the ticks.
  const picked =
    ticked ??
    new Set(addable.filter((i) => i.state === "new").map((i) => i.dir))
  const toggle = (dir: string, on: boolean) => {
    const next = new Set(picked)
    if (on) next.add(dir)
    else next.delete(dir)
    setTicked(next)
  }
  const chosen = [
    ...addable.filter((i) => picked.has(i.dir)),
    ...clashes.filter((i) => picked.has(i.dir) && names[i.dir]?.trim()),
  ]
  const running = !!data?.running || scan.isPending

  const look = () =>
    scan.mutate(
      {
        server,
        paths: paths
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean),
        depth: Number(depth) || undefined,
      },
      {
        onSuccess: () => {
          setTicked(null)
          setProblems([])
        },
        onError: (e) => toast.error(e.message),
      },
    )

  const submit = () =>
    add.mutate(
      {
        server,
        items: chosen.map((i) => ({
          path: i.dir,
          name: i.state === "clash" ? names[i.dir]?.trim() : undefined,
        })),
      },
      {
        onSuccess: (r) => {
          setProblems(r.problems)
          setTicked(null)
          if (r.added.length > 0) {
            toast.success(
              r.added.length === 1
                ? `Added ${r.added[0]}`
                : `Added ${r.added.length} projects`,
            )
          }
          if (r.problems.length === 0) onOpenChange(false)
        },
        onError: (e) => toast.error(e.message),
      },
    )

  return (
    <Layer
      open={open}
      onOpenChange={onOpenChange}
      title="Compose projects on this server"
      subtitle={<Status data={data} running={running} />}
      actions={
        <>
          <Button
            disabled={chosen.length === 0 || add.isPending || running}
            onClick={submit}
          >
            {add.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            {chosen.length > 0
              ? `Add ${chosen.length} project${chosen.length === 1 ? "" : "s"}`
              : "Add projects"}
          </Button>
          <Button variant="outline" disabled={running} onClick={look}>
            {running ? <Loader2 className="animate-spin" /> : <FolderSearch />}
            Look again
          </Button>
          <Button variant="ghost" onClick={onAddByPath}>
            <FolderOpen />
            Add by path…
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <button
          type="button"
          aria-expanded={where}
          onClick={() => setWhere((v) => !v)}
          className="flex min-h-11 items-center gap-1.5 self-start text-body-sm text-muted-foreground hover:text-foreground md:min-h-8"
        >
          <ChevronRight
            className={cn("size-4 transition-transform", where && "rotate-90")}
          />
          Where to look
        </button>
        {where && (
          <div className="flex flex-col gap-3 rounded-lg bg-subtle p-3">
            <div className="flex flex-col gap-1.5 text-body-sm">
              <label htmlFor="find-paths" className="font-medium">
                Folders
              </label>
              <Textarea
                id="find-paths"
                value={paths}
                onChange={(e) => setPaths(e.target.value)}
                placeholder={"/srv\n/opt\n/home"}
                rows={3}
                className="font-mono text-caption"
                spellCheck={false}
                autoCapitalize="off"
              />
              <span className="text-caption text-muted-foreground">
                One per line, at most 10. Empty = the whole disk, without system
                folders, caches and node_modules.
              </span>
            </div>
            <div className="flex flex-col gap-1.5 text-body-sm">
              <label htmlFor="find-depth" className="font-medium">
                How deep
              </label>
              <Input
                id="find-depth"
                type="number"
                inputMode="numeric"
                min={1}
                max={12}
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                placeholder="7"
                className="w-24"
              />
            </div>
          </div>
        )}
      </div>

      {problems.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-body-sm">
          <p className="font-medium text-destructive">
            {problems.length === 1
              ? "One wasn't added"
              : `${problems.length} weren't added`}
          </p>
          {problems.map((p) => (
            <p key={p.path} className="text-muted-foreground">
              <span className="font-mono text-caption text-foreground">
                {p.path}
              </span>
              : {p.message}
            </p>
          ))}
        </div>
      )}

      {pending ? (
        <Skeleton className="h-40 rounded-lg" />
      ) : items.length === 0 ? (
        <EmptyLook data={data} running={running} onAddByPath={onAddByPath} />
      ) : (
        <>
          {addable.length > 0 && (
            <Group
              title="Not listed yet"
              hint="Ticked ones are added as they are: nothing on the server changes."
            >
              {addable.map((i) => (
                <FoundRow
                  key={i.dir}
                  i={i}
                  checked={picked.has(i.dir)}
                  onCheck={(on) => toggle(i.dir, on)}
                />
              ))}
            </Group>
          )}
          {clashes.length > 0 && (
            <Group
              title="Their name is taken"
              hint="Another project already has the name compose would give these. Give each its own name to add it."
            >
              {clashes.map((i) => (
                <FoundRow
                  key={i.dir}
                  i={i}
                  checked={picked.has(i.dir)}
                  onCheck={(on) => toggle(i.dir, on)}
                >
                  <Input
                    value={names[i.dir] ?? ""}
                    onChange={(e) => {
                      setNames({ ...names, [i.dir]: e.target.value })
                      if (e.target.value.trim()) toggle(i.dir, true)
                    }}
                    placeholder={`${i.name}-2`}
                    aria-label={`Name for ${i.dir}`}
                    className="mt-2 h-9 max-w-64 font-mono text-caption"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                </FoundRow>
              ))}
            </Group>
          )}
          {broken.length > 0 && (
            <Group title="Can't be added">
              {broken.map((i) => (
                <FoundRow key={i.dir} i={i} />
              ))}
            </Group>
          )}
          {listed.length > 0 && (
            <Group title="Already listed">
              {listed.map((i) => (
                <FoundRow key={i.dir} i={i} server={server} />
              ))}
            </Group>
          )}
        </>
      )}
    </Layer>
  )
}

function Status({
  data,
  running,
}: {
  data?: DockerProjectScanResult
  running: boolean
}) {
  if (running) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Loader2 className="size-3.5 animate-spin" />
        Looking at the disk for compose files…
      </span>
    )
  }
  if (!data?.scanned_at) return "Morche hasn't looked at this disk yet."
  const bits = [
    `Looked ${timeAgo(data.scanned_at)}`,
    data.took_ms < 1000
      ? "took under a second"
      : `took ${(data.took_ms / 1000).toFixed(1)} s`,
  ]
  if (data.truncated) bits.push("stopped early: too many files")
  return (
    <span>
      {bits.join(" · ")}
      {data.error && (
        <span className="block text-destructive">{data.error}</span>
      )}
    </span>
  )
}

function EmptyLook({
  data,
  running,
  onAddByPath,
}: {
  data?: DockerProjectScanResult
  running: boolean
  onAddByPath: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg bg-subtle p-6 text-center">
      <Layers className="size-6 text-ash" />
      <p className="text-body-sm text-muted-foreground">
        {running
          ? "Looking… this takes up to a minute on a big disk."
          : data?.scanned_at
            ? "No compose file outside the projects folder. If yours sits deeper or in a skipped folder, open Where to look, or add it by its path."
            : "Press Look again to search the disk for compose files."}
      </p>
      {!running && (
        <Button variant="outline" size="sm" onClick={onAddByPath}>
          <FolderOpen />
          Add by path…
        </Button>
      )}
    </div>
  )
}

function Group({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-body-sm font-medium">{title}</h3>
        {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {children}
      </ul>
    </section>
  )
}

function FoundRow({
  i,
  checked,
  onCheck,
  server,
  children,
}: {
  i: DockerProjectFound
  checked?: boolean
  onCheck?: (on: boolean) => void
  // Set for listed ones: the name links to the project.
  server?: string
  children?: ReactNode
}) {
  const files = i.files.map((f) => f.split("/").pop()).join(" + ")
  const body = (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-x-2">
        {server && i.project ? (
          <Link
            href={projectHref(server, i.project)}
            className="text-body-sm font-medium hover:underline"
          >
            {i.project}
          </Link>
        ) : (
          <span className="text-body-sm font-medium">{i.name || "—"}</span>
        )}
        {i.state === "forgotten" && (
          <span className="text-caption text-ash">{stateMeta.forgotten}</span>
        )}
        {i.state === "clash" && i.project && (
          <span className="text-caption text-ash">used by {i.project}</span>
        )}
      </div>
      <p className="truncate font-mono text-caption text-muted-foreground">
        {i.dir}
        <span className="text-ash"> · {files}</span>
      </p>
      {i.services.length > 0 && (
        <p className="truncate text-caption text-ash">
          {i.services.length} service{i.services.length === 1 ? "" : "s"}:{" "}
          {i.services.join(", ")}
        </p>
      )}
      {i.problem && (
        <p className="flex gap-1.5 text-caption text-destructive">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {i.problem}
        </p>
      )}
      {children}
    </div>
  )
  if (!onCheck) {
    return <li className="flex gap-3 px-3 py-2.5">{body}</li>
  }
  return (
    <li className="flex gap-3 px-3 py-2.5 has-[:focus-visible]:bg-subtle">
      <Checkbox
        checked={!!checked}
        onCheckedChange={(v) => onCheck(!!v)}
        aria-label={`Add ${i.dir}`}
        className="mt-1"
      />
      {body}
    </li>
  )
}

// Add one project by its folder or compose file path.
function AddByPathDialog({
  server,
  open,
  onOpenChange,
}: {
  server: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const add = useAddProjects()
  const [path, setPath] = useState("/")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const typed = path.trim()
  const ok = typed.startsWith("/") && typed !== "/"

  const submit = () =>
    add.mutate(
      { server, items: [{ path: typed, name: name.trim() || undefined }] },
      {
        onSuccess: (r) => {
          if (r.added.length > 0) {
            toast.success(`Added ${r.added[0]}`)
            onOpenChange(false)
            setPath("/")
            setName("")
            setError("")
            router.push(projectHref(server, r.added[0]))
          } else {
            setError(r.problems[0]?.message ?? "It wasn't added")
          }
        },
        onError: (e) => setError(e.message),
      },
    )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a project by its path"
      description="Pick the folder that holds the compose file, or type the file's path. Nothing on the server changes: Morche lists it and runs compose there."
      className="sm:max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!ok || add.isPending} onClick={submit}>
            {add.isPending && <Loader2 className="animate-spin" />}
            Add project
          </Button>
        </div>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (ok) submit()
        }}
      >
        <FolderPicker
          lister={serverLister(server)}
          value={path}
          onChange={(p) => {
            setPath(p)
            setError("")
          }}
          className="h-56 md:h-64"
        />
        <div className="flex flex-col gap-1.5 text-body-sm">
          <label htmlFor="add-path" className="font-medium">
            Folder or compose file
          </label>
          <Input
            id="add-path"
            value={path}
            onChange={(e) => {
              setPath(e.target.value)
              setError("")
            }}
            placeholder="/srv/blog or /srv/blog/compose.prod.yml"
            className="font-mono"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={!!error}
          />
        </div>
        <div className="flex flex-col gap-1.5 text-body-sm">
          <label htmlFor="add-name" className="font-medium">
            Name <span className="font-normal text-ash">(optional)</span>
          </label>
          <Input
            id="add-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The one compose would give it"
            className="font-mono"
            autoCapitalize="off"
            spellCheck={false}
          />
          <span className="text-caption text-muted-foreground">
            Only when another project already has its name. Containers it
            already runs keep theirs.
          </span>
        </div>
        {error && (
          <p className="flex gap-1.5 text-body-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}
        <button type="submit" hidden />
      </form>
    </ResponsiveDialog>
  )
}
