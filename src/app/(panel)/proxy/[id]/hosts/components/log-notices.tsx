"use client"

import { FileClock, Info, RefreshCw } from "lucide-react"
import type { ReactNode } from "react"

import { Callout } from "@/app/(panel)/cronjobs/components/editor-parts"
import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { Button } from "@/components/ui/button"

// What the Report and Logs tabs say about the log itself.

// Lines written before the detailed log format have no response time,
// domain or cache state; saving the site switches nginx over.
export function OldFormatNotice({
  rewrite,
  rewriting,
}: {
  // Writes the site's config again, as it is (Engineer only).
  rewrite?: () => void
  rewriting?: boolean
}) {
  return (
    <Callout icon={<Info />}>
      <p>
        Response times, domains and cache hits aren't in the log yet: nginx
        writes them from the next time this site is saved.
      </p>
      {rewrite && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2 max-md:h-11"
          disabled={rewriting}
          onClick={rewrite}
        >
          <RefreshCw className={rewriting ? "animate-spin" : undefined} />
          {rewriting ? "Writing…" : "Write the site again"}
        </Button>
      )}
    </Callout>
  )
}

export function NoLog({
  stream,
  action,
}: {
  stream: boolean
  action?: ReactNode
}) {
  return (
    <Empty
      icon={FileClock}
      title="No log yet"
      body={`nginx starts this ${stream ? "stream's" : "site's"} log with its first ${stream ? "connection" : "visit"}. Check that it's turned on and its ${stream ? "port is open" : "domains point to the proxy"}.`}
      action={action}
    />
  )
}

// "Nov 8, 14:05" (with the year only when it isn't this one).
export function shortDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("en", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
}
