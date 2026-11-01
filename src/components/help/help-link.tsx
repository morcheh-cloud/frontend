import { CircleHelp } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { guideForPath } from "./guides"

// Desktop, in the panel header: the guide for the current page, or the help
// index when the page has none. Hidden inside help itself.
export function ContextHelp({ pathname }: { pathname: string }) {
  if (!pathname || pathname === "/help" || pathname.startsWith("/help/")) {
    return null
  }
  const match = guideForPath(pathname)
  return (
    <Link
      href={match?.href ?? "/help"}
      title={match ? `How ${match.guide.title} works` : "Guides for every page"}
      className={buttonVariants({
        variant: "ghost",
        size: "sm",
        className: "ms-auto text-muted-foreground",
      })}
    >
      <CircleHelp />
      {match ? "Guide" : "Help"}
    </Link>
  )
}

// Phone: a 44px icon button for app bars and page headers.
export function HelpButton({
  href,
  label = "Guide",
  className,
}: {
  href: string
  label?: string
  className?: string
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none active:bg-muted",
        className,
      )}
    >
      <CircleHelp className="size-5" />
    </Link>
  )
}
