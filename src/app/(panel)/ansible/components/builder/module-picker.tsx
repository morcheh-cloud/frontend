"use client"

import { Puzzle } from "lucide-react"
import { useCallback, useDeferredValue, useState } from "react"

import { Empty, SearchBox } from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import type { Module } from "@/lib/services"
import { useModules } from "../../api"
import { searchModules } from "../modules/meta"
import { CategoryChips, ModuleList, popularOf } from "../modules/module-list"

const focusOnDesktop = (el: HTMLInputElement | null) => {
  if (el && window.matchMedia("(pointer: fine)").matches) el.focus()
}

// Pick a module for a new (or changed) task: a wide dialog on desktop, a full
// bottom sheet on phones. Drive `open` with useOpen.
export function ModulePicker({
  open,
  onOpenChange,
  phone,
  onPick,
  title = "Add a task",
  selected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  phone: boolean
  onPick: (m: Module) => void
  title?: string
  selected?: string
}) {
  const [q, setQ] = useState("")
  const [cat, setCat] = useState("")
  const needle = useDeferredValue(q)
  const modules = useModules()
  const all = modules.data?.items ?? []
  const items = searchModules(all, needle, cat || undefined)
  const grouped = !needle.trim() && !cat
  const pick = useCallback(
    (m: Module) => {
      onPick(m)
      setQ("")
    },
    [onPick],
  )

  const search = (
    <SearchBox
      value={q}
      onChange={setQ}
      placeholder="Search modules: apt, copy, service…"
      label="Search modules"
      className="md:w-full"
      inputRef={focusOnDesktop}
      onKeyDown={(e) => {
        if (e.key === "Enter" && items[0] && needle.trim()) {
          e.preventDefault()
          pick(items[0])
        }
      }}
    />
  )
  const chips = <CategoryChips items={all} value={cat} onChange={setCat} />
  const list = modules.isError ? (
    <Empty
      icon={Puzzle}
      title="Couldn't list the modules"
      body={modules.error.message}
      className="md:border-0"
    />
  ) : !modules.data ? (
    <div className="flex flex-col gap-2 p-4">
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
    </div>
  ) : items.length === 0 ? (
    <Empty
      icon={Puzzle}
      title="No module matches"
      body="Try another word, or look in All."
      className="md:border-0"
    />
  ) : (
    <ModuleList
      items={items}
      grouped={grouped}
      withPopular={grouped ? popularOf(all) : undefined}
      onPick={pick}
      selected={selected}
    />
  )

  if (phone) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        full
        header={
          <div className="flex flex-col gap-3 px-4 pt-1 pb-3">
            <p className="px-2 text-subheading font-medium">{title}</p>
            {search}
            {chips}
          </div>
        }
      >
        <div className="border-t border-border">{list}</div>
      </BottomSheet>
    )
  }
  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogContent className="flex h-[min(85vh,760px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="gap-3 border-b border-border px-6 pt-5 pb-4">
          <div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Pick the module that does the job; its options come next.
            </DialogDescription>
          </div>
          {search}
          {chips}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">{list}</div>
      </DialogContent>
    </Dialog>
  )
}
