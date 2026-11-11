"use client"

import { Puzzle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useDeferredValue, useState } from "react"

import { afterClose, Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import { cn } from "@/lib/utils"
import { useAnsibleStatus, useModules } from "../../api"
import { useAnsibleFilters } from "../meta"
import { useAnsibleCan } from "../permissions"
import { searchModules } from "./meta"
import { ModuleDetailsLayer, newPlaybookWith, UseIcon } from "./module-details"
import { CategoryChips, ModuleList, popularOf } from "./module-list"

// The Modules tab of /ansible: every module installed with Ansible, by
// category, each with its options and examples.
export function ModulesPanel({ phone }: { phone: boolean }) {
  const can = useAnsibleCan()
  const router = useRouter()
  const status = useAnsibleStatus()
  const modules = useModules()
  const [{ q, cat }, setFilters] = useAnsibleFilters()
  const needle = useDeferredValue(q)
  const [picked, setPicked] = useState<string>()
  const [open, setOpen] = useOpen("ansible-module")

  if (status.data && !status.data.installed) {
    return (
      <Empty
        icon={Puzzle}
        title="Ansible isn't installed on the Morche host"
        body="The module list comes from the Ansible installed there. Install ansible-core (or the full ansible package) and come back."
      />
    )
  }
  if (modules.isError && !modules.data) {
    return (
      <Empty
        icon={Puzzle}
        title="Couldn't list the modules"
        body={modules.error.message}
        action={
          <Button
            variant="outline"
            className="h-11 w-full md:h-9 md:w-auto"
            onClick={() => modules.refetch()}
          >
            Try again
          </Button>
        }
      />
    )
  }
  if (!modules.data) {
    return (
      <div className={cn("flex flex-col gap-2", phone && "px-4")}>
        <Skeleton className="h-8 w-full rounded-full" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  const all = modules.data.items
  const items = searchModules(all, needle, cat || undefined)
  const grouped = !needle.trim() && !cat
  const onlyBuiltin = all.every((m) => m.collection === "ansible.builtin")

  return (
    <div className="flex flex-col gap-3">
      <CategoryChips
        items={all}
        value={cat}
        onChange={(c) => setFilters({ cat: c || null })}
        className={phone ? "px-4" : undefined}
      />
      {items.length === 0 ? (
        <Empty
          icon={Puzzle}
          title="No module matches"
          body="Try another word, or look in All."
        />
      ) : (
        <div
          className={cn(
            !phone && "overflow-hidden rounded-2xl border border-border",
            phone && "border-y border-border",
          )}
        >
          <ModuleList
            items={items}
            grouped={grouped}
            withPopular={grouped ? popularOf(all) : undefined}
            onPick={(m) => {
              setPicked(m.name)
              setOpen(true)
            }}
          />
        </div>
      )}
      <p className={cn("text-caption text-ash", phone && "px-4")}>
        {all.length} modules · ansible-core {modules.data.version}
        {onlyBuiltin &&
          ". Only Ansible's own modules are installed: install the full ansible package on the Morche host to get thousands more (Docker, MySQL, UFW…)."}
      </p>
      <ModuleDetailsLayer
        name={picked}
        open={open}
        onOpenChange={setOpen}
        phone={phone}
        action={
          can.edit
            ? (d) => (
                <Button
                  className="h-11 w-full md:h-9 md:w-auto"
                  onClick={() =>
                    afterClose(setOpen, () =>
                      router.push(newPlaybookWith(d.name)),
                    )
                  }
                >
                  <UseIcon />
                  Use in a new playbook
                </Button>
              )
            : undefined
        }
      />
    </div>
  )
}
