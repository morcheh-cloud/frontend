"use client"

import { FolderOpen, FolderSearch, Server } from "lucide-react"
import { useState } from "react"

import { Field } from "@/components/field"
import { FolderPicker } from "@/components/files/folder-picker"
import { serverLister } from "@/components/files/listers"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"

// What's wrong with a typed temporary folder (mirrors dbbackup.CheckTempDir).
export function tempDirProblem(dir: string) {
  const d = dir.trim()
  if (!d) return ""
  if (!d.startsWith("/")) return "Use an absolute path, like /var/tmp"
  if (d.length > 512) return "Use 512 characters or fewer"
  // biome-ignore lint/suspicious/noControlCharactersInRegex: that's the check
  if (/[\u0000-\u001f\u007f]/.test(d))
    return "The path has a character that can't be used"
  return ""
}

// Where a parallel PostgreSQL backup (pg_dump's directory format) is written
// before it's sent, or unpacked before it's loaded. It needs room for the
// whole dump, and /tmp is often small or kept in memory.
export function TempDirField({
  id,
  value,
  onChange,
  server: host,
  container,
  place,
  size,
  restore,
  placeholder = "Empty = /tmp",
  error,
}: {
  id: string
  value: string
  onChange: (dir: string) => void
  // The server it runs on, to browse; none = Morche's own machine.
  server?: { id: string; name: string }
  // The database's container: the script runs inside it, so the path is
  // one inside the container and the server's folders can't be browsed.
  container?: string
  // Says where it runs when no server is given ("where the plan runs").
  place?: string
  // What the database takes now, for the hint.
  size?: number | null
  restore?: boolean
  placeholder?: string
  error?: string
}) {
  const [browse, setBrowse] = useOpen(`temp-dir-${id}`)
  const [picked, setPicked] = useState("/")
  const server = container ? undefined : host
  const where = container
    ? `inside the container ${container}`
    : server
      ? `on ${server.name}`
      : (place ?? "on Morche's own machine")
  const boxed = container
    ? " Use a folder the container has mounted from the server: its own files sit on Docker's disk."
    : ""
  const room = size
    ? ` The server's databases take ${formatSize(size)} now; the dump is usually a good deal smaller once compressed.`
    : ""
  const hint = restore
    ? `The file is unpacked here ${where} before it's loaded, so it needs room for all of it.${boxed}`
    : `The dump is written here ${where} first, then sent, so it needs room for all of it.${room}${boxed || " Pick a folder on a big disk when /tmp is small or in memory."}`
  return (
    <>
      <Field label="Temporary folder" hint={hint} error={error}>
        {(f) => (
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <FolderOpen className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ash" />
              <Input
                {...f}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                className="ps-9 font-mono"
              />
            </div>
            {server && (
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0 md:h-10"
                onClick={() => {
                  setPicked(value.trim().startsWith("/") ? value.trim() : "/")
                  setBrowse(true)
                }}
              >
                <FolderSearch />
                Browse
              </Button>
            )}
          </div>
        )}
      </Field>
      {server && (
        <ResponsiveDialog
          open={browse}
          onOpenChange={setBrowse}
          title="Pick the temporary folder"
          description={`Folders on ${server.name}. The login Morche uses there must be able to write to it.`}
          className="sm:max-w-lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setBrowse(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onChange(picked)
                  setBrowse(false)
                }}
              >
                Use this folder
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <FolderPicker
              lister={serverLister(server.id)}
              value={picked}
              onChange={setPicked}
              rootLabel={server.name}
              rootIcon={<Server />}
              className="max-h-80"
            />
            <p className="truncate text-caption text-muted-foreground">
              Picked:{" "}
              <span className="font-mono text-foreground">{picked}</span>
            </p>
          </div>
        </ResponsiveDialog>
      )}
    </>
  )
}
