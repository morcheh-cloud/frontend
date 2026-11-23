"use client"

import { RefreshCw, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Empty, Loading } from "../../components/parts"
import { useServerPage } from "../../components/server-page"

export function RefreshButton({
  busy,
  onClick,
}: {
  busy: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="max-md:size-11 md:size-9"
      aria-label="Refresh"
      title="Refresh"
      disabled={busy}
      onClick={onClick}
    >
      <RefreshCw className={cn(busy && "animate-spin")} />
    </Button>
  )
}

// Loading or the error with Try again, for a query that has no data yet.
export function NotYet({
  error,
  what,
  retry,
}: {
  error: Error | null
  what: string
  retry: () => void
}) {
  const { phone } = useServerPage()
  if (!error) return <Loading phone={phone} />
  return (
    <Empty
      icon={TriangleAlert}
      title={`Couldn't read ${what}`}
      body={error.message}
      className="max-md:mt-4"
      action={
        <Button variant="outline" onClick={retry}>
          Try again
        </Button>
      }
    />
  )
}
