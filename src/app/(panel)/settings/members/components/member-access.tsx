"use client"

import { ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { use, useMemo, useState } from "react"
import { toast } from "sonner"
import { useAccessDraft } from "@/components/access/access-draft"
import {
  AccessEditor,
  AccessSaveBar,
  TogglePill,
} from "@/components/access/access-editor"
import { useGrants, useSaveGrants } from "@/components/access/api"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { PageHeader } from "@/components/panel/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import type { PanelUser } from "@/lib/services"
import {
  failed,
  useApproveMember,
  useGroups,
  useMembers,
  useUpdateMember,
} from "../../api"
import { accessHref, displayName } from "./meta"

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id) => b.includes(id))

export function MemberAccessView({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const phone = useIsPhone()
  const back = useBack("/settings/members")
  const members = useMembers()
  const grants = useGrants({})
  const user = members.data?.items.find((u) => u.id === id)

  usePageCrumbs(
    useMemo(
      () => (user ? [{ label: displayName(user), href: accessHref(id) }] : []),
      [user, id],
    ),
  )

  if (phone === null) return null

  return (
    <>
      {phone && (
        <button
          type="button"
          className="flex h-11 items-center gap-1 px-2 text-body-sm"
          onClick={back}
        >
          <ChevronLeft className="size-5" />
          Members
        </button>
      )}
      {members.isPending || grants.isPending ? (
        <div className="flex flex-col gap-3 p-4 md:p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : members.isError || grants.isError || !user ? (
        <p className="px-4 py-6 text-body-sm text-destructive md:px-6">
          {members.error?.message ??
            grants.error?.message ??
            "This member is gone."}
        </p>
      ) : (
        <Editor key={user.id} user={user} />
      )}
    </>
  )
}

function Editor({ user }: { user: PanelUser }) {
  const router = useRouter()
  const all = useGrants({})
  const groups = useGroups()
  const update = useUpdateMember()
  const approve = useApproveMember()
  const save = useSaveGrants()
  const name = displayName(user)
  const waiting = user.status === "pending"

  const items = all.data ?? []
  const direct = useMemo(
    () => (all.data ?? []).filter((g) => g.user_id === user.id),
    [all.data, user.id],
  )
  const draft = useAccessDraft(direct)
  const saved = user.group_ids ?? []
  const [groupIds, setGroupIds] = useState(saved)
  const groupsChanged = !sameIds(groupIds, saved)
  const inherited = items.filter(
    (g) => g.group_id && groupIds.includes(g.group_id),
  )
  const pending = update.isPending || approve.isPending || save.isPending

  const submit = async () => {
    if (waiting) {
      approve.mutate(
        { id: user.id, group_ids: groupIds, grants: draft.specs() },
        {
          onSuccess: () => {
            toast.success("Member approved")
            router.replace("/settings/members")
          },
          onError: failed,
        },
      )
      return
    }
    try {
      if (groupsChanged) {
        await update.mutateAsync({ id: user.id, group_ids: groupIds })
      }
      const failures = await save.mutateAsync(draft.ops({ user_id: user.id }))
      draft.settle(failures)
      if (failures.length > 0) {
        toast.error(`${failures.length} changes weren't saved`, {
          description: failures[0].message,
        })
      } else toast.success("Access saved")
    } catch (err) {
      failed(err as Error)
    }
  }

  return (
    <>
      <PageHeader
        title={waiting ? `Approve ${name}` : `Access for ${name}`}
        guide="access"
        description={
          waiting
            ? `${user.email} · @${user.username}. Choose what they can reach; you can change it any time.`
            : `@${user.username}. Tick what they can reach, then save.`
        }
      />
      {user.role === "admin" && (
        <p className="mx-4 mt-4 rounded-lg bg-subtle px-3 py-2 text-body-sm text-muted-foreground md:mx-6">
          Admins have full access everywhere. This only counts if they stop
          being one.
        </p>
      )}
      <AccessEditor
        draft={draft}
        inherited={inherited}
        aside={
          (groups.data ?? []).length > 0 && (
            <section>
              <h2 className="mb-2 flex min-h-9 items-center text-body-sm font-medium">
                Groups
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {(groups.data ?? []).map((g) => {
                  const on = groupIds.includes(g.id)
                  return (
                    <TogglePill
                      key={g.id}
                      pressed={on}
                      onClick={() =>
                        setGroupIds(
                          on
                            ? groupIds.filter((id) => id !== g.id)
                            : [...groupIds, g.id],
                        )
                      }
                    >
                      {g.name}
                    </TogglePill>
                  )
                })}
              </div>
            </section>
          )
        }
      />
      <AccessSaveBar
        draft={draft}
        extra={groupsChanged ? ["Groups changed"] : []}
        label={waiting ? "Approve" : "Save changes"}
        pendingLabel={waiting ? "Approving…" : "Saving…"}
        pending={pending}
        alwaysOn={waiting}
        onSave={submit}
        onDiscard={() => {
          draft.discard()
          setGroupIds(saved)
        }}
      />
    </>
  )
}
