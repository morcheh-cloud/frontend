"use client"

import { ListChecks } from "lucide-react"
import Link from "next/link"
import { useQueryStates } from "nuqs"

import { Choice } from "@/app/(panel)/cronjobs/components/task-fields"
import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { automationsItem } from "@/components/panel/nav"
import { PageHeader } from "@/components/panel/page-header"
import { SectionLinks } from "@/components/panel/section-links"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { useIsPhone } from "@/hooks/useIsPhone"
import { cn } from "@/lib/utils"
import { useAutomations } from "../api"
import { LIST, runsParsers } from "./meta"
import { RunLayer, useRunParam } from "./run-layer"
import { RunsList, StatusFilter } from "./runs-list"

// /automations/runs: every run of the workspace's automations, newest
// first, filtered by automation and result in the URL.
export function RunsView() {
  const phone = useIsPhone()
  const { workspace } = useWorkspace()
  const list = useAutomations(workspace?.id)
  const [{ automation, status, page }, setQuery] = useQueryStates(runsParsers)
  const { run, open, close } = useRunParam()
  if (phone === null || !workspace) return null

  const items = list.data ?? []
  const picker = (
    <div className={cn(phone ? "min-w-0 flex-1" : "w-72")}>
      <Choice
        id="runs-automation"
        value={automation ?? ""}
        onChange={(v) => setQuery({ automation: v || null, page: null })}
        placeholder="All automations"
        items={items.map((a) => ({ value: a.id, label: a.name }))}
      />
    </div>
  )
  const filter = (
    <StatusFilter
      value={status}
      onChange={(s) => setQuery({ status: s, page: null })}
    />
  )

  return (
    <>
      <PageHeader title="Runs" guide="automations" />
      {phone && <SectionLinks item={automationsItem} className="mt-3" />}
      <div className={cn("flex flex-col gap-4 pb-24", !phone && "px-6 pt-5")}>
        {phone ? (
          <div className="flex flex-col gap-3 px-4 pt-4">
            {picker}
            <div className="-mx-4 flex [scrollbar-width:none] overflow-x-auto px-4">
              {filter}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {picker}
            {filter}
          </div>
        )}
        <section
          className={cn(
            phone
              ? "border-y border-border"
              : "rounded-2xl border border-border",
          )}
        >
          <RunsList
            ws={workspace.id}
            automation={automation ?? undefined}
            status={status}
            page={page}
            setPage={(p) => setQuery({ page: p === 1 ? null : p })}
            onOpen={open}
            phone={phone}
            showAutomation={!automation}
            empty={
              <Empty
                icon={ListChecks}
                title="No runs yet"
                className="md:border-0"
                body="Each time an automation starts (an event, its incoming URL, or Run now) its run shows here, step by step."
                action={
                  <Button
                    variant="outline"
                    className="h-11 w-full md:h-9 md:w-auto"
                    render={<Link href={LIST} />}
                    nativeButton={false}
                  >
                    Open automations
                  </Button>
                }
              />
            }
          />
        </section>
      </div>
      <RunLayer runId={run} onClose={close} phone={phone} showAutomation />
    </>
  )
}
