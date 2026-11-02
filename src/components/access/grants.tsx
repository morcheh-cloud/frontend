"use client"

import {
  Boxes,
  HardDrive,
  type LucideIcon,
  Plus,
  Server,
  ShieldCheck,
  User,
  UsersRound,
  X,
} from "lucide-react"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { useAccess, useAuth } from "@/components/auth/auth"
import {
  LEVELS,
  type Level,
  levelHints,
  levelLabel,
  levelLabels,
  storageLevelHints,
} from "@/components/auth/level"
import { BottomSheet } from "@/components/bottom-sheet"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useIsPhone } from "@/hooks/useIsPhone"
import type { GrantBody, PanelGrant } from "@/lib/services"
import {
  type GrantPrincipal,
  type GrantScope,
  useDeleteGrant,
  useGrants,
  usePrincipals,
  useSetGrant,
} from "./api"
import { Choice } from "./choice"

export type ResourceKind = "workspace" | "server" | "storage"

const levelItems = LEVELS.map((l) => ({ value: l, label: levelLabels[l] }))

export const kindIcon: Record<ResourceKind, LucideIcon> = {
  workspace: Boxes,
  server: Server,
  storage: HardDrive,
}

export function hintsFor(kind: ResourceKind) {
  return kind === "storage" ? storageLevelHints : levelHints
}

function bodyOf(g: PanelGrant): GrantBody {
  return {
    level: g.level,
    user_id: g.user_id,
    group_id: g.group_id,
    workspace_id: g.workspace_id,
    server_id: g.server_id,
    storage_id: g.storage_id,
  }
}

export function targetOf(g: PanelGrant): { kind: ResourceKind; name: string } {
  if (g.server_id) return { kind: "server", name: g.server_name ?? "Server" }
  if (g.storage_id) {
    return { kind: "storage", name: g.storage_name ?? "Storage" }
  }
  return { kind: "workspace", name: g.workspace_name ?? "Workspace" }
}

function principalOf(g: PanelGrant) {
  if (g.group_id) {
    return {
      icon: UsersRound,
      name: g.group_name ?? "Group",
      detail: "Group",
    }
  }
  return {
    icon: User,
    name: g.full_name || g.username || "Member",
    detail: g.username ? `@${g.username}` : "",
  }
}

const failed = (err: Error) => toast.error(err.message)

// One grant: who or what it names, its level and, on a workspace, whether it
// may add servers there.
function GrantRow({
  icon: Icon,
  title,
  detail,
  grant,
  kind,
  readOnly,
  note,
}: {
  icon: LucideIcon
  title: string
  detail?: string
  grant: PanelGrant
  kind: ResourceKind
  readOnly?: boolean
  note?: string
}) {
  const { admin } = useAccess()
  const set = useSetGrant()
  const remove = useDeleteGrant()
  const busy = set.isPending || remove.isPending

  const changeLevel = (level: string) => {
    if (level === grant.level) return
    set.mutate(
      {
        ...bodyOf(grant),
        level: level as Level,
        // A new level starts from that level's default for adding servers.
        ...(admin && grant.workspace_id && { can_create: level === "owner" }),
      },
      { onError: failed },
    )
  }

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-3">
        <Icon className="size-4 shrink-0 text-ash" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-medium">{title}</p>
          {(detail || note) && (
            <p className="truncate text-caption text-muted-foreground">
              {[detail, note].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        {readOnly ? (
          <span className="shrink-0 text-body-sm text-muted-foreground">
            {levelLabel(grant.level)}
          </span>
        ) : (
          <>
            <Choice
              label={`Access level for ${title}`}
              value={grant.level}
              items={levelItems}
              disabled={busy}
              onChange={changeLevel}
              className="w-32 shrink-0"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove access for ${title}`}
              title="Remove access"
              disabled={busy}
              className="shrink-0 max-md:size-11"
              onClick={() => remove.mutate(grant.id, { onError: failed })}
            >
              <X />
            </Button>
          </>
        )}
      </div>
      {kind === "workspace" && admin && !readOnly && (
        // biome-ignore lint/a11y/noLabelWithoutControl: the Base UI switch renders the control inside
        <label className="flex items-center justify-between gap-3 ps-7 text-body-sm text-muted-foreground max-md:min-h-11">
          Can add servers and storage
          <Switch
            checked={grant.can_create}
            disabled={busy}
            onCheckedChange={(can_create) =>
              set.mutate({ ...bodyOf(grant), can_create }, { onError: failed })
            }
          />
        </label>
      )}
    </li>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-3">
      <Skeleton className="h-9 rounded-lg" />
      <Skeleton className="h-9 rounded-lg" />
    </div>
  )
}

function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <h2 className="text-body-sm font-medium">{title}</h2>
      {action}
    </div>
  )
}

// A level picker with what the chosen level allows spelled out under it.
function LevelField({
  value,
  kind,
  onChange,
}: {
  value: Level
  kind: ResourceKind
  onChange: (level: Level) => void
}) {
  return (
    <Field label="Access level" hint={hintsFor(kind)[value]}>
      {(props) => (
        <Choice
          id={props.id}
          value={value}
          items={levelItems}
          onChange={(next) => onChange(next as Level)}
        />
      )}
    </Field>
  )
}

export function CreateSwitch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the Base UI switch renders the control inside
    <label className="flex items-center justify-between gap-3 text-body-sm max-md:min-h-11">
      Can add servers and storage
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

function FormButtons({
  label,
  disabled,
  pending,
  onAdd,
  onCancel,
}: {
  label: string
  disabled?: boolean
  pending?: boolean
  onAdd: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" className="max-md:h-11" onClick={onCancel}>
        Cancel
      </Button>
      <Button
        className="max-md:h-11"
        disabled={disabled || pending}
        onClick={onAdd}
      >
        {pending ? "Adding…" : label}
      </Button>
    </div>
  )
}

function AddPrincipalForm({
  scope,
  kind,
  taken,
  onDone,
}: {
  scope: GrantScope
  kind: ResourceKind
  taken: Set<string>
  onDone: () => void
}) {
  const { admin } = useAccess()
  const principals = usePrincipals()
  const set = useSetGrant()
  const [picked, setPicked] = useState("")
  const [level, setLevel] = useState<Level>("viewer")
  const [canCreate, setCanCreate] = useState(false)

  const items = [
    ...(principals.data?.users ?? []).map((u) => ({
      value: `user:${u.id}`,
      label: u.full_name ? `${u.full_name} (@${u.username})` : u.username,
    })),
    ...(principals.data?.groups ?? []).map((g) => ({
      value: `group:${g.id}`,
      label: `${g.name} (group)`,
    })),
  ].filter((p) => !taken.has(p.value))

  const add = () => {
    const [type, id] = picked.split(":")
    set.mutate(
      {
        ...scope,
        ...(type === "user" ? { user_id: id } : { group_id: id }),
        level,
        ...(admin && kind === "workspace" && { can_create: canCreate }),
      },
      { onSuccess: onDone, onError: failed },
    )
  }

  return (
    <div className="my-2 flex flex-col gap-3 rounded-2xl border border-border p-4">
      <Field
        label="Person or group"
        error={principals.error?.message}
        hint={
          principals.isSuccess && items.length === 0
            ? "Everyone already has access here."
            : undefined
        }
      >
        {(props) => (
          <Choice
            id={props.id}
            value={picked}
            items={items}
            disabled={items.length === 0}
            placeholder="Choose…"
            onChange={setPicked}
          />
        )}
      </Field>
      <LevelField
        value={level}
        kind={kind}
        onChange={(next) => {
          setLevel(next)
          setCanCreate(next === "owner")
        }}
      />
      {admin && kind === "workspace" && (
        <CreateSwitch checked={canCreate} onChange={setCanCreate} />
      )}
      <FormButtons
        label="Add access"
        disabled={!picked}
        pending={set.isPending}
        onAdd={add}
        onCancel={onDone}
      />
    </div>
  )
}

// Who can reach one workspace, server or storage. A person who owns it can
// change the grants, except their own.
export function ResourceAccess({
  scope,
  kind,
  workspaceId,
}: {
  scope: GrantScope
  kind: ResourceKind
  // The resource's workspace: its grants apply here too, shown read-only.
  workspaceId?: string
}) {
  const { user } = useAuth()
  const { admin } = useAccess()
  const grants = useGrants(scope)
  // Refused unless this person also owns the workspace; then it just hides.
  const inherited = useGrants(
    { workspace_id: workspaceId },
    kind !== "workspace" && !!workspaceId,
  )
  const [adding, setAdding] = useState(false)

  const items = grants.data ?? []
  const taken = new Set(
    items.map((g) =>
      g.group_id ? `group:${g.group_id}` : `user:${g.user_id}`,
    ),
  )
  // On a workspace's own page its grants are already the list above.
  const fromWorkspace = kind === "workspace" ? [] : (inherited.data ?? [])

  return (
    <div className="flex flex-col gap-6">
      <section>
        <SectionHead
          title={kind === "workspace" ? "People and groups" : "Direct access"}
          action={
            !adding && (
              <Button
                variant="outline"
                size="sm"
                className="max-md:h-11"
                onClick={() => setAdding(true)}
              >
                <Plus />
                Add
              </Button>
            )
          }
        />
        {adding && (
          <AddPrincipalForm
            scope={scope}
            kind={kind}
            taken={taken}
            onDone={() => setAdding(false)}
          />
        )}
        {grants.isPending ? (
          <ListSkeleton />
        ) : grants.isError ? (
          <p className="py-3 text-body-sm text-destructive">
            {grants.error.message}
          </p>
        ) : items.length === 0 ? (
          <p className="py-3 text-body-sm text-muted-foreground">
            Nobody has been given access here directly. Admins always have it.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((g) => {
              const p = principalOf(g)
              const mine = !admin && g.user_id === user.id
              return (
                <GrantRow
                  key={g.id}
                  icon={p.icon}
                  title={p.name}
                  detail={p.detail}
                  grant={g}
                  kind={kind}
                  readOnly={mine}
                  note={mine ? "You" : undefined}
                />
              )
            })}
          </ul>
        )}
      </section>

      {fromWorkspace.length > 0 && (
        <section>
          <SectionHead title="From the workspace" />
          <p className="text-caption text-muted-foreground">
            They reach everything in the workspace. Change this on the
            workspace&apos;s page.
          </p>
          <ul className="divide-y divide-border">
            {fromWorkspace.map((g) => {
              const p = principalOf(g)
              return (
                <GrantRow
                  key={g.id}
                  icon={p.icon}
                  title={p.name}
                  detail={p.detail}
                  grant={g}
                  kind="workspace"
                  readOnly
                />
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

// What one person or group can reach, at a glance. Changing it happens on the
// access page `onManage` leads to. Admin only.
export function PrincipalAccess({
  principal,
  groupIds = [],
  note,
  onManage,
}: {
  principal: GrantPrincipal
  // The person's groups: their grants are listed below.
  groupIds?: string[]
  note?: string
  onManage: () => void
}) {
  // Everything at once: small, and it serves both lists below.
  const all = useGrants({})

  const items = all.data ?? []
  const direct = items.filter((g) =>
    principal.user_id
      ? g.user_id === principal.user_id
      : g.group_id === principal.group_id,
  )
  const inherited = items.filter(
    (g) => g.group_id && groupIds.includes(g.group_id),
  )

  return (
    <div className="flex flex-col gap-6">
      <section>
        <SectionHead
          title="Access"
          action={
            <Button
              variant="outline"
              size="sm"
              className="max-md:h-11"
              onClick={onManage}
            >
              <ShieldCheck />
              Manage access
            </Button>
          }
        />
        {note && <p className="text-caption text-muted-foreground">{note}</p>}
        {all.isPending ? (
          <ListSkeleton />
        ) : all.isError ? (
          <p className="py-3 text-body-sm text-destructive">
            {all.error.message}
          </p>
        ) : direct.length === 0 ? (
          <p className="py-3 text-body-sm text-muted-foreground">
            No direct access yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {direct.map((g) => {
              const t = targetOf(g)
              return (
                <GrantRow
                  key={g.id}
                  icon={kindIcon[t.kind]}
                  title={t.name}
                  grant={g}
                  kind={t.kind}
                  readOnly
                />
              )
            })}
          </ul>
        )}
      </section>

      {inherited.length > 0 && (
        <section>
          <SectionHead title="From groups" />
          <ul className="divide-y divide-border">
            {inherited.map((g) => {
              const t = targetOf(g)
              return (
                <GrantRow
                  key={g.id}
                  icon={kindIcon[t.kind]}
                  title={t.name}
                  detail={g.group_name}
                  grant={g}
                  kind={t.kind}
                  readOnly
                />
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

// A side sheet on desktop, a full bottom sheet on phones.
export function AccessLayer({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  footer?: ReactNode
  children: ReactNode
}) {
  const phone = useIsPhone()
  if (phone) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        footer={footer}
        full
      >
        <div className="px-2">
          {description && (
            <p className="-mt-1 mb-4 text-body-sm text-muted-foreground">
              {description}
            </p>
          )}
          {children}
        </div>
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="flex items-center gap-2 border-t border-border px-6 py-4">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
