"use client"

import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, Brush, Info } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Choice } from "@/components/access/choice"
import { storagesQuery } from "@/components/panel/problems"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { formatSize } from "@/lib/format"
import type { DockerAutoPrune } from "@/lib/services"
import { useChannels } from "../../alerts/api"
import { timeAgo } from "../../servers/components/meta"
import { ChannelPicker } from "../../uptime/components/monitor-editor"
import { useDockerActions } from "./docker-actions"
import { ChoiceChip } from "./kit"
import {
  backupKeep,
  defaults,
  logKey,
  logPresets,
  type Overrides,
  periods,
  pick,
  pruneEvery,
  pruneImages,
  pruneOlder,
  restartChoices,
  type SettingKey,
  type Settings,
  statsKeep,
  updateEvery,
  versionsKeep,
  vulnLevels,
} from "./settings-model"
import { type FieldState, Group, NumberField, Row } from "./settings-parts"
import { VOLUME_FOLDER } from "./volume-backups"

// What every section needs: the values shown (the workspace's, or an
// environment's with its own on top), a setter for the scope in view, and
// each row's state.
export type Ctl = {
  ws: { id: string; name: string }
  phone: boolean
  edit: boolean
  env?: { id: string; name: string; prune?: DockerAutoPrune }
  value: Settings
  set: (patch: Overrides) => void
  field: (...keys: SettingKey[]) => FieldState
  error: (k: SettingKey) => string | undefined
}

const mono = {
  className: "font-mono",
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const

// A switch wired to a row's label and hint.
function RowSwitch({
  p,
  checked,
  onChange,
}: {
  p: { id: string; "aria-describedby"?: string }
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <Switch
      id={p.id}
      aria-describedby={p["aria-describedby"]}
      checked={checked}
      onCheckedChange={onChange}
    />
  )
}

export function SettingsSections({ ctl }: { ctl: Ctl }) {
  return (
    <>
      <ProjectsSection ctl={ctl} />
      <NewProjectsSection ctl={ctl} />
      <UpdatesSection ctl={ctl} />
      <ScansSection ctl={ctl} />
      <NotificationsSection ctl={ctl} />
      <CleanupSection ctl={ctl} />
      <BackupsSection ctl={ctl} />
      <EventsSection ctl={ctl} />
      <HistorySection ctl={ctl} />
    </>
  )
}

function ProjectsSection({ ctl }: { ctl: Ctl }) {
  const { value: v, set, field, error, phone } = ctl
  const dir = v.projects_dir.trim().replace(/\/+$/, "") || "…"
  return (
    <Group
      id="projects"
      description="Where compose projects live and what deploying one does."
      link={{ href: "/containers/projects", label: "Projects" }}
    >
      <Row
        label="Projects folder"
        hint="Where a new compose project is saved on each server, one folder per project. Projects already made stay where they are."
        error={error("projects_dir")}
        phone={phone}
        state={field("projects_dir")}
      >
        {(p) => (
          <div className="flex flex-col gap-1.5">
            <Input
              {...p}
              {...mono}
              value={v.projects_dir}
              onChange={(e) => set({ projects_dir: e.target.value })}
              placeholder={defaults.projects_dir}
              inputMode="url"
            />
            {!error("projects_dir") && (
              <p className="text-caption break-all text-ash">
                For example{" "}
                <span className="font-mono text-muted-foreground">
                  {dir}/shop/compose.yaml
                </span>
              </p>
            )}
          </div>
        )}
      </Row>
      <Row
        label="Remove leftover containers"
        hint={
          <>
            When a service is taken out of the compose file, deploying removes
            its old container (compose&apos;s{" "}
            <code className="font-mono whitespace-nowrap">
              --remove-orphans
            </code>
            ). Off leaves them running until you remove them.
          </>
        }
        phone={phone}
        inline
        state={field("remove_orphans")}
      >
        {(p) => (
          <RowSwitch
            p={p}
            checked={v.remove_orphans}
            onChange={(on) => set({ remove_orphans: on })}
          />
        )}
      </Row>
      <Row
        label="Versions kept per project"
        hint="Every save of a compose or .env file keeps a version you can compare and put back in History. The oldest go once there are more."
        phone={phone}
        inline
        state={field("versions_keep")}
      >
        {() => (
          <ChoiceChip
            phone={phone}
            label="Versions"
            value={pick(versionsKeep, v.versions_keep)}
            options={versionsKeep}
            onChange={(x) => set({ versions_keep: Number(x) })}
          />
        )}
      </Row>
    </Group>
  )
}

const CUSTOM = "custom"

function NewProjectsSection({ ctl }: { ctl: Ctl }) {
  const { value: v, set, field, error, phone } = ctl
  const restart =
    restartChoices.find((c) => c.value === v.default_restart) ??
    restartChoices[0]
  const key = logKey(v.default_log_max_mb, v.default_log_files)
  const preset = logPresets.some((p) => logKey(p.size, p.files) === key)
  const [custom, setCustom] = useState(!preset)
  const showCustom = custom || !preset
  const logOptions = [
    ...logPresets.map((p) => ({
      value: logKey(p.size, p.files),
      label: p.label,
    })),
    { value: CUSTOM, label: "Your own sizes" },
  ]
  const added = [
    v.default_restart && `restart: ${v.default_restart}`,
    v.default_memory_mb > 0 && `memory ${v.default_memory_mb} MB`,
    v.default_cpus > 0 && `${v.default_cpus} CPUs`,
    v.default_log_max_mb > 0 &&
      `logs ${v.default_log_max_mb} MB × ${v.default_log_files || 1}`,
  ].filter(Boolean)
  return (
    <Group
      id="new-projects"
      description={
        added.length
          ? `Written into each service of a new project that doesn't set it: ${added.join(", ")}. You can turn it off while making one.`
          : "Good habits written into each service of a new project that doesn't set them itself. Nothing is added yet."
      }
      link={{ href: "/containers/projects", label: "Projects" }}
    >
      <Row
        label="Restart policy"
        hint={restart.hint}
        phone={phone}
        inline
        state={field("default_restart")}
      >
        {() => (
          <ChoiceChip
            phone={phone}
            label="Restart"
            value={v.default_restart}
            options={restartChoices}
            onChange={(x) => set({ default_restart: x })}
          />
        )}
      </Row>
      <Row
        label="Memory limit"
        hint="A service that tries to use more is stopped by the kernel and restarted, instead of slowing the whole server. Blank = no limit."
        error={error("default_memory_mb")}
        phone={phone}
        state={field("default_memory_mb")}
      >
        {(p) => (
          <NumberField
            {...p}
            unit="MB"
            placeholder="No limit"
            value={v.default_memory_mb}
            onChange={(n) => set({ default_memory_mb: n })}
          />
        )}
      </Row>
      <Row
        label="CPU limit"
        hint="How many cores' worth one service may use, like 0.5 or 2. Blank = as many as it wants."
        error={error("default_cpus")}
        phone={phone}
        state={field("default_cpus")}
      >
        {(p) => (
          <NumberField
            {...p}
            unit="CPUs"
            step="0.1"
            placeholder="No limit"
            value={v.default_cpus}
            onChange={(n) => set({ default_cpus: n })}
          />
        )}
      </Row>
      <Row
        label="Log rotation"
        hint="Docker keeps every line a container prints in one file that never stops growing. Rotation starts a new file at this size and keeps only the last few."
        phone={phone}
        state={field("default_log_max_mb", "default_log_files")}
      >
        {(p) => (
          <div className="flex flex-col gap-2">
            <Choice
              id={p.id}
              label="Log rotation"
              value={showCustom ? CUSTOM : key}
              items={logOptions}
              onChange={(x) => {
                if (x === CUSTOM) {
                  setCustom(true)
                  if (!v.default_log_max_mb)
                    set({ default_log_max_mb: 10, default_log_files: 3 })
                  return
                }
                setCustom(false)
                const [size, files] = x.split("x").map(Number)
                set({ default_log_max_mb: size, default_log_files: files })
              }}
            />
            {showCustom && (
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  id={`${p.id}-size`}
                  unit="MB"
                  placeholder="Size"
                  value={v.default_log_max_mb}
                  onChange={(n) => set({ default_log_max_mb: n })}
                />
                <NumberField
                  id={`${p.id}-files`}
                  unit="files"
                  placeholder="Files"
                  value={v.default_log_files}
                  onChange={(n) => set({ default_log_files: n })}
                />
              </div>
            )}
            {v.default_log_max_mb > 0 && (
              <p className="text-caption text-ash">
                At most{" "}
                {formatSize(
                  v.default_log_max_mb *
                    Math.max(1, v.default_log_files) *
                    1024 *
                    1024,
                )}{" "}
                of logs per container.
              </p>
            )}
          </div>
        )}
      </Row>
    </Group>
  )
}

function UpdatesSection({ ctl }: { ctl: Ctl }) {
  const { value: v, set, field, phone } = ctl
  return (
    <Group
      id="updates"
      description="Asks each registry whether a running image has a newer version. Nothing is pulled on its own."
      link={{ href: "/containers/updates", label: "Updates" }}
    >
      <Row
        label="Check automatically"
        hint="Only servers whose images were checked once before are asked, so servers without Docker are left alone."
        phone={phone}
        inline
        state={field("update_check")}
      >
        {(p) => (
          <RowSwitch
            p={p}
            checked={v.update_check}
            onChange={(on) => set({ update_check: on })}
          />
        )}
      </Row>
      <fieldset disabled={!v.update_check} className="contents">
        <Row
          label="How often"
          hint={
            v.update_check
              ? "More often finds updates sooner; Docker Hub limits how many times an address can ask, so busy fleets do better with once a day."
              : "Turn on the automatic check to pick how often it runs."
          }
          phone={phone}
          inline
          muted={!v.update_check}
          state={field("update_check_hours")}
        >
          {() => (
            <ChoiceChip
              phone={phone}
              label="Check"
              value={pick(updateEvery, v.update_check_hours)}
              options={updateEvery}
              onChange={(x) =>
                set({
                  update_check_hours: Number(
                    x,
                  ) as Settings["update_check_hours"],
                })
              }
            />
          )}
        </Row>
      </fieldset>
    </Group>
  )
}

function ScansSection({ ctl }: { ctl: Ctl }) {
  const { value: v, set, field, error, phone } = ctl
  return (
    <Group
      id="scans"
      description="Images are scanned with Trivy: the one installed on the server, or else the image below in a throwaway container."
      link={{ href: "/containers/security", label: "Security" }}
    >
      <Row
        label="Scanner image"
        hint="Pin a version (aquasec/trivy:0.58.1) to keep results steady between scans; the database it downloads is cached on each server."
        error={error("scanner_image")}
        phone={phone}
        state={field("scanner_image")}
      >
        {(p) => (
          <Input
            {...p}
            {...mono}
            value={v.scanner_image}
            onChange={(e) => set({ scanner_image: e.target.value })}
            placeholder={defaults.scanner_image}
          />
        )}
      </Row>
      <Row
        label="Only problems with a fix"
        hint="Leave out vulnerabilities that have no fixed version yet, so the counts show what an update can solve. Applies from the next scan."
        phone={phone}
        inline
        state={field("scan_ignore_unfixed")}
      >
        {(p) => (
          <RowSwitch
            p={p}
            checked={v.scan_ignore_unfixed}
            onChange={(on) => set({ scan_ignore_unfixed: on })}
          />
        )}
      </Row>
    </Group>
  )
}

function NotificationsSection({ ctl }: { ctl: Ctl }) {
  const { value: v, set, field, error, phone, ws } = ctl
  const channels = useChannels(ws.id)
  const anyOn = v.notify_updates || v.notify_vulns !== "off"
  return (
    <Group
      id="notifications"
      description="Messages to the workspace's alert channels when something needs a look, so nobody has to keep the Updates and Security pages open."
      link={{ href: "/alerts?tab=channels", label: "Alerts" }}
    >
      <Row
        label="New image updates"
        hint={
          v.update_check
            ? "One message per check that finds updates not reported before, grouped by server."
            : "The automatic check under Image updates is off, so nothing new is found to tell about."
        }
        phone={phone}
        inline
        state={field("notify_updates")}
      >
        {(p) => (
          <RowSwitch
            p={p}
            checked={v.notify_updates}
            onChange={(on) => set({ notify_updates: on })}
          />
        )}
      </Row>
      <Row
        label="Vulnerabilities found"
        hint="After a scan, a message for each image with problems at this level or worse that weren't there before."
        phone={phone}
        inline
        state={field("notify_vulns")}
      >
        {() => (
          <ChoiceChip
            phone={phone}
            label="Notify"
            value={v.notify_vulns}
            options={vulnLevels}
            onChange={(x) => set({ notify_vulns: x })}
          />
        )}
      </Row>
      <Row
        label="Send to"
        hint={
          anyOn
            ? "Every channel ticked gets each message."
            : "Turn on one of the messages above to send them somewhere."
        }
        phone={phone}
        stack
        muted={!anyOn}
        state={field("notify_channels")}
      >
        {() => (
          <ChannelPicker
            ws={ws.id}
            query={channels}
            value={v.notify_channels}
            onChange={(ids) => set({ notify_channels: ids })}
            error={error("notify_channels")}
            empty="add one to get these messages."
          />
        )}
      </Row>
    </Group>
  )
}

function CleanupSection({ ctl }: { ctl: Ctl }) {
  const { value: v, set, field, phone, env, edit } = ctl
  const a = useDockerActions()
  const images =
    pruneImages.find((c) => c.value === v.prune_images) ?? pruneImages[0]
  const off = !v.prune_auto
  const last = env?.prune
  return (
    <Group
      id="cleanup"
      description="Removes what Docker leaves behind on each server, as the Clean up dialog does, on a schedule. Volumes are never touched: they hold data."
    >
      <Row
        label="Clean up automatically"
        hint={
          env
            ? "Runs on this server while it's online."
            : "Runs on every server with Docker while it's online, each on its own clock."
        }
        phone={phone}
        inline
        state={field("prune_auto")}
      >
        {(p) => (
          <RowSwitch
            p={p}
            checked={v.prune_auto}
            onChange={(on) => set({ prune_auto: on })}
          />
        )}
      </Row>
      <fieldset disabled={off} className="contents">
        <Row
          label="How often"
          phone={phone}
          inline
          muted={off}
          state={field("prune_hours")}
        >
          {() => (
            <ChoiceChip
              phone={phone}
              label="Every"
              value={pick(pruneEvery, v.prune_hours)}
              options={pruneEvery}
              onChange={(x) =>
                set({ prune_hours: Number(x) as Settings["prune_hours"] })
              }
            />
          )}
        </Row>
        <Row
          label="Images"
          hint={images.hint}
          phone={phone}
          inline
          muted={off}
          state={field("prune_images")}
        >
          {() => (
            <ChoiceChip
              phone={phone}
              label="Images"
              value={v.prune_images}
              options={pruneImages}
              onChange={(x) => set({ prune_images: x })}
            />
          )}
        </Row>
        <Row
          label="Stopped containers"
          hint="Removes containers that aren't running. Off by default: a stopped one may be kept on purpose."
          phone={phone}
          inline
          muted={off}
          state={field("prune_containers")}
        >
          {(p) => (
            <RowSwitch
              p={p}
              checked={v.prune_containers}
              onChange={(on) => set({ prune_containers: on })}
            />
          )}
        </Row>
        <Row
          label="Unused networks"
          hint="Networks no container is attached to."
          phone={phone}
          inline
          muted={off}
          state={field("prune_networks")}
        >
          {(p) => (
            <RowSwitch
              p={p}
              checked={v.prune_networks}
              onChange={(on) => set({ prune_networks: on })}
            />
          )}
        </Row>
        <Row
          label="Build cache"
          hint="Layers kept from earlier builds; the next build may take longer."
          phone={phone}
          inline
          muted={off}
          state={field("prune_build_cache")}
        >
          {(p) => (
            <RowSwitch
              p={p}
              checked={v.prune_build_cache}
              onChange={(on) => set({ prune_build_cache: on })}
            />
          )}
        </Row>
        <Row
          label="Only what's older than"
          hint="Leaves recent leftovers alone, so a deploy in progress never loses what it just pulled."
          phone={phone}
          inline
          muted={off}
          state={field("prune_older_hours")}
        >
          {() => (
            <ChoiceChip
              phone={phone}
              label="Age"
              value={pick(pruneOlder, v.prune_older_hours)}
              options={pruneOlder}
              onChange={(x) =>
                set({
                  prune_older_hours: Number(x) as Settings["prune_older_hours"],
                })
              }
            />
          )}
        </Row>
      </fieldset>
      {env && (
        <div className="flex flex-wrap items-center gap-3 p-4 md:px-5">
          <div className="flex min-w-0 flex-1 items-start gap-2 text-caption text-muted-foreground">
            {last?.error ? (
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            ) : (
              <Info className="mt-0.5 size-3.5 shrink-0 text-ash" />
            )}
            <span className="min-w-0">
              {!last ? (
                "No automatic clean-up has run on this server yet."
              ) : last.error ? (
                <>
                  The last one, {timeAgo(last.at)}, failed:{" "}
                  <span className="text-destructive">{last.error}</span>
                </>
              ) : (
                <>
                  Last ran {timeAgo(last.at)}:{" "}
                  {last.removed === 0
                    ? "nothing to remove."
                    : `${last.removed} removed, ${formatSize(last.space)} freed.`}
                </>
              )}
            </span>
          </div>
          {edit && (
            <Button
              variant="outline"
              size="sm"
              className="max-md:h-11"
              onClick={() =>
                a.prune(env.id, {
                  images: v.prune_images,
                  containers: v.prune_containers,
                  networks: v.prune_networks,
                  build_cache: v.prune_build_cache,
                  volumes: "none",
                })
              }
            >
              <Brush />
              Clean up now…
            </Button>
          )}
        </div>
      )}
    </Group>
  )
}

// Choice can't hold an empty value: stands for "no storage picked".
const FIRST = "first"

function BackupsSection({ ctl }: { ctl: Ctl }) {
  const { value: v, set, field, error, phone, ws } = ctl
  const list = useQuery(storagesQuery)
  const storages = (list.data?.items ?? []).filter(
    (s) => s.workspace_id === ws.id && !s.read_only,
  )
  const gone =
    !!v.backup_storage_id &&
    !list.isPending &&
    !storages.some((s) => s.id === v.backup_storage_id)
  const items = [
    { value: FIRST, label: "The first one listed" },
    ...storages.map((s) => ({ value: s.id, label: s.name })),
    ...(gone
      ? [{ value: v.backup_storage_id, label: "A removed storage" }]
      : []),
  ]
  return (
    <Group
      id="backups"
      description="What the Back up dialog starts with when you copy a volume to a storage. You can still change it each time."
      link={{ href: "/containers/volumes", label: "Volumes" }}
    >
      <Row
        label="Storage"
        hint={
          storages.length === 0 && !list.isPending ? (
            <>
              No writable storage in {ws.name} yet.{" "}
              <Link href="/storage" className="text-brand hover:underline">
                Add one
              </Link>{" "}
              to back volumes up.
            </>
          ) : gone ? (
            "That storage is gone or read-only now; pick another."
          ) : (
            "Where copies go. Only writable storages of this workspace are listed."
          )
        }
        error={error("backup_storage_id")}
        phone={phone}
        state={field("backup_storage_id")}
      >
        {(p) => (
          <Choice
            id={p.id}
            label="Storage"
            value={v.backup_storage_id || FIRST}
            items={items}
            onChange={(x) => set({ backup_storage_id: x === FIRST ? "" : x })}
          />
        )}
      </Row>
      <Row
        label="Folder"
        hint="Inside the storage; each volume gets its own file named after the server, the volume and the time."
        error={error("backup_folder")}
        phone={phone}
        state={field("backup_folder")}
      >
        {(p) => (
          <Input
            {...p}
            {...mono}
            value={v.backup_folder}
            onChange={(e) => set({ backup_folder: e.target.value })}
            placeholder={VOLUME_FOLDER}
          />
        )}
      </Row>
      <Row
        label="Stop containers while copying"
        hint="Gives a consistent copy of a database's files; its containers are down for the length of the copy and started again after."
        phone={phone}
        inline
        state={field("backup_stop")}
      >
        {(p) => (
          <RowSwitch
            p={p}
            checked={v.backup_stop}
            onChange={(on) => set({ backup_stop: on })}
          />
        )}
      </Row>
      <Row
        label="Copies kept per volume"
        hint="Of backups made by hand: after a new copy, the oldest of the same volume are removed from the storage. Scheduled backups (Cron jobs) keep their own count."
        phone={phone}
        inline
        state={field("backup_keep")}
      >
        {() => (
          <ChoiceChip
            phone={phone}
            label="Copies"
            value={pick(backupKeep, v.backup_keep)}
            options={backupKeep}
            onChange={(x) => set({ backup_keep: Number(x) })}
          />
        )}
      </Row>
    </Group>
  )
}

function EventsSection({ ctl }: { ctl: Ctl }) {
  const { value: v, set, field, phone } = ctl
  return (
    <Group
      id="events"
      description="Docker keeps its events in memory; the event log reads them from each server when it opens."
      link={{ href: "/containers/events", label: "Event log" }}
    >
      <Row
        label="Starting period"
        hint="How far back the event log reads when it opens. Longer periods take a little longer on busy servers."
        phone={phone}
        inline
        state={field("events_hours")}
      >
        {() => (
          <ChoiceChip
            phone={phone}
            label="Period"
            value={pick(periods, v.events_hours)}
            options={periods}
            onChange={(x) => set({ events_hours: Number(x) })}
          />
        )}
      </Row>
    </Group>
  )
}

function HistorySection({ ctl }: { ctl: Ctl }) {
  const { value: v, set, field, phone } = ctl
  return (
    <Group
      id="history"
      description="Every 5 minutes Morche notes each project's CPU, memory and network for the charts on its Overview."
    >
      <Row
        label="Keep numbers for"
        hint={
          v.stats_days === 0
            ? "Off: nothing new is recorded, and what was kept is removed."
            : "What's older is removed. Longer keeps more to compare with, at a little database space per project."
        }
        phone={phone}
        inline
        state={field("stats_days")}
      >
        {() => (
          <ChoiceChip
            phone={phone}
            label="Keep"
            value={pick(statsKeep, v.stats_days)}
            options={statsKeep}
            onChange={(x) => set({ stats_days: Number(x) })}
          />
        )}
      </Row>
    </Group>
  )
}
