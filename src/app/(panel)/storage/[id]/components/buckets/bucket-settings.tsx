"use client"

import { Loader2, RotateCw } from "lucide-react"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { BucketIcon } from "@/components/files/meta"
import type { BucketTab } from "@/components/files/source"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { BucketDetails, Storage } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useBucket } from "../../../api"
import type { BucketCan } from "./parts"
import { CorsSection, LifecycleSection } from "./rules"
import {
  AccessSection,
  accessLabel,
  OverviewSection,
  SecuritySection,
} from "./sections"

const tabs: { value: BucketTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "access", label: "Access" },
  { value: "lifecycle", label: "Lifecycle" },
  { value: "cors", label: "CORS" },
  { value: "security", label: "Security" },
]

// Everything about one S3 bucket: a side sheet on desktop, a full bottom
// sheet on phones.
export function BucketSettingsLayer({
  storage,
  bucket,
  tab,
  onTab,
  open,
  onOpenChange,
  phone,
  can,
  onEmpty,
  onDelete,
}: {
  storage: Storage
  bucket: string
  tab: BucketTab
  onTab: (tab: BucketTab) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  phone: boolean
  can: BucketCan
  onEmpty?: () => void
  onDelete?: () => void
}) {
  const query = useBucket(storage.id, open ? bucket : null)
  const b = query.data
  const props = b && { storage, bucket: b, can }

  const body = query.isError ? (
    <div className="flex flex-col items-start gap-3 py-6 text-body-sm">
      <p className="text-muted-foreground">
        Couldn't load this bucket: {query.error.message}
      </p>
      <Button variant="outline" onClick={() => query.refetch()}>
        <RotateCw />
        Try again
      </Button>
    </div>
  ) : !props ? (
    <div className="flex items-center gap-2 py-10 text-body-sm text-ash">
      <Loader2 className="size-4 animate-spin" />
      Reading the bucket's settings…
    </div>
  ) : tab === "overview" ? (
    <OverviewSection {...props} onEmpty={onEmpty} onDelete={onDelete} />
  ) : tab === "access" ? (
    <AccessSection {...props} />
  ) : tab === "lifecycle" ? (
    <LifecycleSection {...props} />
  ) : tab === "cors" ? (
    <CorsSection {...props} />
  ) : (
    <SecuritySection {...props} />
  )

  const tabBar = (
    <Segmented
      label="Bucket settings"
      items={tabs}
      value={tab}
      onChange={onTab}
    />
  )
  const summary = b && <Summary bucket={b} />

  if (phone) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={bucket}
        header={
          <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 pb-3">
            <div className="flex items-center gap-3 px-2">
              <BucketIcon className="size-6" />
              <div className="min-w-0">
                <p className="truncate text-subheading font-medium">{bucket}</p>
                {summary}
              </div>
            </div>
            <div className="-mx-4 flex [scrollbar-width:none] overflow-x-auto px-4">
              {tabBar}
            </div>
          </div>
        }
        className="pt-4"
      >
        {body}
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="gap-2 border-b border-border px-6 py-4">
          <SheetTitle className="flex items-center gap-2 text-body">
            <BucketIcon className="size-5" />
            <span className="truncate">{bucket}</span>
          </SheetTitle>
          <SheetDescription render={<div />}>
            {summary ?? "S3 bucket"}
          </SheetDescription>
          <div className="mt-2">{tabBar}</div>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{body}</div>
      </SheetContent>
    </Sheet>
  )
}

function Summary({ bucket: b }: { bucket: BucketDetails }) {
  const bits = [
    "S3 bucket",
    b.region,
    accessLabel[b.access],
    b.versioning === "enabled" && "Versioned",
    b.object_lock && "Object lock",
  ].filter(Boolean)
  return (
    <p
      className={cn(
        "truncate text-caption text-muted-foreground",
        b.public_write && "text-destructive",
      )}
    >
      {bits.join(" · ")}
    </p>
  )
}
