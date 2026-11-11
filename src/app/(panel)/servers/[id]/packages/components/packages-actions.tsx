"use client"

import {
  ArrowUpCircle,
  BadgeCheck,
  Eraser,
  Info,
  Link2,
  Lock,
  LockOpen,
  RotateCcw,
  Trash2,
} from "lucide-react"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { useJobActions } from "@/components/jobs/jobs-provider"
import { useOpen } from "@/hooks/useOpen"
import type {
  InstalledPackage,
  Job,
  PackageActionBody,
  PackageMarkBody,
  PackagesOverview,
} from "@/lib/services"
import { afterClose, type Item } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import {
  useActivePackageJob,
  useAutoUpdates,
  useMarkPackages,
  useRefreshLists,
} from "../api"
import { InstallLayer } from "./install-layer"
import { type DetailsTab, PackageDetails } from "./package-details"
import { ReviewDialog } from "./review-dialog"

type PackagesActions = {
  overview: PackagesOverview
  // Root or sudo without a password, and Engineer here.
  canChange: boolean
  // Operator: re-download the package lists.
  canRefresh: boolean
  // A package job is running on this server: other changes wait.
  job: Job | undefined
  locked: boolean
  details: (name: string, tab?: DetailsTab) => void
  install: () => void
  review: (body: PackageActionBody) => void
  mark: (
    names: string[],
    mark: PackageMarkBody["mark"],
    done?: () => void,
  ) => void
  marking: boolean
  setAutoUpdates: (on: boolean) => void
  autoPending: boolean
  refreshLists: () => void
  refreshing: boolean
}

const Ctx = createContext<PackagesActions | null>(null)

export function usePackagesActions() {
  const ctx = useContext(Ctx)
  if (!ctx)
    throw new Error("usePackagesActions outside PackagesActionsProvider")
  return ctx
}

const markDone: Record<PackageMarkBody["mark"], string> = {
  hold: "held at its version",
  unhold: "no longer held",
  auto: "marked as a dependency",
  manual: "marked as installed by hand",
}

export function PackagesActionsProvider({
  overview,
  children,
}: {
  overview: PackagesOverview
  children: ReactNode
}) {
  const { server, can } = useServerPage()
  const jobs = useJobActions()
  const job = useActivePackageJob(server.id)
  const markM = useMarkPackages(server.id)
  const autoM = useAutoUpdates(server.id)
  const refreshM = useRefreshLists(server.id)

  const [detailsOpen, setDetailsOpen] = useOpen("packages-details")
  const [installOpen, setInstallOpen] = useOpen("packages-install")
  const [reviewOpen, setReviewOpen] = useOpen("packages-review")
  const [shown, setShown] = useState<{ name: string; tab: DetailsTab } | null>(
    null,
  )
  const [body, setBody] = useState<PackageActionBody | null>(null)
  // Fresh state for every opening (prefills, a new preview).
  const [round, setRound] = useState(0)

  const canChange = overview.access !== "user" && can("engineer")

  function review(b: PackageActionBody) {
    setBody(b)
    setRound((r) => r + 1)
    if (detailsOpen) afterClose(setDetailsOpen, () => setReviewOpen(true))
    else setReviewOpen(true)
  }

  const value: PackagesActions = {
    overview,
    canChange,
    canRefresh: overview.access !== "user" && can("operator"),
    job,
    locked: !!job,
    details: (name, tab = "overview") => {
      setShown({ name, tab })
      setRound((r) => r + 1)
      setDetailsOpen(true)
    },
    install: () => {
      setRound((r) => r + 1)
      setInstallOpen(true)
    },
    review,
    mark: (names, mark, done) =>
      markM.mutate(
        { names, mark },
        {
          onSuccess: () => {
            toast.success(
              names.length === 1
                ? `${names[0]} ${markDone[mark]}`
                : `${names.length} packages ${markDone[mark]}`,
            )
            done?.()
          },
          onError: (e) => toast.error(e.message),
        },
      ),
    marking: markM.isPending,
    setAutoUpdates: (on) =>
      autoM.mutate(on, {
        onSuccess: () =>
          toast.success(
            on ? "Automatic updates turned on" : "Automatic updates turned off",
          ),
        onError: (e) => toast.error(e.message),
      }),
    autoPending: autoM.isPending,
    refreshLists: () =>
      refreshM.mutate(undefined, {
        onSuccess: (j) => jobs.track(j),
        onError: (e) => toast.error(e.message),
      }),
    refreshing: refreshM.isPending,
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      {shown && (
        <PackageDetails
          key={`d${round}`}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          name={shown.name}
          tab={shown.tab}
        />
      )}
      <InstallLayer
        key={`i${round}`}
        open={installOpen}
        onOpenChange={setInstallOpen}
        onReview={(names) =>
          afterClose(setInstallOpen, () => {
            setBody({ action: "install", names })
            setRound((r) => r + 1)
            setReviewOpen(true)
          })
        }
      />
      {body && (
        <ReviewDialog
          key={`r${round}`}
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          body={body}
          onChange={setBody}
        />
      )}
    </Ctx.Provider>
  )
}

// What can be done to one installed package, in groups: the main change,
// details, marks, then removal.
export function usePackageMenu(p: InstalledPackage): Item[][] {
  const a = usePackagesActions()
  const caps = a.overview.capabilities
  const off = !a.canChange || a.locked
  const names = [p.name]

  if (p.state === "config-files") {
    return [
      [
        {
          key: "details",
          label: "Details",
          icon: <Info />,
          onSelect: () => a.details(p.name),
        },
      ],
      a.canChange
        ? [
            {
              key: "purge",
              label: "Remove leftover settings",
              icon: <Eraser />,
              destructive: true,
              disabled: off,
              onSelect: () => a.review({ action: "purge", names }),
            },
          ]
        : [],
    ]
  }

  const main: Item[] = []
  if (p.latest && a.canChange) {
    main.push({
      key: "upgrade",
      label: `Upgrade to ${p.latest}`,
      icon: <ArrowUpCircle />,
      disabled: off || p.held,
      onSelect: () => a.review({ action: "upgrade", names }),
    })
  }
  main.push({
    key: "details",
    label: "Details",
    icon: <Info />,
    onSelect: () => a.details(p.name),
  })

  const marks: Item[] = []
  if (a.canChange && caps.hold) {
    marks.push(
      p.held
        ? {
            key: "unhold",
            label: "Let it upgrade",
            icon: <LockOpen />,
            disabled: a.marking,
            onSelect: () => a.mark(names, "unhold"),
          }
        : {
            key: "hold",
            label: "Hold at this version",
            icon: <Lock />,
            disabled: a.marking,
            onSelect: () => a.mark(names, "hold"),
          },
    )
  }
  if (a.canChange && caps.mark && p.state === "installed") {
    marks.push(
      p.auto
        ? {
            key: "manual",
            label: "Keep it (installed by hand)",
            icon: <BadgeCheck />,
            disabled: a.marking,
            onSelect: () => a.mark(names, "manual"),
          }
        : {
            key: "auto",
            label: "Mark as a dependency",
            icon: <Link2 />,
            disabled: a.marking,
            onSelect: () => a.mark(names, "auto"),
          },
    )
  }

  const remove: Item[] = []
  if (a.canChange) {
    if (caps.reinstall) {
      remove.push({
        key: "reinstall",
        label: "Reinstall",
        icon: <RotateCcw />,
        disabled: off,
        onSelect: () => a.review({ action: "reinstall", names }),
      })
    }
    remove.push({
      key: "remove",
      label: "Remove",
      icon: <Trash2 />,
      destructive: true,
      disabled: off,
      onSelect: () => a.review({ action: "remove", names }),
    })
    if (caps.purge) {
      remove.push({
        key: "purge",
        label: "Remove with its settings",
        icon: <Eraser />,
        destructive: true,
        disabled: off,
        onSelect: () => a.review({ action: "purge", names }),
      })
    }
  }
  return [main, marks, remove]
}
