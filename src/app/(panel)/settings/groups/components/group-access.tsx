"use client"

import { ChevronLeft } from "lucide-react"
import { use, useMemo } from "react"
import { toast } from "sonner"
import { useAccessDraft } from "@/components/access/access-draft"
import { AccessEditor, AccessSaveBar } from "@/components/access/access-editor"
import { useGrants, useSaveGrants } from "@/components/access/api"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { PageHeader } from "@/components/panel/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import type { PanelGroup } from "@/lib/services"
import { useGroups } from "../../api"

export function GroupAccessView({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const phone = useIsPhone()
  const back = useBack("/settings/groups")
  const groups = useGroups()
  const grants = useGrants({})
  const group = groups.data?.find((g) => g.id === id)

  usePageCrumbs(
    useMemo(
      () =>
        group
          ? [{ label: group.name, href: `/settings/groups/${id}/access` }]
          : [],
      [group, id],
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
          Groups
        </button>
      )}
      {groups.isPending || grants.isPending ? (
        <div className="flex flex-col gap-3 p-4 md:p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : groups.isError || grants.isError || !group ? (
        <p className="px-4 py-6 text-body-sm text-destructive md:px-6">
          {groups.error?.message ??
            grants.error?.message ??
            "This group is gone."}
        </p>
      ) : (
        <Editor key={group.id} group={group} />
      )}
    </>
  )
}

function Editor({ group }: { group: PanelGroup }) {
  const all = useGrants({})
  const save = useSaveGrants()
  const direct = useMemo(
    () => (all.data ?? []).filter((g) => g.group_id === group.id),
    [all.data, group.id],
  )
  const draft = useAccessDraft(direct)

  const submit = () =>
    save.mutate(draft.ops({ group_id: group.id }), {
      onSuccess: (failures) => {
        draft.settle(failures)
        if (failures.length > 0) {
          toast.error(`${failures.length} changes weren't saved`, {
            description: failures[0].message,
          })
        } else toast.success("Access saved")
      },
    })

  return (
    <>
      <PageHeader title={`Access for ${group.name}`} guide="access" />
      <AccessEditor draft={draft} />
      <AccessSaveBar
        draft={draft}
        label="Save changes"
        pendingLabel="Saving…"
        pending={save.isPending}
        onSave={submit}
        onDiscard={draft.discard}
      />
    </>
  )
}
