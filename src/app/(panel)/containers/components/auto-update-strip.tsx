"use client"

import { RefreshCcwDot } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { useServerAutoUpdate } from "../api"
import { autoUpdateHref, newAutoUpdateHref } from "./auto-update-meta"
import { useDockerWorkspaceCan } from "./permissions"

// One line on a server's Updates page: which of its containers update by
// themselves (and by which policies), or a way to set that up.
export function AutoUpdateStrip({
  server,
  workspace,
  total,
  phone,
}: {
  server: string
  workspace: string
  total: number
  phone: boolean
}) {
  const query = useServerAutoUpdate(server)
  const can = useDockerWorkspaceCan(workspace)
  if (!query.data) return null
  const { containers, policies } = query.data
  const updating = containers.filter((c) => !c.monitor).length
  const watching = containers.length - updating
  const on = policies.filter((p) => p.enabled)

  let text: React.ReactNode
  if (on.length === 0) {
    if (!can.edit) return null
    text = (
      <>
        No container here updates by itself.{" "}
        <Link
          href={newAutoUpdateHref({ server })}
          className="font-medium text-brand hover:underline"
        >
          Set up auto-update
        </Link>
      </>
    )
  } else {
    const parts = [
      updating > 0 &&
        `${updating} of ${total} container${total === 1 ? "" : "s"} update by themselves`,
      watching > 0 && `${watching} only reported`,
    ].filter(Boolean)
    text = (
      <>
        {parts.length > 0
          ? parts.join(", ")
          : "No container matches its policies yet"}
        {" · "}
        {on.map((p, i) => (
          <span key={p.id}>
            {i > 0 && ", "}
            <Link
              href={autoUpdateHref(p.id)}
              className="font-medium text-brand hover:underline"
            >
              {p.name}
            </Link>
          </span>
        ))}
      </>
    )
  }
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-body-sm text-muted-foreground",
        phone ? "px-4 pt-3" : "mt-3",
      )}
    >
      <RefreshCcwDot className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">{text}</span>
    </p>
  )
}
