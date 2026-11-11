"use client"

import { json, jsonParseLinter } from "@codemirror/lang-json"
import { linter } from "@codemirror/lint"
import { useQuery } from "@tanstack/react-query"
import CodeMirror from "@uiw/react-codemirror"
import {
  Copy,
  Eraser,
  Globe,
  Link2,
  Lock,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { editorTheme } from "@/app/(panel)/servers/[id]/components/ini-editor"
import { Facts } from "@/app/(panel)/servers/[id]/components/parts"
import { useCodeTheme } from "@/components/code-theme"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type { BucketDetails } from "@/lib/services"
import { useBucketChange } from "../../../api"
import {
  Block,
  Callout,
  DaysInput,
  OptionCards,
  publicUrl,
  SaveRow,
  type SectionProps,
  Unreadable,
} from "./parts"

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })
const toastError = (err: Error) => toast.error(err.message)

// ---- Overview: facts, versioning, tags, danger zone ----

export function OverviewSection({
  storage,
  bucket: b,
  can,
  onEmpty,
  onDelete,
}: SectionProps & {
  onEmpty?: () => void
  onDelete?: () => void
}) {
  // The bucket's size, shared with the file list's folder sizes.
  const path = b.fixed ? "/" : `/${b.name}`
  const size = useQuery({
    queryKey: ["storage-files", storage.id, "size", path],
    queryFn: ({ signal }) =>
      api.storageFiles
        .storageFolderSize(storage.id, { path }, { signal })
        .then((r) => r.size),
    enabled: !b.fixed || !storage.root_path,
    staleTime: 60_000,
    retry: false,
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="-mx-2">
        <Facts
          items={[
            { label: "Region", value: b.region || "Default" },
            {
              label: "Created",
              value: b.created ? dateFormat.format(new Date(b.created)) : "—",
            },
            {
              label: "Size",
              value:
                size.data !== undefined
                  ? formatSize(size.data)
                  : size.isFetching
                    ? "Calculating…"
                    : "—",
            },
            { label: "Access", value: accessLabel[b.access] },
            {
              label: "Versioning",
              value: versioningLabel[b.versioning],
            },
            {
              label: "Encryption",
              value: encryptionLabel[b.encryption],
            },
          ]}
        />
      </div>
      <Versioning storage={storage} bucket={b} can={can} />
      <Tags storage={storage} bucket={b} can={can} />
      {(onEmpty || onDelete) && (
        <Block
          title="Danger zone"
          description="These can't be undone. Objects under object lock retention stay until it runs out."
        >
          <div className="flex flex-col gap-2 rounded-2xl border border-destructive/20 p-4">
            {onEmpty && (
              <DangerRow
                title="Empty this bucket"
                hint="Deletes every object, old versions included. The bucket and its settings stay."
                label="Empty…"
                icon={<Eraser />}
                onClick={onEmpty}
              />
            )}
            {onDelete && (
              <DangerRow
                title="Delete this bucket"
                hint="Deletes every object and then the bucket itself."
                label="Delete…"
                icon={<Trash2 />}
                onClick={onDelete}
              />
            )}
          </div>
        </Block>
      )}
    </div>
  )
}

function DangerRow({
  title,
  hint,
  label,
  icon,
  onClick,
}: {
  title: string
  hint: string
  label: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1 text-body-sm">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{hint}</p>
      </div>
      <Button variant="outline" className="text-destructive" onClick={onClick}>
        {icon}
        {label}
      </Button>
    </div>
  )
}

export const accessLabel: Record<BucketDetails["access"], string> = {
  private: "Private",
  download: "Anyone with a link",
  public: "Public",
  custom: "Custom policy",
}

export const versioningLabel: Record<BucketDetails["versioning"], string> = {
  off: "Off",
  enabled: "On",
  suspended: "Paused",
}

export const encryptionLabel: Record<BucketDetails["encryption"], string> = {
  none: "None",
  "sse-s3": "SSE-S3",
  "sse-kms": "SSE-KMS",
}

function Versioning({ storage, bucket: b, can }: SectionProps) {
  const change = useBucketChange(storage.id, b.name)
  const on = b.versioning === "enabled"
  // Object lock needs versioning: it can't be paused.
  const locked = b.object_lock && on
  const set = (enabled: boolean) =>
    change.mutate(
      () =>
        api.storageBuckets.setStorageBucketVersioning(storage.id, b.name, {
          enabled,
        }),
      {
        onSuccess: () =>
          toast.success(enabled ? "Versioning is on" : "Versioning is paused"),
        onError: toastError,
      },
    )

  return (
    <Block
      title="Versioning"
      description={
        b.versioning === "suspended"
          ? "Paused: new writes replace objects, but the old versions kept so far stay until deleted."
          : on
            ? "Every overwrite and delete keeps the previous version, so a mistake can be undone. Old versions take space: pair it with a lifecycle rule."
            : "Off: an overwrite or delete is final. Once turned on, versioning can only be paused, not removed."
      }
      action={
        <Switch
          aria-label="Versioning"
          checked={on}
          disabled={
            !can.edit || change.isPending || locked || !!b.problems.versioning
          }
          onCheckedChange={set}
        />
      }
    >
      <Unreadable text={b.problems.versioning} />
      {locked && (
        <p className="text-caption text-ash">
          Object lock is on, so versioning can't be paused.
        </p>
      )}
    </Block>
  )
}

type TagRow = { key: string; value: string }
const toRows = (tags: Record<string, string>): TagRow[] =>
  Object.entries(tags)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, value }))

function Tags({ storage, bucket: b, can }: SectionProps) {
  const change = useBucketChange(storage.id, b.name)
  const [rows, setRows] = useState<TagRow[] | null>(null)
  const shown = rows ?? toRows(b.tags)
  const dirty = rows !== null
  const keys = shown.map((r) => r.key.trim())
  const duplicate = keys.find((k, i) => k && keys.indexOf(k) !== i)
  const update = (i: number, patch: Partial<TagRow>) =>
    setRows(shown.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const save = () => {
    const tags: Record<string, string> = {}
    for (const r of shown) if (r.key.trim()) tags[r.key.trim()] = r.value
    change.mutate(
      () =>
        api.storageBuckets.setStorageBucketTags(storage.id, b.name, { tags }),
      {
        onSuccess: () => {
          setRows(null)
          toast.success("Tags saved")
        },
        onError: toastError,
      },
    )
  }

  return (
    <Block
      title="Tags"
      description="Labels for billing and reports (team, project, environment)."
      action={
        can.edit &&
        !b.problems.tags && (
          <Button
            variant="outline"
            size="sm"
            className="max-md:h-9"
            disabled={shown.length >= 50}
            onClick={() => setRows([...shown, { key: "", value: "" }])}
          >
            <Plus />
            Add tag
          </Button>
        )
      }
    >
      <Unreadable text={b.problems.tags} />
      {shown.length === 0 && !b.problems.tags && (
        <p className="text-body-sm text-ash">No tags.</p>
      )}
      {shown.length > 0 && (
        <ul className="flex flex-col gap-2">
          {shown.map((r, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id while typed
            <li key={i} className="flex items-center gap-2">
              <Input
                aria-label="Key"
                placeholder="Key"
                value={r.key}
                readOnly={!can.edit}
                maxLength={128}
                onChange={(e) => update(i, { key: e.target.value })}
                className="min-w-0 flex-1 font-mono text-caption max-md:text-base"
              />
              <Input
                aria-label="Value"
                placeholder="Value"
                value={r.value}
                readOnly={!can.edit}
                maxLength={256}
                onChange={(e) => update(i, { value: e.target.value })}
                className="min-w-0 flex-[1.4] font-mono text-caption max-md:text-base"
              />
              {can.edit && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove tag ${r.key}`}
                  onClick={() => setRows(shown.filter((_, j) => j !== i))}
                  className="max-md:size-11"
                >
                  <X />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {duplicate && (
        <p className="text-caption text-destructive">
          The key “{duplicate}” is used twice.
        </p>
      )}
      <SaveRow
        dirty={dirty && !duplicate}
        pending={change.isPending}
        onSave={save}
        onReset={() => setRows(null)}
      />
    </Block>
  )
}

// ---- Access: who can read it without a key ----

export function AccessSection({ storage, bucket: b, can }: SectionProps) {
  const change = useBucketChange(storage.id, b.name)
  const codeTheme = useCodeTheme()
  const [access, setAccess] = useState<BucketDetails["access"] | null>(null)
  const [policy, setPolicy] = useState<string | null>(null)
  const chosen = access ?? b.access
  const text = policy ?? pretty(b.policy)
  const dirty =
    (access !== null && access !== b.access) ||
    (chosen === "custom" && policy !== null && policy !== pretty(b.policy))
  const badJson = chosen === "custom" && text.trim() !== "" && !isJson(text)
  const url = publicUrl(storage, b.name)

  const reset = () => {
    setAccess(null)
    setPolicy(null)
  }
  const save = () =>
    change.mutate(
      () =>
        api.storageBuckets.setStorageBucketAccess(storage.id, b.name, {
          access: chosen,
          ...(chosen === "custom" && { policy: text.trim() }),
        }),
      {
        onSuccess: (next) => {
          reset()
          toast.success(`Access: ${accessLabel[next.access]}`)
        },
        onError: toastError,
      },
    )

  return (
    <div className="flex flex-col gap-6">
      <Block
        title="Who can read it without a key"
        description="Signed-in access through Morche and access keys work either way. Share links (Share link… on a file) work on a private bucket too."
      >
        <Unreadable text={b.problems.policy} />
        {b.public_write && (
          <Callout tone="destructive">
            <p className="flex items-center gap-1.5 font-medium">
              <ShieldAlert className="size-4 text-destructive" />
              Anyone can write or delete in this bucket
            </p>
            <p className="text-muted-foreground">
              Its policy lets anonymous users change objects. Unless that is
              really meant, pick Private or Anyone with a link.
            </p>
          </Callout>
        )}
        <OptionCards
          label="Access"
          value={chosen}
          disabled={!can.own || change.isPending}
          onChange={(v) => {
            setAccess(v)
            if (v !== "custom") setPolicy(null)
          }}
          items={[
            {
              value: "private",
              label: "Private",
              icon: <Lock className="size-3.5 text-ash" />,
              hint: "Only people with an access key or a share link.",
            },
            {
              value: "download",
              label: "Anyone with a link",
              icon: <Link2 className="size-3.5 text-ash" />,
              hint: "Anyone who knows a file's address can download it; the list of files stays private.",
            },
            {
              value: "public",
              label: "Public",
              icon: <Globe className="size-3.5 text-ash" />,
              hint: "Anyone can list the files and download them, e.g. a public website's assets.",
            },
            {
              value: "custom",
              label: "Custom policy",
              hint: "Write the bucket policy (JSON) yourself.",
            },
          ]}
        />
        {!can.own && (
          <p className="text-caption text-ash">
            Only a storage Owner can change this.
          </p>
        )}
        {(chosen === "download" || chosen === "public") && (
          <Callout>
            <p>Files can be reached at</p>
            <p className="flex items-center gap-1">
              <code className="min-w-0 flex-1 truncate font-mono text-caption text-foreground">
                {url}
                <span className="text-ash">path/to/file</span>
              </code>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Copy address"
                onClick={() =>
                  navigator.clipboard
                    .writeText(url)
                    .then(() => toast.success("Address copied"))
                    .catch(() => toast.error("Couldn't access the clipboard"))
                }
              >
                <Copy />
              </Button>
            </p>
          </Callout>
        )}
      </Block>

      {(chosen === "custom" || b.policy) && (
        <Block
          title="Bucket policy"
          description={
            chosen === "custom"
              ? "Saved exactly as written. Empty removes the policy."
              : "Morche changes only the statements for anonymous users and keeps the rest."
          }
        >
          <CodeMirror
            theme={codeTheme}
            value={chosen === "custom" ? text : pretty(b.policy)}
            onChange={(v) => setPolicy(v)}
            readOnly={chosen !== "custom" || !can.own}
            extensions={[editorTheme, json(), linter(jsonParseLinter())]}
            basicSetup={{ foldGutter: false, highlightActiveLine: false }}
            height="18rem"
            className="overflow-hidden rounded-lg border border-border text-caption"
          />
          {badJson && (
            <p className="text-caption text-destructive">
              This isn't valid JSON yet.
            </p>
          )}
        </Block>
      )}

      <SaveRow
        dirty={dirty && !badJson}
        pending={change.isPending}
        onSave={save}
        onReset={reset}
      />
    </div>
  )
}

function pretty(policy: string) {
  if (!policy.trim()) return ""
  try {
    return JSON.stringify(JSON.parse(policy), null, 2)
  } catch {
    return policy
  }
}

function isJson(text: string) {
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

// ---- Security: default encryption and object lock ----

export function SecuritySection({ storage, bucket: b, can }: SectionProps) {
  return (
    <div className="flex flex-col gap-8">
      <Encryption storage={storage} bucket={b} can={can} />
      <Retention storage={storage} bucket={b} can={can} />
    </div>
  )
}

function Encryption({ storage, bucket: b, can }: SectionProps) {
  const change = useBucketChange(storage.id, b.name)
  const [mode, setMode] = useState<BucketDetails["encryption"] | null>(null)
  const [key, setKey] = useState<string | null>(null)
  const chosen = mode ?? b.encryption
  const kms = key ?? b.kms_key
  const dirty =
    (mode !== null && mode !== b.encryption) ||
    (chosen === "sse-kms" && key !== null && key !== b.kms_key)
  const reset = () => {
    setMode(null)
    setKey(null)
  }

  return (
    <Block
      title="Default encryption"
      description="How new objects are encrypted at rest. Objects already there keep what they were written with."
    >
      <Unreadable text={b.problems.encryption} />
      <OptionCards
        label="Default encryption"
        value={chosen}
        disabled={!can.own || change.isPending}
        onChange={setMode}
        items={[
          {
            value: "none",
            label: "None",
            hint: "The provider's own default (many encrypt everything anyway).",
          },
          {
            value: "sse-s3",
            label: "SSE-S3",
            hint: "Keys the provider manages. Nothing to set up on AWS; MinIO needs a KMS.",
          },
          {
            value: "sse-kms",
            label: "SSE-KMS",
            hint: "A key in the provider's key service, with its own access rules and audit log.",
          },
        ]}
      />
      {chosen === "sse-kms" && (
        <Field
          label="KMS key"
          hint="Its ID or ARN. Empty = the provider's default key."
        >
          {(p) => (
            <Input
              {...p}
              value={kms}
              readOnly={!can.own}
              onChange={(e) => setKey(e.target.value)}
              placeholder="arn:aws:kms:…"
              className="font-mono text-caption max-md:text-base"
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </Field>
      )}
      {!can.own && (
        <p className="text-caption text-ash">
          Only a storage Owner can change this.
        </p>
      )}
      <SaveRow
        dirty={dirty}
        pending={change.isPending}
        onReset={reset}
        onSave={() =>
          change.mutate(
            () =>
              api.storageBuckets.setStorageBucketEncryption(
                storage.id,
                b.name,
                {
                  mode: chosen,
                  ...(chosen === "sse-kms" && { kms_key: kms.trim() }),
                },
              ),
            {
              onSuccess: () => {
                reset()
                toast.success("Encryption saved")
              },
              onError: toastError,
            },
          )
        }
      />
    </Block>
  )
}

function Retention({ storage, bucket: b, can }: SectionProps) {
  const change = useBucketChange(storage.id, b.name)
  const [mode, setMode] = useState<BucketDetails["retention_mode"] | null>(null)
  const [days, setDays] = useState<number | null>(null)
  const chosen = mode ?? b.retention_mode
  const n = days ?? b.retention_days
  const dirty =
    (mode !== null && mode !== b.retention_mode) ||
    (chosen !== "" && days !== null && days !== b.retention_days)
  const reset = () => {
    setMode(null)
    setDays(null)
  }

  if (!b.object_lock) {
    return (
      <Block
        title="Object lock"
        description="Off. Object lock keeps objects from being deleted or overwritten for a set time (ransomware-proof backups). It can only be turned on when a bucket is made: make a new bucket with Object lock ticked and copy the data there."
      >
        <Unreadable text={b.problems.object_lock} />
      </Block>
    )
  }

  return (
    <Block
      title="Object lock retention"
      description="Object lock is on. A default retention keeps every new object for the days set below."
    >
      <OptionCards
        label="Default retention"
        value={chosen}
        disabled={!can.own || change.isPending}
        onChange={(v) => {
          setMode(v)
          if (v && !n) setDays(30)
        }}
        items={[
          {
            value: "",
            label: "None",
            hint: "Objects can be deleted as usual; a retention can still be set per object.",
          },
          {
            value: "GOVERNANCE",
            label: "Governance",
            hint: "Kept for the set days; a user with the special bypass permission can still remove them.",
          },
          {
            value: "COMPLIANCE",
            label: "Compliance",
            hint: "Nobody, the root account included, can delete or shorten it until the days pass.",
          },
        ]}
      />
      {chosen !== "" && (
        <Field label="Keep new objects for">
          {(p) => (
            <DaysInput
              {...p}
              value={n}
              onChange={setDays}
              disabled={!can.own}
            />
          )}
        </Field>
      )}
      {chosen === "COMPLIANCE" && (
        <Callout tone="warning">
          Compliance can't be undone for objects written while it's on: they
          stay, and are billed, for the full {n || "…"} days.
        </Callout>
      )}
      <SaveRow
        dirty={dirty && (chosen === "" || n > 0)}
        pending={change.isPending}
        onReset={reset}
        onSave={() =>
          change.mutate(
            () =>
              api.storageBuckets.setStorageBucketRetention(storage.id, b.name, {
                mode: chosen,
                days: chosen ? n : 0,
              }),
            {
              onSuccess: () => {
                reset()
                toast.success("Retention saved")
              },
              onError: toastError,
            },
          )
        }
      />
    </Block>
  )
}
